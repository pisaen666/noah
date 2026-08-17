/**
 * =============================================================================
 * calendarApi.js — Google Calendar REST API: Fetch, Parse, and Update
 * =============================================================================
 * All functions communicate with the Google Calendar v3 REST API using the
 * Bearer token from auth.js. No backend or proxy required.
 * =============================================================================
 */

import {
  CALENDAR_API_BASE,
  MISSION_KEYWORD,
  VOCAB_LINE_REGEX,
  COMPLETION_COLOR_ID,
  COMPLETION_MESSAGE,
  CHILD_NAME,
} from './config.js';
import { getAccessToken } from './auth.js';

// ---------------------------------------------------------------------------
// Internal helper: authenticated fetch
// ---------------------------------------------------------------------------

/**
 * Wrapper around fetch() that injects the Authorization header.
 * Throws a descriptive error if the response is not OK.
 * @param {string} url
 * @param {RequestInit} [options]
 * @returns {Promise<any>} Parsed JSON response
 */
async function apiFetch(url, options = {}) {
  const token = getAccessToken();
  if (!token) {
    throw new Error('ยังไม่ได้เข้าสู่ระบบ กรุณาล็อกอินก่อน');
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    let errorDetail = `HTTP ${response.status}`;
    try {
      const errBody = await response.json();
      errorDetail = errBody?.error?.message || errorDetail;
    } catch {
      // ignore JSON parse failure on error body
    }
    throw new Error(`Google Calendar API Error: ${errorDetail}`);
  }

  return response.json();
}

// ---------------------------------------------------------------------------
// READ — Fetch today's mission event
// ---------------------------------------------------------------------------

/**
 * Fetches all events from the user's primary Google Calendar for today (local time)
 * and returns the first event whose title contains MISSION_KEYWORD.
 *
 * @returns {Promise<CalendarEvent | null>} The mission event, or null if not found.
 *
 * @typedef {Object} CalendarEvent
 * @property {string} id - The event's unique ID (needed for PATCH)
 * @property {string} summary - The event title
 * @property {string} description - The event description (contains vocabulary)
 * @property {string} [colorId] - Current color ID
 * @property {Object} start - Start time object
 * @property {Object} end - End time object
 */
export async function fetchTodaysMission() {
  // Build today's time window in ISO 8601 format (local timezone)
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  const params = new URLSearchParams({
    calendarId: 'primary',
    timeMin: startOfDay.toISOString(),
    timeMax: endOfDay.toISOString(),
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '50',
  });

  const url = `${CALENDAR_API_BASE}/calendars/primary/events?${params}`;
  const data = await apiFetch(url);

  const events = data.items || [];

  // Find the mission event by keyword in the title (supports 'คำศัพท์วันนี้' and legacy 'เควสต์ 15 คำศัพท์')
  const missionEvent = events.find(
    (event) => event.summary && (
      event.summary.includes(MISSION_KEYWORD) ||
      event.summary.includes('คำศัพท์วันนี้') ||
      event.summary.includes('เควสต์ 15 คำศัพท์')
    )
  );

  return missionEvent || null;
}

// ---------------------------------------------------------------------------
// PARSE — Extract vocabulary from event description
// ---------------------------------------------------------------------------

/**
 * Parses vocabulary words from a Google Calendar event description.
 *
 * Expected line format: "1. Apple - แอปเปิ้ล"
 * Lines that do not match the format are silently skipped.
 *
 * @param {string} description - Raw event description text
 * @returns {VocabWord[]} Structured array of vocabulary words
 *
 * @typedef {Object} VocabWord
 * @property {number} index - Word number (1-based)
 * @property {string} english - English word/phrase
 * @property {string} thai - Thai translation
 */
export function parseVocabulary(description) {
  if (!description || typeof description !== 'string') {
    return [];
  }

  const words = [];
  // Reset regex lastIndex before each use (global flag)
  const regex = new RegExp(VOCAB_LINE_REGEX.source, VOCAB_LINE_REGEX.flags);
  let match;

  while ((match = regex.exec(description)) !== null) {
    const [, indexStr, english, thai] = match;
    words.push({
      index: parseInt(indexStr, 10),
      english: english.trim(),
      thai: thai.trim(),
    });
  }

  // Sort by index in case lines are out of order
  words.sort((a, b) => a.index - b.index);

  return words;
}

