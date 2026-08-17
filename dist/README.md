# 🎮 Daily Word Quest — Setup Guide

Complete instructions to connect this app to **Google Calendar API** using OAuth 2.0.

---

## Prerequisites

- A **Google Account** (the parent's account — this is the one that owns the Google Calendar with the daily missions)
- A modern web browser (Chrome, Edge, Firefox, Safari)
- A local web server to serve the files (instructions below)

---

## Step 1: Create a Google Cloud Project

1. Go to [https://console.cloud.google.com/](https://console.cloud.google.com/)
2. Click the **project selector** at the top (next to "Google Cloud")
3. Click **"New Project"**
4. Enter a name, e.g. `Daily Word Quest`
5. Click **"Create"** and wait for it to be ready
6. Make sure your new project is **selected** in the top bar

---

## Step 2: Enable the Google Calendar API

1. In the left sidebar, go to **"APIs & Services" → "Library"**
2. Search for **`Google Calendar API`**
3. Click on it, then click **"Enable"**

---

## Step 3: Configure the OAuth Consent Screen

> This step is required before you can create credentials.

1. Go to **"APIs & Services" → "OAuth consent screen"**
2. Select **"External"** as the User Type, then click **"Create"**
3. Fill in the required fields:
   - **App name:** `Daily Word Quest`
   - **User support email:** your Gmail address
   - **Developer contact email:** your Gmail address
4. Click **"Save and Continue"**
5. On the **Scopes** page, click **"Add or Remove Scopes"**
6. In the filter box, search for `calendar.events`
7. Check the box for: **`https://www.googleapis.com/auth/calendar.events`**
8. Click **"Update"** then **"Save and Continue"**
9. On the **Test users** page, click **"+ Add Users"**
10. Add your **parent Google Account email** (the one that has the Calendar events)
11. Click **"Save and Continue"** then **"Back to Dashboard"**

> **Why "External" + Test Users?** This keeps the app in "Testing" mode, which is
> perfectly fine for personal/family use. You don't need to go through Google's
> full verification process.

---

## Step 4: Create OAuth 2.0 Credentials (Client ID)

1. Go to **"APIs & Services" → "Credentials"**
2. Click **"+ Create Credentials"** then **"OAuth client ID"**
3. For **Application type**, select **"Web application"**
4. Enter a name, e.g. `Daily Word Quest Web Client`
5. Under **"Authorized JavaScript origins"**, add your local server URL:

   | If you use... | Add this origin |
   |---|---|
   | VS Code Live Server (default) | `http://127.0.0.1:5500` |
   | `npx serve` | `http://localhost:3000` |
   | `python -m http.server` | `http://localhost:8000` |
   | A custom port | `http://localhost:YOUR_PORT` |

   **Do NOT add a trailing slash.** It must be exactly `http://localhost:8000`, not `http://localhost:8000/`

6. Leave **"Authorized redirect URIs"** empty (not needed for GIS token flow)
7. Click **"Create"**
8. A popup appears showing your **Client ID** and Client Secret
9. **Copy the Client ID** (it looks like `123456789-abc123.apps.googleusercontent.com`)

> **The Client Secret is NOT needed** for this app. Browser-based OAuth 2.0 using
> Google Identity Services only uses the Client ID. Never put a Client Secret in
> frontend code.

---

## Step 5: Add the Client ID to the App

Open the file `src/config.js` in your editor and replace the placeholder:

```js
// BEFORE
export const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID_HERE';

// AFTER (example - use your actual Client ID)
export const GOOGLE_CLIENT_ID = '123456789-abc123def456.apps.googleusercontent.com';
```

Save the file.

---

## Step 6: Run the App with a Local Server

**You MUST use a local server** — opening `index.html` directly as a `file://` URL will
NOT work because Google's OAuth requires an HTTP/HTTPS origin.

### Option A: VS Code Live Server (Recommended — easiest)

1. Install the **Live Server** extension in VS Code
2. Right-click `index.html` then **"Open with Live Server"**
3. Your browser opens at `http://127.0.0.1:5500`
4. Make sure `http://127.0.0.1:5500` is in your **Authorized JavaScript origins** (Step 4)

### Option B: npx serve (No install needed)

```powershell
# Run this in the project folder (c:\pisaen\noah)
npx serve .
```
Then open `http://localhost:3000` in your browser.

### Option C: Python (if installed)

```powershell
python -m http.server 8000
```
Then open `http://localhost:8000` in your browser.

---

## Step 7: Create the Daily Mission in Google Calendar

The parent creates a Google Calendar event with this **exact format**:

### Event Title (must contain this keyword):
```
คำศัพท์วันนี้ — วันพฤหัสบดี
```
The title just needs to **contain** `คำศัพท์วันนี้` anywhere.

### Event Description (vocabulary format):
```
1. Apple - แอปเปิ้ล
2. Book - หนังสือ
3. Cat - แมว
4. Dog - สุนัข
5. Elephant - ช้าง
6. Fish - ปลา
7. Garden - สวน
8. House - บ้าน
9. Island - เกาะ
10. Jungle - ป่าดงดิบ
11. Key - กุญแจ
12. Lamp - โคมไฟ
13. Moon - พระจันทร์
14. Night - กลางคืน
15. Ocean - มหาสมุทร
```

Rules for the description format:
- Each word on its own line
- Format: `[number]. [English] - [Thai]`
- The dash `-` separates the English and Thai
- Extra spaces around the dash are fine
- Lines that don't match this format are automatically ignored

---

## Step 8: Test the Full Flow

1. Open `http://localhost:PORT` (whichever server you chose)
2. You should see the **"ยืนยันตัวตนผู้ปกครอง"** login modal
3. Click **"เข้าสู่ระบบด้วย Google"** — a Google popup appears
4. Sign in with the **parent's Google account**
5. Grant the requested Calendar permission
6. The modal closes — you're now authenticated
7. Click **"เริ่มภารกิจ 15 คำศัพท์"** — the quiz launches
8. Go through all 15 words, revealing Thai translations
9. Complete the mission
10. Check Google Calendar — the event should now be **Basil Green** with the completion message appended

---

## Troubleshooting

| Problem | Solution |
|---|---|
| `"Error 400: redirect_uri_mismatch"` | The URL you're using is not in your Authorized JavaScript Origins. Add it in Google Cloud Console |
| `"Access blocked: Authorization Error"` | Your Google account is not in the Test Users list. Add it in OAuth Consent Screen |
| `"ไม่พบภารกิจสำหรับวันนี้"` | No Calendar event with `"คำศัพท์วันนี้"` in the title exists for today |
| `"พบกิจกรรม แต่ไม่พบคำศัพท์"` | The event exists but the description format is wrong. Check `1. Word - คำแปล` format |
| App shows config warning banner | You haven't replaced `YOUR_GOOGLE_CLIENT_ID_HERE` in `src/config.js` |
| Popup closes immediately | Try disabling any popup blockers for localhost |
| Token expired after 1 hour | Normal behavior — click sign-in again to get a new token |

---

## Project File Structure

```
c:\pisaen\noah\
├── index.html                    <- Open this in your browser (via local server)
├── README.md                     <- This file
├── src/
│   ├── config.js                 <- EDIT THIS - Add your Client ID here
│   ├── auth.js                   <- Google Identity Services OAuth 2.0
│   ├── calendarApi.js            <- Calendar fetch, parse, and PATCH logic
│   ├── calendarHooks.js          <- useCalendarData() and completeDailyMission()
│   ├── ui.js                     <- All overlays and UI interactions
│   └── app.js                    <- App entry point / bootstrapper
└── stitch_daily_word_quest_interface/
    ├── code.html                 <- Original Stitch export (reference, not used)
    ├── DESIGN.md                 <- Design system documentation
    └── screen.png                <- Design screenshot
```

---

## Security Notes

- The **Client Secret** is never used or stored in this app (correct for browser-based OAuth)
- The **access token** is stored only in `sessionStorage` — it is automatically deleted when the browser tab is closed
- Tokens expire after **1 hour** — the user will need to re-authenticate after expiry
- This app only requests `calendar.events` scope — it cannot access email, contacts, or other Google data
