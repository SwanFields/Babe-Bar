# Babe Bar

เว็บจองโต๊ะ ประมูลโฮสต์ แพ็กเกจ และ E-Ticket โดยใช้ npm workspaces

## โครงสร้างโปรเจกต์

```text
apps/web        React + TypeScript + Vite + Tailwind
apps/api        Express + TypeScript + Prisma
packages/shared Zod schemas และ types ที่ใช้ร่วมกัน
```

## สิ่งที่ต้องติดตั้ง

- Node.js 20 ขึ้นไป
- PostgreSQL
- Git

## ติดตั้งหลัง clone

```bash
git clone <repository-url>
cd Babe-Bar
npm install
```

## ให้เพื่อนเปิดโปรเจกต์บนเครื่องใหม่

เพื่อนต้องมีสิ่งต่อไปนี้ก่อน:

- Node.js 20 ขึ้นไป
- PostgreSQL ที่เปิดใช้งานอยู่
- Git
- Stripe CLI เฉพาะกรณีต้องการทดสอบการชำระเงินและ webhook

### 1. สร้างฐานข้อมูล

สร้าง database ชื่อ `babebar` ใน PostgreSQL แล้วตรวจสอบว่า username, password และ port ตรงกับเครื่องของเพื่อน

### 2. สร้างไฟล์ environment

จากโฟลเดอร์หลักของโปรเจกต์ ให้คัดลอกไฟล์ตัวอย่าง:

**Windows PowerShell**

```powershell
Copy-Item apps\api\.env.example apps\api\.env
Copy-Item apps\web\.env.example apps\web\.env
```

แก้ `apps/api/.env` อย่างน้อยให้มีค่าเหล่านี้:

```env
DATABASE_URL="postgresql://postgres:รหัสผ่าน@localhost:5432/babebar"
JWT_SECRET="ตั้งค่าใหม่ที่เดายาก"
WEB_ORIGIN="http://localhost:5173"
BOOKING_TEST_MODE="true"
```

และตรวจสอบ `apps/web/.env`:

```env
VITE_API_URL="http://localhost:4000/api"
VITE_BOOKING_TEST_MODE="true"
```

`BOOKING_TEST_MODE=true` ใช้เพื่อทดสอบการจองนอกช่วงเวลา 06:00-20:00 เท่านั้น หากใช้งานจริงให้เปลี่ยนทั้งสองไฟล์เป็น `false`

### 3. สร้างตารางและข้อมูลตัวอย่าง

```bash
npm run db:generate
npm run db:push -w apps/api
npm run db:seed
```

### 4. เปิดเว็บ

```bash
npm run dev
```

จากนั้นเปิด:

- เว็บ: `http://localhost:5173`
- API: `http://localhost:4000`

การเข้าสู่ระบบด้วยบัญชีตัวอย่างอยู่ในส่วน "บัญชีตัวอย่างจาก seed" ด้านล่าง

ถ้าเพื่อนต้องการทดสอบการจ่ายเงินจริงในระบบจำลอง ต้องใส่ `STRIPE_SECRET_KEY` ใน `apps/api/.env`, ใส่ `VITE_STRIPE_PUBLISHABLE_KEY` ใน `apps/web/.env` และตั้งค่า `PAYMENT_PROVIDER="stripe"` จาก Stripe Test Mode เท่านั้น ห้ามส่งไฟล์ `.env` หรือ secret key ให้ผู้อื่นผ่าน Git

สำหรับ webhook ให้เปิด API ก่อน แล้วเปิดอีกหน้าต่างรัน:

```powershell
stripe listen --events checkout.session.completed,payment_intent.succeeded,payment_intent.payment_failed --forward-to localhost:4000/api/webhooks/stripe
```

นำค่า `whsec_...` ที่ Stripe CLI แสดงไปใส่ใน `apps/api/.env` ที่ `STRIPE_WEBHOOK_SECRET` แล้ว restart API จากนั้นใช้บัตรทดสอบ `4242 4242 4242 4242` พร้อมวันหมดอายุและ CVC ใดก็ได้

## ตั้งค่าฐานข้อมูลและ environment

