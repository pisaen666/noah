/**
 * =============================================================================
 * rewards.js — Weekly Reward System & Progress Tracking Engine
 * =============================================================================
 * Core business logic for:
 *  - Grouping calendar mission events into 4-week Monday–Sunday buckets
 *  - Evaluating weekly goals (7 completed missions in a week = 1 Golden Star / Badge)
 *  - Tracking total stars, completed missions count, and learning streaks
 *  - Managing parent's real-world custom reward configurations in localStorage
 *  - Providing cached state for instant rendering and offline support
 * =============================================================================
 */

import { CHILD_NAME, COMPLETION_COLOR_ID } from './config.js';

// ---------------------------------------------------------------------------
// LocalStorage Keys
// ---------------------------------------------------------------------------
export const STORAGE_KEYS = {
  PARENT_REWARD_TEXT: 'dwq_parent_reward_text',
  PARENT_TARGET_STARS: 'dwq_parent_target_stars',
  REWARDS_CACHE: 'dwq_rewards_cache',
  BONUS_STARS: 'dwq_bonus_stars', // Any manual parent bonus stars awarded
};

// Default Parent Reward Settings
export const DEFAULT_PARENT_CONFIG = {
  rewardText: 'พาไปกินไอศกรีมมื้อพิเศษ & ซื้อของเล่นที่อยากได้ 🍨🎁',
  targetStars: 4,
};

// Thai Day Names & Abbreviations (Monday = Index 0)
export const THAI_DAYS = [
  { full: 'จันทร์', short: 'จ.', english: 'Monday' },
  { full: 'อังคาร', short: 'อ.', english: 'Tuesday' },
  { full: 'พุธ', short: 'พ.', english: 'Wednesday' },
  { full: 'พฤหัสบดี', short: 'พฤ.', english: 'Thursday' },
  { full: 'ศุกร์', short: 'ศ.', english: 'Friday' },
  { full: 'เสาร์', short: 'ส.', english: 'Saturday' },
  { full: 'อาทิตย์', short: 'อา.', english: 'Sunday' },
];

export const THAI_MONTHS_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
];

// ---------------------------------------------------------------------------
// Date Utilities (Monday-start ISO Week)
// ---------------------------------------------------------------------------

/**
 * Formats a Date object to 'YYYY-MM-DD' in local timezone.
 * @param {Date} date
 * @returns {string}
 */
export function formatDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Formats a Date object to Thai short date format (e.g., '17 ส.ค.')
 * @param {Date} date
 * @returns {string}
 */
export function formatThaiShortDate(date) {
  const d = date.getDate();
  const m = THAI_MONTHS_SHORT[date.getMonth()];
  return `${d} ${m}`;
}

/**
 * Returns a new Date corresponding to the Monday of the week containing the given date.
 * Week starts on Monday (ISO-8601).
 * @param {Date} date
 * @returns {Date}
 */
export function getMondayOfWeek(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay(); // 0 is Sunday, 1 is Monday, ... 6 is Saturday
  const diff = day === 0 ? -6 : 1 - day; // If Sunday, go back 6 days; else go back to Monday
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Adds a number of days to a Date.
 * @param {Date} date
 * @param {number} days
 * @returns {Date}
 */
export function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Extracts the local 'YYYY-MM-DD' string from a Google Calendar event.
 * Handles both dateTime and date (all-day event) formats.
 * @param {object} event
 * @returns {string | null}
 */
export function getEventDateKey(event) {
  if (!event || !event.start) return null;
  if (event.start.date) {
    return event.start.date; // All-day: "2026-08-17"
  }
  if (event.start.dateTime) {
    const d = new Date(event.start.dateTime);
    return formatDateKey(d);
  }
  return null;
}

// ---------------------------------------------------------------------------
// Parent Reward Config (Storage & Retrieval)
// ---------------------------------------------------------------------------

/**
 * Retrieves the parent's custom reward settings from localStorage.
 * @returns {{ rewardText: string, targetStars: number }}
 */
export function getParentRewardConfig() {
  try {
    const rewardText = localStorage.getItem(STORAGE_KEYS.PARENT_REWARD_TEXT) || DEFAULT_PARENT_CONFIG.rewardText;
    const targetStarsRaw = localStorage.getItem(STORAGE_KEYS.PARENT_TARGET_STARS);
    const targetStars = targetStarsRaw ? parseInt(targetStarsRaw, 10) : DEFAULT_PARENT_CONFIG.targetStars;

    return {
      rewardText,
      targetStars: Number.isFinite(targetStars) && targetStars > 0 ? targetStars : DEFAULT_PARENT_CONFIG.targetStars,
    };
  } catch {
    return { ...DEFAULT_PARENT_CONFIG };
  }
}

/**
 * Saves updated parent custom reward settings to localStorage.
 * @param {object} config
 * @param {string} config.rewardText
 * @param {number} config.targetStars
 */
export function saveParentRewardConfig({ rewardText, targetStars }) {
  try {
    if (typeof rewardText === 'string' && rewardText.trim().length > 0) {
      localStorage.setItem(STORAGE_KEYS.PARENT_REWARD_TEXT, rewardText.trim());
    }
    if (Number.isFinite(targetStars) && targetStars > 0) {
      localStorage.setItem(STORAGE_KEYS.PARENT_TARGET_STARS, String(Math.floor(targetStars)));
    }
  } catch (err) {
    console.warn('[DWQ Rewards] Failed to save parent config to localStorage:', err);
  }
}

/**
 * Gets cached rewards calculation data from localStorage.
 * @returns {object | null}
 */
export function getCachedRewardsData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.REWARDS_CACHE);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Caches rewards calculation data in localStorage.
 * @param {object} data
 */
