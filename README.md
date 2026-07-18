# 🛡️ Sentinel ADS – Monorepo System

ระบบเฝ้าระวังและบล็อกโฆษณาผลิตภัณฑ์สุขภาพที่ผิดกฎหมาย/อวดอ้างสรรพคุณเกินจริง (อาหาร, ยา, เครื่องสำอาง, สมุนไพร, เครื่องมือแพทย์) แบบอัตโนมัติ ด้วยเทคโนโลยี AI (Google Gemini / OpenAI / Claude) และระบบการกรองด้วยกฎหมายอาหารและยาของไทย

---

## 📁 โครงสร้างโปรเจกต์ (Monorepo Layout)

โปรเจกต์นี้ได้รับการพัฒนาในรูปแบบ Monorepo แบ่งออกเป็นแพ็กเกจย่อยดังนี้:
- **`packages/shared`**: คลังประเภทข้อมูล (Shared Types, Enums, DTOs) และระบบการเชื่อมโยง
- **`apps/backend-api`**: ระบบหลังบ้านพัฒนาด้วย **NestJS** + **Prisma ORM** + **PostgreSQL** + **Nodemailer (SMTP)**
- **`apps/browser-extension`**: ส่วนขยายเบราว์เซอร์ **Chrome Extension** สแกนเน็ตเวิร์กและคำในหน้าเว็บเพื่อแจ้งเตือน/บล็อกอัตโนมัติ
- **`apps/dashboard-web`**: เว็บบอร์ดจัดการระบบสำหรับผู้ดูแลระบบ (Admin), นิติกร (Legal Officer), และผู้ตรวจการ (Inspector) พัฒนาด้วย **Next.js**

---

## 🛠️ ความต้องการของระบบ (Prerequisites)

- **Node.js** v18 หรือใหม่กว่า
- **NPM** v9 หรือใหม่กว่า
- **PostgreSQL** ฐานข้อมูลที่พร้อมใช้งาน

---

## 🚀 ขั้นตอนการติดตั้งและการเริ่มใช้งาน (Setup & Run)

### 1. การติดตั้ง Dependencies ทั้ง Monorepo
เปิด Terminal ในโฟลเดอร์ราก (Root Directory) ของโปรเจกต์ และรันคำสั่ง:
```bash
npm install
```

### 2. การสร้างและกำหนดค่าไฟล์ `.env`
ไปที่โฟลเดอร์หลังบ้าน `apps/backend-api/`
1. คัดลอกไฟล์ `.env.example` ไปเป็น `.env`
2. กำหนดค่าคีย์ต่างๆ ภายในไฟล์:
   - **`DATABASE_URL`**: ลิงก์เชื่อมโยงฐานข้อมูล PostgreSQL ของคุณ
   - **`JWT_SECRET`**: รหัสสำหรับเข้ารหัส Access Token
   - **`AI_PROVIDER`**: เลือกผู้ให้บริการ AI เช่น `gemini`, `openai` หรือ `anthropic`
   - **`GEMINI_API_KEY`**: คีย์ API ของ Google Gemini (หากเลือกใช้ gemini)
   - **`SMTP_USER`** และ **`SMTP_PASS`**: บัญชีอีเมล Gmail และรหัสผ่าน App Password (16 หลัก) ที่สร้างจากบัญชี Google เพื่อใช้ในการส่งเมลแจ้งเตือนผู้ตรวจการ

### 3. การสร้าง Schema ฐานข้อมูลและ Seed ข้อมูลเริ่มต้น
เปิด Terminal ที่โฟลเดอร์ราก (Root Directory) และรันคำสั่งเพื่อ Migrate และ Seed ข้อกฎหมายและบัญชีผู้ใช้จำลอง:
```bash
# อัปเดตโครงสร้างฐานข้อมูลตาม Prisma Schema
npm run prisma:push

# ใส่ข้อมูลเบื้องต้น (เช่น ข้อกฎหมาย, ผู้ใช้อย่างนิติกร/ผู้ตรวจการ)
npm run prisma:seed
```

### 4. การ Build Shared Library (สำคัญ)
คุณต้องรันคำสั่ง build แพ็กเกจ shared ก่อนเพื่อให้เกิดโฟลเดอร์ `dist` สำหรับให้ API และ Dashboard เรียกไปใช้งานได้:
```bash
npm run build --workspace=packages/shared
```