// ---------------------------------------------------------------------------
// WRITE — Mark mission as completed
// ---------------------------------------------------------------------------

/**
 * Marks a Google Calendar event as completed by:
 * 1. Setting colorId to COMPLETION_COLOR_ID (Basil Green = '10')
 * 2. Appending a Thai success message to the event's description
 *
 * This uses PATCH (partial update) — only the specified fields are modified.
 *
 * @param {string} eventId - The Google Calendar event ID
 * @param {string} currentDescription - The current event description (to append to)
 * @returns {Promise<CalendarEvent>} The updated event object from the API
 */
export async function completeDailyMission(eventId, currentDescription = '') {
  if (!eventId) {
    throw new Error('ไม่พบ Event ID กรุณาตรวจสอบว่าโหลดภารกิจสำเร็จ');
  }

  // Avoid appending the message if it's already there (idempotent)
  const successText = `🎉 ${CHILD_NAME}ทำภารกิจสำเร็จแล้ว!`;
  const alreadyCompleted = currentDescription.includes(successText);

  const updatedDescription = alreadyCompleted
    ? currentDescription
    : currentDescription + COMPLETION_MESSAGE;

  const url = `${CALENDAR_API_BASE}/calendars/primary/events/${encodeURIComponent(eventId)}`;

  const updatedEvent = await apiFetch(url, {
    method: 'PATCH',
    body: JSON.stringify({
      colorId: COMPLETION_COLOR_ID,
      description: updatedDescription,
    }),
  });

  return updatedEvent;
}

// ---------------------------------------------------------------------------
// UTILITY — Check if today's mission is already completed
// ---------------------------------------------------------------------------

/**
 * Returns true if the given event has already been marked as completed.
 * Checks both the colorId and the presence of the success message.
 * @param {CalendarEvent} event
 * @returns {boolean}
 */
export function isMissionCompleted(event) {
  if (!event) return false;
  const hasColor = event.colorId === COMPLETION_COLOR_ID;
  const hasMessage = (event.description || '').includes(`${CHILD_NAME}ทำภารกิจสำเร็จแล้ว`);
  return hasColor || hasMessage;
}

// ---------------------------------------------------------------------------
// HISTORY — Fetch past weeks' mission events for rewards & progress
// ---------------------------------------------------------------------------

/**
 * Fetches event history from the user's primary Google Calendar for the past N weeks.
 * Computes time window from (N-1) weeks before current Monday 00:00:00 to current week Sunday 23:59:59.
 * Filters for daily vocabulary missions matching MISSION_KEYWORD.
 *
 * @param {number} [weeks=4] - Number of weeks to fetch
 * @returns {Promise<CalendarEvent[]>} Array of mission events in the window
 */
export async function fetchMissionHistory(weeks = 4) {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const currentMonday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday, 0, 0, 0);

  // Start date: Monday of (weeks - 1) weeks ago
  const startDate = new Date(currentMonday);
  startDate.setDate(startDate.getDate() - 7 * (weeks - 1));
  startDate.setHours(0, 0, 0, 0);

  // End date: Sunday of current week
  const endDate = new Date(currentMonday);
  endDate.setDate(endDate.getDate() + 6);
  endDate.setHours(23, 59, 59, 999);

  const params = new URLSearchParams({
    calendarId: 'primary',
    timeMin: startDate.toISOString(),
    timeMax: endDate.toISOString(),
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '250',
  });

  const url = `${CALENDAR_API_BASE}/calendars/primary/events?${params}`;
  const data = await apiFetch(url);

  const events = data.items || [];

  // Filter only mission events matching keyword (supports 'คำศัพท์วันนี้' and legacy 'เควสต์ 15 คำศัพท์')
  const missionEvents = events.filter(
    (event) => event.summary && (
      event.summary.includes(MISSION_KEYWORD) ||
      event.summary.includes('คำศัพท์วันนี้') ||
      event.summary.includes('เควสต์ 15 คำศัพท์')
    )
  );

  return missionEvents;
}

