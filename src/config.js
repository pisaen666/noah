/**
 * =============================================================================
 * config.js — Daily Word Quest: Central Configuration
 * =============================================================================
 * This is the ONLY file you need to edit after setting up Google Cloud Console.
 * Replace YOUR_GOOGLE_CLIENT_ID_HERE with your actual OAuth 2.0 Client ID.
 * See README.md for step-by-step instructions.
 * =============================================================================
 */

// ---------------------------------------------------------------------------
// 🔑 Google OAuth 2.0 — Replace this with your Client ID from Google Cloud Console
// ---------------------------------------------------------------------------
export const GOOGLE_CLIENT_ID = '747488329883-kgmgc95486n1fjncf35u77lmsjseq04f.apps.googleusercontent.com';

// ---------------------------------------------------------------------------
// 📅 Google Calendar API Scope
// ---------------------------------------------------------------------------
export const CALENDAR_SCOPES = 'https://www.googleapis.com/auth/calendar.events';

// ---------------------------------------------------------------------------
// 🔍 Mission Detection — The keyword to search for in event titles
// The app will find today's Calendar event whose title CONTAINS this string.
// ---------------------------------------------------------------------------
export const MISSION_KEYWORD = 'คำศัพท์วันนี้';

// ---------------------------------------------------------------------------
// 👦 Child Name — Used in the mission completion message
// ---------------------------------------------------------------------------
export const CHILD_NAME = 'โนอาห์';

// ---------------------------------------------------------------------------
// 🎨 Google Calendar Color ID for "Completed" state
// 10 = Basil Green — signals the parent that the mission is done.
// ---------------------------------------------------------------------------
export const COMPLETION_COLOR_ID = '10';

// ---------------------------------------------------------------------------
// 🌐 Google Calendar REST API Base URL
// ---------------------------------------------------------------------------
export const CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3';

// ---------------------------------------------------------------------------
// 📝 Vocabulary line format regex
// Matches lines like: "1. Apple - แอปเปิ้ล"
// ---------------------------------------------------------------------------
export const VOCAB_LINE_REGEX = /^\s*(\d+)\.\s*(.+?)\s*-\s*(.+?)\s*$/gm;

// ---------------------------------------------------------------------------
// ✅ Completion message appended to event description
// ---------------------------------------------------------------------------
export const COMPLETION_MESSAGE = `\n\n🎉 ${CHILD_NAME}ทำภารกิจสำเร็จแล้ว!`;
