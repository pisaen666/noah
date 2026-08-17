# 🌐 Daily Word Quest — Production Deployment Guide (Phase 4)

คู่มือการนำแอปพลิเคชัน **Daily Word Quest (โนอาห์ คำศัพท์รายวัน)** ขึ้นสู่ระบบ Production ออนไลน์ เพื่อให้สามารถติดตั้งเป็น PWA ใช้งานบนมือถือหรือแท็บเล็ตของเด็กได้จริง

---

## 📑 สารบัญ
1. [การเตรียมตัวและ Build สำหรับ Production](#1-การเตรียมตัวและ-build-สำหรับ-production)
2. [วิธีที่ 1: Deploy บน Vercel (แนะนำ - ฟรี & เร็วที่สุด)](#2-วิธีที่-1-deploy-บน-vercel-แนะนำ)
3. [วิธีที่ 2: Deploy บน Netlify (Drag & Drop ไม่ต้องลงโปรแกรม)](#3-วิธีที่-2-deploy-บน-netlify-ลากวางไฟล์ได้ทันที)
4. [⚡ ขั้นตอนสำคัญมาก: อัปเดต URL บน Google Cloud Console](#4-⚡-ขั้นตอนสำคัญมาก-อัปเดต-url-บน-google-cloud-console)
5. [📱 วิธีติดตั้งเป็น PWA บนมือถือและแท็บเล็ต](#5-📱-วิธีติดตั้งเป็น-pwa-บนมือถือและแท็บเล็ต)
6. [✅ เช็กลิสต์ทดสอบขั้นสุดท้ายบน Production](#6-เช็กลิสต์ทดสอบขั้นสุดท้ายบน-production)

---

## 1. การเตรียมตัวและ Build สำหรับ Production

ก่อนทำการ Deploy ให้รันคำสั่งตรวจสอบและ Build โฟลเดอร์ `dist/` ใน Command Prompt (CMD):

```powershell
# 1. ตรวจสอบความถูกต้องของไฟล์และการตั้งค่าทั้งหมด
npm run verify

# 2. ทำการ Build ไฟล์สำหรับ Production (จะได้โฟลเดอร์ dist/)
npm run build
```

> **ความปลอดภัย:** แอปนี้ใช้สถาปัตยกรรม Client-side OAuth 2.0 (Google Identity Services) จึงใช้เพียง `Client ID` เท่านั้น ไม่มีการเก็บ `Client Secret` ในโค้ด ปลอดภัย 100% สำหรับการ Deploy บนโฮสติ้งสาธารณะ

---

## 2. วิธีที่ 1: Deploy บน Vercel (แนะนำ)

Vercel เป็นแพลตฟอร์มฟรีที่มี HTTPS อัตโนมัติและรองรับ PWA อย่างสมบูรณ์

### แบบ A: ใช้ Vercel CLI (ง่ายและรวดเร็ว)
1. เปิด Command Prompt (CMD) แล้วพิมพ์:
   ```cmd
   npx vercel
   ```
2. ทำตามขั้นตอนบนหน้าจอ:
   - เข้าสู่ระบบด้วย Email / GitHub
   - ยืนยันการ Deploy โฟลเดอร์ปัจจุบัน (กด Enter ผ่านค่าเริ่มต้น)
3. เมื่อเสร็จสิ้น Vercel จะให้ URL สำหรับใช้งานจริง เช่น:
   👉 **`https://daily-word-quest.vercel.app`**

### แบบ B: Deploy ผ่าน GitHub (สำหรับต่อยอด CI/CD)
1. Push โค้ดทั้งหมดขึ้น GitHub Repository
2. ไปที่ [https://vercel.com](https://vercel.com) → กด **"Add New Project"**
3. เลือก Repository แล้วกด **"Deploy"**

---

## 3. วิธีที่ 2: Deploy บน Netlify (ลากวางไฟล์ได้ทันที)

หากไม่อยากพิมพ์คำสั่ง สามารถลากโฟลเดอร์ `dist/` วางได้เลย:

1. รันคำสั่ง `npm run build` ในเครื่องเพื่อสร้างโฟลเดอร์ `dist/`
2. เปิดเบราว์เซอร์ไปที่: **[https://app.netlify.com/drop](https://app.netlify.com/drop)**
3. ลากโฟลเดอร์ **`dist`** จากในเครื่องของคุณไปวางในช่องวงกลมบนหน้าเว็บ
4. รอ 5 วินาที Netlify จะสร้าง URL ให้คุณทันที เช่น:
   👉 **`https://noah-word-quest.netlify.app`**

---

## 4. ⚡ ขั้นตอนสำคัญมาก: อัปเดต URL บน Google Cloud Console

> ⚠️ **คำเตือน:** หากไม่ทำขั้นตอนนี้ Google จะบล็อกการล็อกอินด้วยข้อผิดพลาด `no registered origin` หรือ `400: redirect_uri_mismatch` เนื่องจาก Google อนุญาตให้ล็อกอินได้เฉพาะโดเมนที่ลงทะเบียนไว้เท่านั้น

### ขั้นตอนการเพิ่ม URL จริง:
1. ไปที่ **Google Cloud Console**: [https://console.cloud.google.com/auth/clients](https://console.cloud.google.com/auth/clients)
2. คลิกที่ชื่อ Client ของคุณ: **`Daily Word Quest Web Client`**
3. เลื่อนลงมาที่หัวข้อ **"Authorized JavaScript origins"**
4. กดปุ่ม **"+ Add URI"**
5. **ใส่ URL จริงที่ได้จาก Vercel หรือ Netlify** เช่น:
   ```text
   https://daily-word-quest.vercel.app
   ```
   *(หรือ URL ของคุณที่ได้จากการ Deploy)*

   > 🚫 **ข้อควรระวัง:**
   > - ต้องขึ้นต้นด้วย **`https://`** เท่านั้น (Google ไม่อนุญาต `http://` บนโดเมนจริง)
   > - **ห้ามใส่เครื่องหมายสแลช `/` ปิดท้าย** เช่น `https://daily-word-quest.vercel.app/` ❌ ให้ใส่ `https://daily-word-quest.vercel.app` ✅

6. กดปุ่ม **"Save" (บันทึก)** ด้านล่างสุด
7. **รอประมาณ 2-5 นาที** เพื่อให้ระบบของ Google อัปเดตการตั้งค่า

---

## 5. 📱 วิธีติดตั้งเป็น PWA บนมือถือและแท็บเล็ต

เมื่อเปิดแอปผ่าน URL จริงบนมือถือ/แท็บเล็ต คุณสามารถติดตั้งให้เป็นเสมือนแอปจริงได้ดังนี้:

### 🤖 สำหรับ Android (Google Chrome):
1. เปิด Google Chrome แล้วเข้าไปที่ URL ของแอป (เช่น `https://daily-word-quest.vercel.app`)
2. จะมีแถบด้านล่างขึ้นมาแนะนำให้ **"ติดตั้งแอป"** หรือกดปุ่มเมนู 3 จุด (**⋮**) ด้านขวาบน
3. เลือก **"ติดตั้งแอป" (Install App)** หรือ **"เพิ่มลงในหน้าจอหลัก" (Add to Home screen)**
4. ไอคอน **Daily Word Quest** จะปรากฏบนหน้าจอมือถือ สามารถกดเปิดเต็มจอได้ทันที

### 🍎 สำหรับ iPhone / iPad (Safari):
1. เปิดเบราว์เซอร์ **Safari** แล้วเข้าไปที่ URL ของแอป
2. กดปุ่ม **แชร์ (Share)** ที่แถบด้านล่าง (ไอคอนสี่เหลี่ยมมีลูกศรชี้ขึ้น ⎋)
3. เลื่อนลงมาแล้วเลือก **"เพิ่มไปยังหน้าจอโฮม" (Add to Home Screen)**
4. กด **"เพิ่ม" (Add)** ด้านขวาบน
5. แอปจะถูกติดตั้งบนหน้าจอโฮมพร้อมใช้งานแบบ Standalone ไร้แถบ Safari

---

## 6. ✅ เช็กลิสต์ทดสอบขั้นสุดท้ายบน Production

- [ ] **เปิดแอปผ่าน HTTPS:** เข้าสู่ระบบผ่าน URL ของ Vercel/Netlify ได้ราบรื่น
- [ ] **Google Login:** กดยืนยันตัวตนผู้ปกครองสำเร็จ ไม่มีปัญหาเรื่อง Origin
- [ ] **Service Worker:** ตรวจสอบใน DevTools > Application > Service Worker ทำงานแบบ Active
- [ ] **Offline Resilience:** เมื่อตัดสัญญาณเน็ตบนมือถือ มีแถบเตือน *"⚠️ สัญญาณหลุดไปแล้ว!"*
- [ ] **Google Calendar Sync:** เมื่อเด็กทำคำศัพท์ครบ 15 คำ ใน Google Calendar เปลี่ยนเป็น **สีเขียว (Basil Green)** และมีข้อความบันทึกสำเร็จ
- [ ] **PWA Standalone Mode:** เมื่อเปิดจากไอคอนหน้าจอมือถือ ตัวแอปเปิดเต็มจอ ไม่มีแถบ URL
