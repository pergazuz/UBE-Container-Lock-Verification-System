# UBE — Container Lock Verification System

ระบบตรวจสอบการล็อกคอนเทนเนอร์ด้วยภาพ (image classification) เพื่อยืนยันว่าคอนเทนเนอร์
ถูกล็อก **ครบทั้ง 4 ด้าน** ก่อนออกจากพื้นที่ staging

> **สถานะปัจจุบัน: Proof of Concept (POC) — Frontend เท่านั้น**
> เฟสนี้สร้างเฉพาะ UI/UX ให้ครบทั้ง flow โดยผลการตรวจเป็น **ข้อมูลจำลอง (mock)**
> ยังไม่มีการเชื่อมต่อ backend หรือโมเดล AI จริง โครงสร้างถูกออกแบบให้สลับไปใช้
> API/โมเดลจริงได้ในภายหลังโดยแก้ไขจุดเดียว (`verifyContainer()`) ไม่ต้องรื้อ UI

---

## Tech Stack

| ส่วน | เทคโนโลยี |
| --- | --- |
| Framework | React 19 + Vite 6 |
| Language | TypeScript |
| Runtime / PM | Bun |
| UI | shadcn/ui (new-york) + Radix primitives |
| Icons | lucide-react |
| Styling | Tailwind CSS v4 |
| Routing | react-router-dom v7 |
| Fonts | IBM Plex Sans Thai + IBM Plex Mono |

**Design direction:** industrial control-room "INSTRUMENT" HMI — ธีมมืดโทนเย็น,
สีหลักเป็น electric-azure (`#36c2ff`), สีสัญญาณ green PASS / red FAIL / amber Uncertain,
ตัวเลขเชิงเทคนิคเป็น monospace, reticle + scan-line เหมือนเทอร์มินัลตรวจสอบจริง
(palette เดียวกับโปรเจกต์ `pipe_counting`)

## การใช้งาน (Development)

```bash
bun install
bun run dev        # http://localhost:5173
```

คำสั่งอื่น ๆ:

```bash
bun run build      # typecheck (tsc -b) + production build
bun run preview    # เสิร์ฟไฟล์ที่ build แล้ว
bun run typecheck  # ตรวจ type อย่างเดียว
```

## การเข้าสู่ระบบ (Login)

ทุกการกระทำถูกบันทึกไว้กับบัญชีผู้ใช้ จึงต้องเข้าสู่ระบบก่อนใช้งานสถานี
บัญชีตัวอย่าง (POC seed — แสดงบนหน้า login ด้วย):

| Username | Password | บทบาท |
| --- | --- | --- |
| `somchai` / `kanokwan` / `apiwat` | `ube1234` | พนักงาน (Operator) |
| `wilaiporn` / `thanakorn` | `super1234` | หัวหน้างาน (Supervisor) |

หัวหน้างานจัดการบัญชีได้ที่หน้า **ผู้ใช้** (`/users`) — สร้างบัญชี, เปลี่ยนบทบาท,
รีเซ็ตรหัสผ่าน, ปิด/เปิดใช้งาน (ระบบบังคับให้เหลือหัวหน้างานที่ใช้งานได้อย่างน้อย 1 คนเสมอ)

## ฮาร์ดแวร์ (Camera setup)

สถานีจริงใช้ **กล้อง 4 ตัว** โดยแต่ละตัวเล็งไปที่ตัวล็อกของแต่ละด้าน
(ด้าน A, B, C, D) เพื่อให้เห็น latch ของด้านนั้น ๆ ชัดเจน
ตอน Verify ระบบจะจับภาพจากกล้องทั้ง 4 ตัวพร้อมกัน แล้วส่งภาพของแต่ละด้าน
ไปประเมินแยกกัน (`images.A`–`images.D`) ก่อนสรุปผลรวม
นอกจากนี้สถานีมี **เครื่องสแกน QR** (USB keyboard-wedge) สำหรับอ่านหมายเลขตู้

## Flow การใช้งาน