export function setCachedRewardsData(data) {
  try {
    localStorage.setItem(STORAGE_KEYS.REWARDS_CACHE, JSON.stringify({
      ...data,
      cachedAt: new Date().toISOString(),
    }));
  } catch (err) {
    console.warn('[DWQ Rewards] Failed to cache rewards data in localStorage:', err);
  }
}

// ---------------------------------------------------------------------------
// Reward & Weekly Progress Calculation Logic
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} DayProgress
 * @property {string} dateKey - 'YYYY-MM-DD'
 * @property {Date} date - Date object
 * @property {number} dayIndex - 0 (Mon) .. 6 (Sun)
 * @property {string} dayName - 'จันทร์'
 * @property {string} dayShort - 'จ.'
 * @property {string} formattedDate - '17 ส.ค.'
 * @property {boolean} isToday - Whether this day is today
 * @property {boolean} isPast - Whether this day is strictly in the past
 * @property {boolean} isFuture - Whether this day is strictly in the future
 * @property {boolean} isCompleted - Whether a completed mission was logged
 * @property {'completed' | 'today' | 'missed' | 'future' | 'no_mission'} status
 * @property {object | null} event - Google Calendar event object if present
 */

/**
 * @typedef {Object} WeekProgress
 * @property {number} weekIndex - 0 (current week), 1 (1 week ago), 2 (2 weeks ago), 3 (3 weeks ago)
 * @property {string} label - e.g., 'สัปดาห์นี้' or 'สัปดาห์ที่แล้ว'
 * @property {string} dateRangeLabel - e.g., '11 ส.ค. - 17 ส.ค.'
 * @property {Date} startDate - Monday Date
 * @property {Date} endDate - Sunday Date
 * @property {DayProgress[]} days - Array of 7 days (Mon-Sun)
 * @property {number} completedCount - Number of completed missions (0..7)
 * @property {number} totalDays - Always 7
 * @property {number} progressPercentage - Math.round((completedCount / 7) * 100)
 * @property {boolean} isWeekCompleted - True if completedCount >= 7
 * @property {number} starsEarned - 1 if isWeekCompleted, else 0
 * @property {boolean} isCurrentWeek - True for weekIndex === 0
 */

/**
 * @typedef {Object} RewardsCalculationResult
 * @property {WeekProgress[]} weeks - 4 weeks array, ordered latest first (or chronological)
 * @property {number} totalStars - Total Golden Stars earned across all weeks
 * @property {number} totalCompletedMissions - Total completed missions in the 4-week window
 * @property {number} currentStreak - Consecutive completed days leading up to today
 * @property {WeekProgress} currentWeek - Reference to the current week
 * @property {object} parentReward - { rewardText, targetStars, progressPercent, isUnlocked, remainingStars }
 * @property {string} calculatedAt - ISO timestamp
 */

/**
 * Evaluates the 4-week mission event history and calculates rewards, stars, and progress.
 *
 * @param {Array<object>} missionEvents - Raw mission events from Google Calendar API
 * @param {Date} [baseDate=new Date()] - Reference date (defaults to now)
 * @param {number} [weeksCount=4] - Number of weeks to evaluate
 * @returns {RewardsCalculationResult}
 */
