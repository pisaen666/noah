/**
 * =============================================================================
 * calendarHooks.js — High-Level Hooks / Functions for UI Consumption
 * =============================================================================
 * This module provides a clean, single-import surface for the UI layer.
 * It combines auth + calendar API calls into composable async functions
 * that mirror the React Hook pattern (useCalendarData) but work in
 * vanilla JavaScript.
 *
 * Usage example:
 *   import { useCalendarData, completeDailyMission } from './calendarHooks.js';
 *
 *   const { event, words, isCompleted, error } = await useCalendarData();
 *   if (!error && event) {
 *     await completeDailyMission(event.id, event.description);
 *   }
 * =============================================================================
 */

import { isSignedIn, signIn } from './auth.js';
import {
  fetchTodaysMission,
  parseVocabulary,
  isMissionCompleted,
  fetchMissionHistory,
  completeDailyMission,
} from './calendarApi.js';
import {
  calculateWeeklyRewards,
  getCachedRewardsData,
  getParentRewardConfig,
  saveParentRewardConfig,
  setCachedRewardsData,
} from './rewards.js';

// Re-export calendar API & rewards utilities directly as part of the clean API surface
export {
  completeDailyMission,
  fetchMissionHistory,
  calculateWeeklyRewards,
  getParentRewardConfig,
  saveParentRewardConfig,
  getCachedRewardsData,
  setCachedRewardsData,
};


// ---------------------------------------------------------------------------
// CalendarData Result Type
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} CalendarData
 * @property {import('./calendarApi.js').CalendarEvent | null} event - Today's mission event (or null)
 * @property {import('./calendarApi.js').VocabWord[]} words - Parsed vocabulary array
 * @property {boolean} isCompleted - Whether the mission was already completed today
 * @property {boolean} isEmpty - True when parent has not created an event today (not an error)
 * @property {boolean} isOffline - True when the device is disconnected from internet
 * @property {boolean} isLoading - Whether the data is still being fetched
 * @property {string | null} error - Human-readable Thai error message, or null
 */

// ---------------------------------------------------------------------------
// useCalendarData() — Main data-fetching hook
// ---------------------------------------------------------------------------

/**
 * Fetches and parses today's mission from Google Calendar.
 *
 * Flow:
 *  1. Checks network connectivity
 *  2. Verifies the user is signed in
 *  3. Fetches today's events and finds the mission by keyword
 *  4. Distinguishes between Empty State (no event) vs Real Error
 *  5. Parses the vocabulary from the event description
 *  6. Returns a structured result object
 *
 * @returns {Promise<CalendarData>}
 */
export async function useCalendarData() {
  /** @type {CalendarData} */
  const result = {
    event: null,
    words: [],
    isCompleted: false,
    isEmpty: false,
    isOffline: !navigator.onLine,
    isLoading: true,
    error: null,
  };

  try {
    // Guard: Check offline status first
    if (!navigator.onLine) {
      result.error = 'อุปกรณ์อยู่ในโหมดออฟไลน์ กรุณาเชื่อมต่ออินเทอร์เน็ตเพื่อโหลดภารกิจ';
      result.isOffline = true;
      result.isLoading = false;
      return result;
    }

    // Guard: must be signed in
    if (!isSignedIn()) {
      result.error = 'กรุณาเข้าสู่ระบบด้วย Google ก่อน';
      result.isLoading = false;
      return result;
    }

    // Fetch today's mission event
    const event = await fetchTodaysMission();

    if (!event) {
      // Empty State (Parent hasn't scheduled today's mission yet)
      result.isEmpty = true;
      result.isLoading = false;
      return result;
    }

    result.event = event;
    result.isCompleted = isMissionCompleted(event);

    // Parse vocabulary from the event description
    const words = parseVocabulary(event.description || '');

    if (words.length === 0) {
      result.error =
        'พบกิจกรรมในปฏิทิน แต่ไม่พบคำศัพท์ในรายละเอียด\nกรุณาตรวจสอบรูปแบบ: "1. Apple - แอปเปิ้ล"';
      result.isLoading = false;
      return result;
    }

    result.words = words;
    result.isLoading = false;
    return result;

  } catch (err) {
    if (!navigator.onLine || err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
      result.isOffline = true;
      result.error = 'สัญญาณอินเทอร์เน็ตขาดหาย กรุณาตรวจสอบการเชื่อมต่อ Wi-Fi หรือ Cellular';
    } else {
      result.error = err.message || 'เกิดข้อผิดพลาดที่ไม่รู้จักในการเชื่อมต่อ Google Calendar';
    }
    result.isLoading = false;
    return result;
  }
}

// ---------------------------------------------------------------------------
// useAuthFlow() — Convenience: sign in then load data
// ---------------------------------------------------------------------------

/**
 * Combines signIn() + useCalendarData() into a single call.
 * Useful for the "Start Mission" button which should auth-gate and then
 * immediately load data.
 *
 * @returns {Promise<CalendarData>}
 */
export async function useAuthFlow() {
  try {
    await signIn();
    return await useCalendarData();
  } catch (err) {
    return {
      event: null,
      words: [],
      isCompleted: false,
      isLoading: false,
      error: err.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ',
    };
  }
}

// ---------------------------------------------------------------------------
// useWeeklyRewards() — History fetching & Weekly reward calculation hook
// ---------------------------------------------------------------------------

/**
 * Fetches 4-week calendar history and calculates weekly rewards & stats.
 * Uses cached data for instantaneous initial load or when offline.
 *
 * @param {boolean} [forceRefresh=false]
 * @returns {Promise<import('./rewards.js').RewardsCalculationResult & { isLoading: boolean, isOffline: boolean, error: string | null }>}
 */
export async function useWeeklyRewards(forceRefresh = false) {
  const cached = getCachedRewardsData();

  if (!navigator.onLine) {
    if (cached) {
      return {
        ...cached,
        isLoading: false,
        isOffline: true,
        error: null,
      };
    }
    const defaultData = calculateWeeklyRewards([], new Date());
    return {
      ...defaultData,
      isLoading: false,
      isOffline: true,
      error: 'ออฟไลน์: กำลังแสดงข้อมูลแบบออฟไลน์',
    };
  }

  if (!isSignedIn()) {
    if (cached) {
      return {
        ...cached,
        isLoading: false,
        isOffline: false,
        error: null,
      };
    }
    const defaultData = calculateWeeklyRewards([], new Date());
    return {
      ...defaultData,
      isLoading: false,
      isOffline: false,
      error: 'กรุณาเข้าสู่ระบบ Google เพื่อดูประวัติภารกิจ',
    };
  }

  try {
    const events = await fetchMissionHistory(4);
    const result = calculateWeeklyRewards(events, new Date());
    return {
      ...result,
      isLoading: false,
      isOffline: false,
      error: null,
    };
  } catch (err) {
    console.warn('[DWQ] Failed to fetch mission history from Calendar API:', err);
    if (cached) {
      return {
        ...cached,
        isLoading: false,
        isOffline: false,
        error: `ไม่สามารถซิงค์ข้อมูลล่าสุดได้ (${err.message})`,
      };
    }
    const fallback = calculateWeeklyRewards([], new Date());
    return {
      ...fallback,
      isLoading: false,
      isOffline: false,
      error: err.message,
    };
  }
}