1. **เข้าสู่ระบบ** (`/login`) — ผู้ตรวจ/หัวหน้างานลงชื่อเข้าใช้ประจำสถานี
2. **สแกน QR Code** บนคอนเทนเนอร์ (บังคับ) — หมายเลขตู้ (Container ID) เป็น
   primary key ของทุกการตรวจ (POC มีปุ่มจำลองการสแกน; เครื่องสแกนจริงพิมพ์รหัส +
   Enter ลงช่องสแกนได้ทันที)
   - ถ้าสแกนตู้เดิมที่ผลล่าสุด **ไม่ผ่าน** ระบบจะขึ้นสถานะ **งานแก้ไข (Rework)**
     และบันทึกการตรวจครั้งนี้ใต้หมายเลขตู้เดียวกัน
3. **สถานีตรวจสอบ** (`/`) — กล้องด้าน A–D เล่นคลิปตัวอย่างจาก `public/videos`
   (เลือกคลิป "ล็อก / ไม่ล็อก" ได้จากเมนูของแต่ละกล้อง) คลิปเล่น **ครั้งเดียว**
   แล้วหยุดที่เฟรมสุดท้าย → เมื่อครบทั้ง 4 กล้อง กด **Verify**
   เพื่อตรวจเฟรมสุดท้ายจากกล้องทั้ง 4 ตัว
4. ระบบแสดง loading (scan) แล้วคืนผลภายใน ~2–3 วินาที:
   - **ผลรวม:** `PASS` / `FAIL` / `UNCERTAIN`
   - **รายด้าน:** ด้าน A–D → `Locked` / `Unlocked` / `Not Visible` พร้อม confidence
5. หัวหน้างานสามารถ **แก้ไขผล (Supervisor Override)** ได้ — ลงชื่อด้วยบัญชีที่
   เข้าสู่ระบบอยู่ (ปุ่มแก้ไขผลไม่แสดงสำหรับพนักงาน) — บันทึกแยกไว้เพื่อใช้ retraining
6. **ประวัติ & Dashboard** (`/history`) — สถิติรายวัน (รวมจำนวน Rework), ตาราง
   ค้นหา/กรอง (Container ID, ผลลัพธ์, ประเภทงาน, สถานี, ช่วงวันที่),
   ดูรายละเอียดรายการ (ภาพขยายได้), และ **ส่งออก Excel (.xlsx)**
7. **บันทึกเหตุการณ์ / User Log** (`/logs`) — เหตุการณ์การตรวจสอบ + เหตุการณ์ระบบ
   (เข้า/ออกระบบ, override, แก้ตั้งค่า, จัดการผู้ใช้) ในบันทึกเดียวแบบเรียงเวลา
   พนักงานเห็นเฉพาะเหตุการณ์การตรวจ ส่วนเหตุการณ์บัญชี/ระบบเห็นได้เฉพาะหัวหน้างาน
8. **ตั้งค่า** (`/settings`) — เกณฑ์ความมั่นใจ (confidence threshold), ชนิดคอนเทนเนอร์
   และการเปิด/ปิดสถานี — แก้ไขได้เฉพาะหัวหน้างาน (ทุกค่าเก็บใน localStorage
   และมีผลกับการทำงานจริง)

## จุดเชื่อมต่อ AI/Backend ในอนาคต (The single swap point)

ตรรกะการตรวจสอบทั้งหมดถูกแยกไว้ในฟังก์ชันเดียว:

```
src/lib/verifyContainer.ts  →  export async function verifyContainer(input): Promise<VerificationResult>
```

ฟังก์ชันรับหมายเลขตู้จาก QR (`containerId`), ประเภทงาน (`attempt`) และภาพจากกล้อง
ทั้ง 4 ด้าน (`images.A`–`images.D`) และปัจจุบันคืนค่า **mock** (สุ่มแบบถ่วงน้ำหนัก +
หน่วงเวลาให้เหมือนประมวลผลจริง — งาน Rework มีโอกาส Locked สูงขึ้นเพราะเพิ่งแก้ไข)
เมื่อพร้อมเชื่อมต่อจริง ให้แทนที่ **เฉพาะ body ของฟังก์ชันนี้** เช่น ส่งภาพไปยัง
REST API, zero-shot vision model หรือ rule-based latch-angle check —
ส่วน UI ทั้งหมดไม่ต้องแก้ เพราะพึ่งพาเพียง type `VerificationResult` (ดู `src/types.ts`)

หลักการที่ฝังไว้ตาม spec: เมื่อ confidence ต่ำกว่าเกณฑ์ (`CONFIDENCE_THRESHOLD`)
ระบบจะคืน `Uncertain` และขอให้ตรวจซ้ำ แทนที่จะเสี่ยงคืน Pass ผิด ๆ
(ลดความเสี่ยง false "Locked")