export function calculateWeeklyRewards(missionEvents = [], baseDate = new Date(), weeksCount = 4) {
  const now = new Date(baseDate);
  const todayKey = formatDateKey(now);
  const currentMonday = getMondayOfWeek(now);

  // Map events by dateKey for fast lookup
  const eventsByDate = new Map();
  for (const event of missionEvents) {
    const key = getEventDateKey(event);
    if (key) {
      // Check if event is completed (Basil Green colorId '10' or description success marker)
      const isCompleted = event.colorId === COMPLETION_COLOR_ID ||
        (event.description || '').includes(`${CHILD_NAME}ทำภารกิจสำเร็จแล้ว`);

      // If multiple events on same day, prefer completed one
      const existing = eventsByDate.get(key);
      if (!existing || isCompleted) {
        eventsByDate.set(key, {
          event,
          isCompleted,
        });
      }
    }
  }

  const weeks = [];
  let totalStars = 0;
  let totalCompletedMissions = 0;

  // Build weeks array starting from 0 (current week) to (weeksCount - 1)
  for (let w = 0; w < weeksCount; w++) {
    const weekMonday = addDays(currentMonday, -7 * w);
    const weekSunday = addDays(weekMonday, 6);

    const days = [];
    let completedCount = 0;

    for (let d = 0; d < 7; d++) {
      const dayDate = addDays(weekMonday, d);
      const dateKey = formatDateKey(dayDate);
      const isToday = dateKey === todayKey;
      const isPast = dayDate < new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const isFuture = dayDate > new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const match = eventsByDate.get(dateKey);
      const isCompleted = Boolean(match?.isCompleted);
      const event = match?.event || null;

      if (isCompleted) {
        completedCount++;
        totalCompletedMissions++;
      }

      // Determine visual status
      let status = 'no_mission';
      if (isCompleted) {
        status = 'completed';
      } else if (isToday) {
        status = 'today';
      } else if (isPast) {
        status = 'missed';
      } else if (isFuture) {
        status = 'future';
      }

      days.push({
        dateKey,
        date: dayDate,
        dayIndex: d,
        dayName: THAI_DAYS[d].full,
        dayShort: THAI_DAYS[d].short,
        formattedDate: formatThaiShortDate(dayDate),
        isToday,
        isPast,
        isFuture,
        isCompleted,
        status,
        event,
      });
    }

    // Weekly Goal rule: 7 completed missions in Monday-Sunday = 1 Golden Star / Badge
    const isWeekCompleted = completedCount >= 7;
    const starsEarned = isWeekCompleted ? 1 : 0;
    totalStars += starsEarned;

    let weekLabel = `สัปดาห์ที่ ${weeksCount - w}`;
    if (w === 0) weekLabel = 'สัปดาห์นี้';
    else if (w === 1) weekLabel = 'สัปดาห์ที่แล้ว';

    const dateRangeLabel = `${formatThaiShortDate(weekMonday)} - ${formatThaiShortDate(weekSunday)}`;

    weeks.push({
      weekIndex: w,
      label: weekLabel,
      dateRangeLabel,
      startDate: weekMonday,
      endDate: weekSunday,
      days,
      completedCount,
      totalDays: 7,
      progressPercentage: Math.min(100, Math.round((completedCount / 7) * 100)),
      isWeekCompleted,
      starsEarned,
      isCurrentWeek: w === 0,
    });
  }

  // Calculate current learning streak (consecutive days of completed missions)
  let currentStreak = 0;
  let checkDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // If today is not completed yet, start checking from yesterday so active streak is not lost
  const todayDone = eventsByDate.get(todayKey)?.isCompleted;
  if (!todayDone) {
    checkDate = addDays(checkDate, -1);
  }

  // Check up to 35 days back
  for (let i = 0; i < 35; i++) {
    const key = formatDateKey(checkDate);
    const done = eventsByDate.get(key)?.isCompleted;
    if (done) {
      currentStreak++;
      checkDate = addDays(checkDate, -1);
    } else {
      break;
    }
  }
  if (todayDone) {
    currentStreak = Math.max(1, currentStreak);
  }

  // Parent Custom Reward Goal metrics
  const parentConfig = getParentRewardConfig();
  const targetStars = parentConfig.targetStars;
  const progressPercent = Math.min(100, Math.round((totalStars / targetStars) * 100));
  const isUnlocked = totalStars >= targetStars;
  const remainingStars = Math.max(0, targetStars - totalStars);

  const parentReward = {
    rewardText: parentConfig.rewardText,
    targetStars,
    progressPercent,
    isUnlocked,
    remainingStars,
  };

  const result = {
    weeks,
    totalStars,
    totalCompletedMissions,
    currentStreak,
    currentWeek: weeks[0],
    parentReward,
    calculatedAt: new Date().toISOString(),
  };

  // Cache latest calculation
  setCachedRewardsData(result);

  return result;
}