สร้าง database PostgreSQL ชื่อ `babebar` ก่อน แล้วคัดลอกไฟล์ตัวอย่าง:

### Windows PowerShell

```powershell
Copy-Item apps\api\.env.example apps\api\.env
```

### macOS/Linux

```bash
cp apps/api/.env.example apps/api/.env
```

แก้ไข `apps/api/.env` ให้ตรงกับเครื่องของคุณ:

```env
DATABASE_URL="postgresql://postgres:รหัสผ่าน@localhost:5432/babebar"
JWT_SECRET="เปลี่ยนเป็นค่าแบบสุ่มที่ปลอดภัย"
WEB_ORIGIN="http://localhost:5173"
BOOKING_TEST_MODE="false"
```

ห้าม commit ไฟล์ `.env` เพราะอาจมีรหัสผ่านและ secret ส่วน `apps/api/.env.example` สามารถ commit ได้

## โหมดทดสอบการจอง

เวลาจริง ระบบจะเปิดรับจองเฉพาะ 06:00-20:00 หากต้องการทดสอบนอกช่วงเวลาดังกล่าว ให้ตั้งค่าใน `apps/api/.env` และ `apps/web/.env` เป็น:

```env
BOOKING_TEST_MODE="true"
VITE_BOOKING_TEST_MODE="true"
```

จากนั้นหยุดและรัน `npm run dev` ใหม่ เพราะ Vite โหลด environment ตอนเริ่มต้นเท่านั้น โหมดนี้จะแสดงป้ายโหมดทดสอบและเปิดปุ่มจองตลอดเวลา

ก่อนใช้งานจริงต้องเปลี่ยนกลับเป็น:

```env
BOOKING_TEST_MODE="false"
VITE_BOOKING_TEST_MODE="false"
```

## ทดสอบ Stripe Webhook (Test Mode)

เปิด API ก่อน:

```powershell
npm run dev -w apps/api
```

เปิด Stripe listener ในอีกหน้าต่าง:

```powershell
stripe listen --events payment_intent.succeeded,payment_intent.payment_failed --forward-to localhost:4000/api/webhooks/stripe
```

นำ `whsec_...` ที่คำสั่งแสดงมาใส่ใน `apps/api/.env` แล้ว restart API ทุกครั้งที่เปลี่ยนค่า

เนื่องจาก Stripe CLI รุ่นใหม่ไม่รองรับ fixture ของ `stripe trigger payment_intent.succeeded` บางแบบ ให้สร้าง PaymentIntent โดยตรง:

```powershell
stripe payment_intents create --amount 35000 --currency thb --payment-method pm_card_visa --confirm '--automatic-payment-methods[enabled]=true' '--automatic-payment-methods[allow_redirects]=never'
```

คำสั่งนี้ใช้ Test Mode และจำลองการชำระ 350 บาทเท่านั้น ไม่ตัดเงินจริง หาก listener ทำงานอยู่ควรเห็น event `payment_intent.succeeded` และสถานะตอบกลับ `200` จาก `/api/webhooks/stripe`

## เตรียม Prisma และข้อมูลตัวอย่าง

```bash
npm run db:generate
npm run db:push -w apps/api
npm run db:seed
```

- `db:generate` สร้าง Prisma Client
- `db:push` สร้างหรืออัปเดตตารางใน database
- `db:seed` เพิ่มหรืออัปเดตโต๊ะในโซนด้านหน้า A1-A3, ด้านหลัง B1-B3, โซนกลาง C1-C3 และโซน VIP V1-V3 รวมถึงข้อมูลตัวอย่างเดิม, โฮสต์ แพ็กเกจ และ admin

หากมีฐานข้อมูลเดิม ให้รัน `npm run db:seed` อีกครั้งได้ ระบบจะเพิ่มหรืออัปเดตโต๊ะตามเลขโต๊ะเดิมโดยไม่สร้างซ้ำ

หากต้องการล้างการจองโต๊ะของลูกค้าทั้งหมดโดยไม่ลบผู้ใช้ แพ็กเกจ หรือโต๊ะ ให้รัน:

```powershell
npm run db:clear-bookings -w apps/api
```

