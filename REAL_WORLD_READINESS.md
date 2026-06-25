# Sentinel ADS Real-World Readiness

## สิ่งที่ระบบทำได้แล้ว

- รับแจ้งเคสโฆษณาต้องสงสัยจากหน้าเว็บและจากเจ้าหน้าที่
- วิเคราะห์ข้อความโฆษณา, ประเมิน `aiRiskScore`, และแนบคำอธิบายเชิงกฎหมายเบื้องต้น
- มี workflow ตามบทบาท `INSPECTOR`, `LEGAL_OFFICER`, `REVIEWER`, `ADMIN`, `EXECUTIVE`
- มี dashboard, risk logs, audit trail, settings และ browser extension
- มี global risk level สำหรับ `MANUAL`, `AUTO_DETECT`, `AUTO_BLOCK`
- มีการ blacklist domain และบันทึก block logs

## ช่องว่างก่อนใช้งานจริง

### 1. กฎหมายเชิงลึกยังไม่ใช่ live legal research
- ตอนนี้ `laws` มาจาก seed data ในฐานข้อมูล และ AI จับคู่จาก keyword เป็นหลัก
- ยังไม่มีระบบดึงกฎหมายล่าสุด, คำพิพากษา, ประกาศราชกิจจานุเบกษา หรือฐานข้อมูลผู้กระทำผิดจริงแบบออนไลน์

### 2. ข้อมูลสืบค้นเชิงลึกยังเป็น mock
- การตรวจ WHOIS, IP, ISP และสถานะเลขอนุญาตใน `cases.service.ts` ยังเป็นข้อมูลจำลอง
- หากจะใช้จริง ต้องเชื่อมต่อ external services สำหรับ WHOIS/RDAP, domain reputation, license validation และ case intelligence

### 3. ความปลอดภัย production ยังต้องเพิ่ม
- ยังไม่มี rate limit, audit hardening, secret rotation, CSRF/CORS policy ที่เข้มพอสำหรับ production
- การเก็บ token ฝั่ง frontend ยังเป็น local storage ซึ่งเหมาะกับ demo มากกว่าระบบความเสี่ยงสูง

### 4. การทดสอบยังไม่ครอบคลุม
- ยังไม่พบ unit/integration/e2e tests สำหรับ flow หลัก
- ควรเพิ่ม test สำหรับ auth, role enforcement, AI workflow, risk logs, auto block และ dashboard filters

### 5. โครงสร้าง deploy ยังเป็น local-first
- README ปัจจุบันเน้นรัน local
- ก่อนใช้งานจริงควรมี environment แยก `dev/staging/prod`, reverse proxy, backup database และ monitoring

## คำแนะนำก่อน deploy ใช้งานจริง

1. เปลี่ยน mock intelligence เป็น live integrations
2. เพิ่มฐานข้อมูลกฎหมายและฐานข้อมูลคดีที่อัปเดตได้
3. เสริม authentication และ session security
4. ทำ automated tests และ UAT ตามบทบาทจริง
5. ติดตั้ง logging, alerting และ backup/restore plan
6. ทบทวนด้านกฎหมายและ PDPA ก่อนใช้งานกับข้อมูลจริง

## วิธีใช้งานระบบในเครื่อง

1. ติดตั้ง dependency ที่ root ด้วย `npm install`
2. สร้างฐานข้อมูลด้วย `npm run prisma:push`
3. ใส่ข้อมูลตัวอย่างด้วย `npm run prisma:seed`
4. เปิด backend ด้วย `npm run dev:backend`
5. เปิด dashboard ด้วย `npm run dev:dashboard`
6. เปิด extension dev mode ด้วย `npm run dev:extension`
7. ล็อกอินด้วยบัญชีตัวอย่าง เช่น `admin@fda.go.th` หรือ `inspector@fda.go.th` โดยใช้รหัสผ่าน `password123`

## หมายเหตุสำคัญ

- ระบบเวอร์ชันนี้เหมาะสำหรับ demo, prototype, และ pilot ภายใน
- หากจะใช้สำหรับ “ค้นข้อมูลกฎหมายเชิงลึกเกี่ยวกับผู้กระทำความผิด” ในงานจริง ต้องต่อยอด data sources และ governance เพิ่มอย่างมีนัยสำคัญ