## โครงสร้างโปรเจกต์

```
src/
  types.ts                     โครงสร้างข้อมูลกลาง (VerificationResult, AppEvent, UserAccount, ฯลฯ)
  lib/
    verifyContainer.ts         ⭐ จุดสลับ mock → API จริง
    format.ts                  จัดรูปแบบวันเวลา/ป้ายกำกับ (Thai + คำทับศัพท์)
    excel.ts                   export Excel/.xlsx (ประวัติ + บันทึกเหตุการณ์)
    utils.ts                   cn()
  data/
    constants.ts               สถานี / พนักงาน seed / ชนิดคอนเทนเนอร์ (mock)
    auth.tsx                   context: บัญชีผู้ใช้ + login (localStorage, SHA-256)
    session.tsx                context: สถานีปัจจุบันของเทอร์มินัล
    settings.tsx               context: การตั้งค่าระบบ (localStorage)
    store.tsx                  context: log + event store (localStorage) + override
    seed.ts                    สร้างประวัติ + เหตุการณ์ตัวอย่างตอนเปิดครั้งแรก
  components/
    ui/                        shadcn primitives (button, card, dialog, select, switch, ...)
    auth/LoginView.tsx         หน้าเข้าสู่ระบบ
    verify/                    หน้าจอสถานีตรวจสอบ (QR scan, quad camera, result, override)
    history/                   Dashboard + ตาราง + สถิติ + รายละเอียด
    logs/LogsView.tsx          บันทึกเหตุการณ์ (User Log)
    users/UsersView.tsx        จัดการผู้ใช้ (หัวหน้างานเท่านั้น)
    settings/                  หน้าตั้งค่าระบบ
    layout/Header.tsx          แถบบน + nav + สถานี + ผู้ใช้ปัจจุบัน
    layout/RequireAuth.tsx     app shell + guard เส้นทางหลัง login
  App.tsx                      providers + routing
```

## Language

UI เป็น **ภาษาไทยเป็นหลัก** และคงคำทับศัพท์ภาษาอังกฤษสำหรับคำเชิงเทคนิค
(`Verify`, `Pass/Fail`, `Locked/Unlocked`, `Not Visible`, `Override`, `Rework`)
ตามธรรมเนียมซอฟต์แวร์ในที่ทำงานไทย

## หมายเหตุ POC

- ข้อมูลเก็บใน `localStorage`: ประวัติ (`ube.logs.v2`), บันทึกเหตุการณ์
  (`ube.events.v1`), บัญชีผู้ใช้ (`ube.users.v1`), session (`ube.auth.v1`),
  สถานี (`ube.station.v1`), ตั้งค่า (`ube.settings.v1`) —
  มีปุ่ม "รีเซ็ตข้อมูลตัวอย่าง" ในหน้า Dashboard/Settings
- รหัสผ่านเก็บเป็น SHA-256 hash ในเครื่อง (เพียงพอสำหรับ POC —
  ระบบจริงย้ายไป auth service ที่ใช้ argon2id)
- กล้องแต่ละด้านเล่นคลิปตัวอย่างจาก `public/videos` แทนกล้องจริงในเฟส POC —
  แต่ละคลิปมี ground truth (`finalStatus` ล็อก/ไม่ล็อก) กำกับไว้ใน
  `SAMPLE_VIDEOS` ทำให้ผล mock ตรงกับภาพที่เห็นจริง (deterministic)
  ตอนกด Verify ระบบจับเฟรมสุดท้ายของคลิป (ย่อขนาด ~640px) เป็นภาพที่ส่งเข้าตรวจสอบ
  เฟรมที่จับได้จะถูกเก็บลง log และแสดงในหน้าประวัติด้วย
- ช่องสแกน QR รองรับเครื่องสแกนจริงแบบ USB keyboard-wedge (พิมพ์รหัส + Enter)
  โดยไม่ต้องแก้โค้ด — ปุ่ม "จำลองสแกน" มีไว้สำหรับเดโมเท่านั้น
- เมื่อเชื่อมต่อกล้อง/แบ็กเอนด์จริง เพียงเปลี่ยนแหล่งวิดีโอเป็น RTSP/webcam จริง
  ส่วน flow การจับเฟรมและ `verifyContainer()` ใช้ซ้ำได้ทันที
