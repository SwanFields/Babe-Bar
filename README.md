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
```

ห้าม commit ไฟล์ `.env` เพราะอาจมีรหัสผ่านและ secret ส่วน `apps/api/.env.example` สามารถ commit ได้

## เตรียม Prisma และข้อมูลตัวอย่าง

```bash
npm run db:generate
npm run db:push -w apps/api
npm run db:seed
```

- `db:generate` สร้าง Prisma Client
- `db:push` สร้างหรืออัปเดตตารางใน database
- `db:seed` เพิ่มโซน โต๊ะ โฮสต์ แพ็กเกจ และ admin ตัวอย่าง

## รันระบบสำหรับพัฒนา

```bash
npm run dev
```

เปิดเว็บที่ `http://localhost:5173` และ API ที่ `http://localhost:4000`

ถ้าต้องการรันแยก:

```bash
npm run dev -w apps/web
npm run dev -w apps/api
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
- รหัสผ่าน: `Admin1234!`

ควรเปลี่ยนหรือลบบัญชีตัวอย่างก่อนใช้งานจริง