---

## 💻 การเปิดใช้งานระบบในสภาพแวดล้อมนักพัฒนา (Development)

คุณสามารถเปิดเซิร์ฟเวอร์ย่อยใน monorepo ได้ผ่านคำสั่งลัดในโฟลเดอร์ราก (Root Directory):

### 1. รัน Backend API (รันบนพอร์ต 3001)
```bash
npm run dev:backend
```

### 2. รัน Dashboard Web (รันบนพอร์ต 3000)
```bash
npm run dev:dashboard
```

### 3. รัน Browser Extension (สำหรับการพัฒนา/คอมไพล์โค้ด)
```bash
npm run dev:extension
```
หรือหากต้องการคอมไพล์สำหรับ Production เพื่อนำไปโหลดบน Chrome:
```bash
npm run build:extension
```
*หลังจากรันคอมไพล์ extension เสร็จแล้ว ให้ไปที่ Chrome -> `chrome://extensions` -> เปิด **Developer mode** (มุมขวาบน) -> คลิก **Load unpacked** (มุมซ้ายบน) -> เลือกโฟลเดอร์ `apps/browser-extension/dist`*

---

## 🔑 บัญชีเข้าใช้งานระบบ Dashboard เริ่มต้น (Seed Users)

ใช้สำหรับเข้าสู่ระบบที่หน้าเว็บหลัก (`http://localhost:3000`):

| บทบาท (Role) | อีเมล (Email) | รหัสผ่าน (Password) | สิทธิ์การทำงานหลัก |
|:---|:---|:---|:---|
| **ผู้ดูแลระบบ (Admin)** | `admin@sentinelads.com` | `admin1234` | อัปเดตระดับความเสี่ยงของระบบ, จัดการข้อมูล |
| **หัวหน้าผู้ตรวจทาน (Reviewer)** | `reviewer@sentinelads.com` | `reviewer1234` | ตรวจสอบผลวิเคราะห์, อนุมัติการบล็อกโดเมน |
| **นิติกร (Legal Officer)** | `legal@sentinelads.com` | `legal1234` | ยืนยันข้อกฎหมายที่สอดคล้องกับการกระทำผิด |
| **ผู้ตรวจการ (Inspector)** | `inspector@sentinelads.com` | `inspector1234` | เข้าถึงรายการคดี, ดูประวัติความเสี่ยง Auto-Detect |

---

## 🛡️ ฟีเจอร์หลักในระบบ (Core Features)

1. **Multi-Level Risk Management**: ตั้งค่าสิทธิ์และระดับการป้องกันผ่าน Dashboard:
   - **`MANUAL`**: เจ้าหน้าที่ตรวจเช็คและกดระงับบล็อกเองผ่านระบบแบบดั้งเดิม
   - **`AUTO_DETECT`**: บลูทูธ Extension ทำงาน สแกนคำอัตโนมัติแล้วส่งแจ้งเตือนมายังแดชบอร์ดโดยยังไม่ปิดกั้นหน้าเว็บ
   - **`AUTO_BLOCK`**: ส่วนขยายบล็อกหน้าเว็บและปิดแท็บที่เป็นอันตราย (Risk Score >= 80%) ทันที โดยที่ backend บันทึกประวัติและส่งอีเมลแจ้งเตือนเจ้าหน้าที่โดยอัตโนมัติ
2. **Real AI Integration**: การประสานงานกับ Generative AI (Gemini, OpenAI, Claude) เพื่อวิเคราะห์ข้อความโฆษณา, คาดการณ์คะแนนความเสี่ยง, และจับคู่มาตราทางกฎหมายอาหารและยาของไทยโดยอัตโนมัติ
3. **SMTP Notification**: แจ้งเตือนผ่านอีเมลทันทีที่ระบบตรวจพบคดีที่มีความเสี่ยงสูงมากแบบ Real-time เพื่อให้ผู้ตรวจการเข้าดำเนินการระงับข้อความโฆษณาทางแพ่งต่อไป

---
*โปรเจกต์ Sentinel ADS พัฒนาขึ้นมาเพื่อแก้ไขปัญหาการหลอกลวงผู้บริโภคเกี่ยวกับผลิตภัณฑ์สุขภาพอย่างครบวงจร* 🚀