คำสั่งนี้ลบเฉพาะ Booking, Payment ที่ผูกกับการจองโต๊ะ, Ticket โต๊ะ และ Event claim ที่ผูกกับการจอง ส่วน Package Ticket และข้อมูลบัญชียังคงอยู่

อายุ Ticket:

- Table Ticket ใช้ได้ถึง 30 นาทีหลังเวลาเข้าร้าน
- Package Ticket ใช้ได้ 7 วันนับจากเวลาซื้อ
- การมาถึงช้ากว่า 15 นาทีอาจถูกยึดมัดจำตามกติกา no-show

## ห้องประมูลโฮสต์

## จัดการแคตตาล็อกโฮสต์ (Admin)

บัญชีที่มี role `admin` สามารถเข้า `/admin/hosts` เพื่อ:

- ใช้งานเป็นผู้ใช้ทั่วไปได้ตามปกติ โดยระบบจะซ่อนเครื่องมือ Admin เป็นค่าเริ่มต้น
- กด `เปิดโหมดแอดมิน` บนหน้า `/admin/hosts` เพื่อแสดงเครื่องมือควบคุม
- เพิ่มชื่อโฮสต์และประวัติย่อ
- ต้องกรอกข้อมูลโปรไฟล์ทุกครั้ง: ชื่อจริง, นามสกุล, ชื่อเล่น, อายุ, ส่วนสูง และแคปชั่นประจำตัว
- แก้ไขชื่อหรือประวัติของโฮสต์เดิม
- แก้ไขข้อมูลโปรไฟล์ของโฮสต์เดิมได้
- อัปโหลดรูป JPG, PNG หรือ WEBP ขนาดไม่เกิน 3MB
- เคลียร์โฮสต์เก่าออกจากหน้าสาธารณะด้วยการซ่อน หรือแสดงกลับภายหลัง

รูปจะถูกเก็บไว้ใน `apps/api/uploads/hosts/` และเปิดให้หน้าเว็บแสดงผ่าน `/uploads/hosts/...` โดยใช้ตาราง `Host` ของ Prisma เดิม ไม่ต้องรัน migration SQL จาก catalog module แยกต่างหาก

เมื่อเปิดโหมดแอดมินแล้ว สามารถไปหน้าเว็บทั่วไปได้ทุกหน้า โดยแผงควบคุมที่เกี่ยวข้องจะแสดงในหน้านั้น เช่น หน้า `/auction` จะแสดงปุ่มเปิด/ปิดประมูลทันทีและตั้งเวลาได้ ไม่จำเป็นต้องอยู่ใน `/admin/...` หากกด `กลับโหมดปกติ` แผงควบคุมทั้งหมดจะถูกซ่อนทันที แต่ฟังก์ชันของลูกค้ายังคงใช้งานได้ตามปกติ

การ์ดในหน้า `/auction` จะแสดงรูป Host ของแต่ละรายการทางด้านขวาพร้อมเอฟเฟกต์ไล่เงาเข้าหาข้อความ เพื่อให้รูปกลมกลืนกับพื้นหลังและยังอ่านรายละเอียดการประมูลได้ชัดเจน

หน้า `/hosts` จะแสดงรูปที่อัปโหลดแล้ว กดการ์ดของ Host เพื่อเปิดรูปขนาดใหญ่พร้อมรายละเอียดทีละคน และข้อมูล Host ยังคงถูกใช้ร่วมกับระบบประมูลเดิม

ลำดับ Host ใช้รหัสเดิมเรียงจากน้อยไปมากอย่างชัดเจน ดังนั้นการแก้ไขชื่อหรือรายละเอียดจะไม่ย้าย Host ไปท้ายรายการ

หน้า `/auction` จะแสดงโฮสต์ 5 คนของวันนั้น เปิดประมูลเวลา 19:00-20:00 และอัปเดตราคาด้วย polling ทุก 2 วินาที

- ต้องผูกบัตรทดสอบก่อนกดประมูล
- รอบใหม่เริ่มที่ 0 ดริ้ง และการบิดแต่ละครั้งต้องเพิ่มอย่างน้อย 1 ดริ้ง (250 บาท)
- เมื่อกดประมูลแล้วจะยกเลิกไม่ได้
- เมื่อหมดเวลา ระบบจะเลือกผู้เสนอราคาสูงสุดและสร้างรายการเรียกเก็บเงินอัตโนมัติ

