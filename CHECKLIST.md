# 📋 Daily Word Quest — Verification & Testing Checklist

Use this checklist to verify that all features, error handling, Google Calendar API integration, and PWA capabilities are functioning perfectly.

---

## 🚀 1. How to Run the Application

In the project folder (`c:\pisaen\noah`), run any of the following:

```powershell
# Option A: Using npm script
npm run dev

# Option B: Direct with npx (no npm install needed)
npx serve . -l 3000

# Option C: VS Code Live Server
# Right click index.html -> "Open with Live Server"
```

Open **`http://localhost:3000`** in your browser.

---

## ✅ 2. Complete Verification Checklist

### 🔑 A. Authentication (Google OAuth 2.0)
- [ ] **First Visit**: When opening the app while not logged in, the **"ยืนยันตัวตนผู้ปกครอง"** modal appears.
- [ ] **Google Sign-In**: Clicking **"เข้าสู่ระบบด้วย Google"** opens the Google Account chooser.
- [ ] **Token Storage**: Upon consent, the token is saved in `sessionStorage` and the login modal disappears.
- [ ] **Sign Out**: Clicking the **"ตั้งค่า"** (Settings) tab in the bottom nav signs the user out and returns to the login modal.

---

### 🏕️ B. Empty State (Parent forgot to create mission)
- [ ] **Test Setup**: Do not create any event with `"คำศัพท์วันนี้"` in Google Calendar for today.
- [ ] **Behavior**: Click **"เริ่มภารกิจ 15 คำศัพท์"**.
- [ ] **Expected UI**:
  - Empty state modal appears with title: *"วันนี้ไม่มีภารกิจ!"*
  - Message: *"พักผ่อนได้เลย หรือเตรียมตัวสำหรับด่านต่อไป 🎮✨"*
  - Helper box explains how parents can create the event in Google Calendar:
    1. Set event title containing `"คำศัพท์วันนี้"`
    2. Add vocabulary lines to description
  - Click *"🎮 ทราบแล้ว กลับสู่แผนที่"* closes the modal.

---

### 📖 C. Kid-Friendly Loading State
- [ ] **Behavior**: Click **"เริ่มภารกิจ 15 คำศัพท์"**.
- [ ] **Result**: While the app communicates with the Google Calendar API, a playful loading modal with a floating magic book icon (`auto_stories`) and pulsing energy ring appears:
  - Text: *"กำลังเปิดสมุดภารกิจ... กำลังดึง 15 คำศัพท์เวทมนตร์จาก Google Calendar ✨"*

---

### 📝 D. Vocabulary Quiz Flow (15 Words)
- [ ] **Test Setup**: Create an event today titled `"คำศัพท์วันนี้"` with 15 formatted words in the description:
  ```text
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
- [ ] **Quiz Display**: The quiz opens full-screen showing **Word 1 / 15** with progress bar at 0%.
- [ ] **Reveal Thai**: English word is visible; clicking **"👁 แสดงคำแปล"** reveals the Thai translation in neon green.
- [ ] **Progression**: After revealing, clicking **"คำถัดไป →"** advances to the next word and updates the progress indicator dots.

---

### 🏆 E. Mission Completion & Google Calendar Sync
- [ ] **Complete Word 15**: On the final word, the button displays **"🏆 เสร็จสิ้นภารกิจ!"**.
- [ ] **Calendar PATCH**: The app sends a `PATCH` request to Google Calendar API.
- [ ] **Success Screen**: A celebration modal pops up with confetti/stars:
  - *"🎉 โนอาห์ทำภารกิจสำเร็จแล้ว!"*
- [ ] **Verify in Google Calendar**:
  - Open [https://calendar.google.com](https://calendar.google.com)
  - ✅ The event color has changed to **Basil Green (Color ID: 10)**.
  - ✅ The description has `\n\n🎉 โนอาห์ทำภารกิจสำเร็จแล้ว!` appended at the bottom.
- [ ] **Already Completed Guard**: If you click **"เริ่มภารกิจ"** again today, it displays the **"ทำไปแล้ว!"** badge without re-running the quiz.

---

### 🛰️ F. Network Loss & Offline Resilience
- [ ] **Simulation**: In Chrome DevTools (F12) → Network tab → select **"Offline"** (or turn off Wi-Fi).
- [ ] **Real-time Alert**: A top HUD toast appears:
  - *"⚠️ สัญญาณหลุดไปแล้ว! ตรวจสอบอินเทอร์เน็ตนะ 🚀"*
- [ ] **Reconnection**: Turn internet back on → Toast turns green:
  - *"🟢 กลับมาออนไลน์แล้ว! เชื่อมต่อสำเร็จ"*

---

### 📱 G. PWA Installation (Mobile / Tablet / Desktop)
- [ ] **Service Worker**: In DevTools → Application → Service Workers → `sw.js` is **activated and running**.
- [ ] **Manifest**: In DevTools → Application → Manifest → Name is `"โนอาห์ คำศัพท์รายวัน - Daily Word Quest"`, icons load properly.
- [ ] **Android Chrome**: Tap the three dots menu (⋮) → **"Install app"** / **"Add to Home Screen"**.
- [ ] **iOS Safari**: Tap the Share button (⎋) → **"Add to Home Screen"** (`เพิ่มไปยังหน้าจอโฮม`).
- [ ] **Standalone Experience**: Opening from home screen launches the app in full-screen standalone mode with no browser URL bar!

---

## 🎯 Verification Matrix

| Feature | Expected Result | Status |
|---|---|---|
| Google OAuth 2.0 (GIS) | Popup opens, authenticates, persists in session | 🟢 Ready |
| Calendar Event Parser | Parses regex `^\d+\.\s*(.+?)\s*-\s*(.+)$` into 15 items | 🟢 Ready |
| Calendar PATCH Writer | Changes `colorId` to `"10"` + appends Thai victory message | 🟢 Ready |
| Empty State Fallback | Friendly campfire modal when no mission is scheduled | 🟢 Ready |
| Loading Animation | Animated book + pulsing energy ring | 🟢 Ready |
| Offline Handler | Top HUD alert on network drop | 🟢 Ready |
| PWA Service Worker | Precaches shell assets, enables fast loading | 🟢 Ready |
| Responsive Layout | Adapts seamlessly from 360px phones to 1024px+ tablets | 🟢 Ready |