การผูกบัตรใช้ Stripe SetupIntent ใน Test Mode ระบบเก็บเฉพาะ Stripe PaymentMethod ID, brand, เลข 4 หลักสุดท้าย และวันหมดอายุ ไม่เก็บเลขบัตรเต็มหรือ CVC เมื่อปิดประมูล ระบบจะสร้าง PaymentIntent แบบ `off_session` เพื่อเรียกเก็บเงินจากบัตรทดสอบของผู้ชนะ

บัญชี admin จะเห็นแผงควบคุมเวลาในหน้าห้องประมูล สามารถเลือกวันที่ เวลาเปิด-ปิด, เปิดทันที หรือปิดทันทีได้ ปุ่มนี้มีไว้สำหรับทดสอบระบบและใช้เวลา Asia/Bangkok เท่านั้น

ราคาประมูลใช้หน่วยดริ้ง: 1 ดริ้ง = 250 บาท รอบประมูลเริ่มที่ 0 ดริ้ง และผู้ใช้ต้องเพิ่มอย่างน้อย 1 ดริ้งต่อการบิด ผู้ใช้กรอกจำนวนดริ้งที่ต้องการเพิ่มได้เอง และเมื่อชนะจะเรียกเก็บเงินจากบัตรตาม `จำนวนดริ้งรวม x 250 บาท`

เมื่อกดปิดประมูล ระบบจะเลือกผู้ชนะล่าสุดของแต่ละโฮสต์และสร้าง Stripe PaymentIntent แบบ `off_session` เพื่อเรียกเก็บเงินทันที หากการปิดประมูลเกิดจากเวลาที่ตั้งไว้ ระบบ cron จะดำเนินการให้โดยอัตโนมัติทุก 2 นาที การเรียกเก็บเงินใช้ idempotency key จึงไม่สร้างรายการตัดเงินซ้ำเมื่อมีการ retry

ก่อนทดสอบห้องประมูล ให้ตั้งค่า:

```env
# apps/api/.env
STRIPE_SECRET_KEY="sk_test_..."
PAYMENT_PROVIDER="stripe"

# apps/web/.env
VITE_STRIPE_PUBLISHABLE_KEY="pk_test_..."
```

ใช้บัตร Stripe Test Mode เช่น `4242 4242 4242 4242` วันหมดอายุและ CVC ใดก็ได้ ห้ามใช้เลขบัตรจริงในระบบนี้

## รันระบบสำหรับพัฒนา

```bash
npm run dev
```

เปิดเว็บที่ `http://localhost:5173` และ API ที่ `http://localhost:4000`

ถ้าต้องการรันแยก:

```bash
npm run dev -w apps/web #Frontend RUN ทั้งสองอันนี้ ต้องแยก Terminal และเปิดไว้ตลอด หากเปิดแยก ถ้าอยากเปิดรอบเดียวสองอัน พิมแค่ "npm run dev"
npm run dev -w apps/api #Backend RUN ทั้งสองอันนี้ ต้องแยก Terminal และเปิดไว้ตลอด หากเปิดแยก ถ้าอยากเปิดรอบเดียวสองอัน พิมแค่ "npm run dev"
```

## ตรวจสอบโค้ดและ build

```bash
npm run typecheck
npm run build
```

## ไฟล์ที่ไม่ควร commit

ไฟล์เหล่านี้ถูก ignore ด้วย `.gitignore`:

```text
node_modules/
dist/
.env
*.log
```

ตรวจสอบได้ด้วย:

```bash
git status
git check-ignore -v apps/api/.env
```

## บัญชีตัวอย่างจาก seed

- อีเมล: `admin@babebar.local`
- รหัสผ่าน: `Admin1234!` (ใช้เฉพาะ development และควรเปลี่ยนก่อนใช้งานจริง)

บัญชีแอดมิน
ควรเปลี่ยนหรือลบบัญชีตัวอย่างก่อนใช้งานจริง
