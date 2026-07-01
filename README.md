# UBE — Container Lock Verification System

ระบบตรวจสอบการล็อกคอนเทนเนอร์ด้วยภาพ (image classification) เพื่อยืนยันว่าคอนเทนเนอร์
ถูกล็อก **ครบทั้งสองด้าน** ก่อนออกจากพื้นที่ staging

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

## ฮาร์ดแวร์ (Camera setup)

สถานีจริงใช้ **กล้อง 2 ตัว** โดยแต่ละตัวเล็งไปที่ตัวล็อกของแต่ละด้าน
(กล้องด้าน A และ กล้องด้าน B) เพื่อให้เห็น latch ของด้านนั้น ๆ ชัดเจน
ตอน Verify ระบบจะจับภาพจากกล้องทั้งสองตัวพร้อมกัน แล้วส่งภาพของแต่ละด้าน
ไปประเมินแยกกัน (`imageA`, `imageB`) ก่อนสรุปผลรวม

## Flow การใช้งาน

1. **สถานีตรวจสอบ** (`/`) — เลือกแหล่งภาพของกล้องแต่ละด้าน (กล้อง / อัปโหลด / โหมด Demo)
   → วางคอนเทนเนอร์ให้กล้องทั้งสองเห็นตัวล็อก → กด **Verify**
2. ระบบแสดง loading (scan) แล้วคืนผลภายใน ~2–3 วินาที:
   - **ผลรวม:** `PASS` / `FAIL` / `UNCERTAIN`
   - **รายด้าน:** ด้าน A และ ด้าน B → `Locked` / `Unlocked` / `Not Visible` พร้อม confidence
3. หัวหน้างานสามารถ **แก้ไขผล (Supervisor Override)** ได้ โดยบันทึกแยกไว้เพื่อใช้ retraining
4. **ประวัติ & Dashboard** (`/history`) — สถิติรายวัน, ตารางค้นหา/กรอง (ผลลัพธ์, สถานี, ช่วงวันที่),
   ดูรายละเอียดรายการ, และ **ส่งออก CSV**

## จุดเชื่อมต่อ AI/Backend ในอนาคต (The single swap point)

ตรรกะการตรวจสอบทั้งหมดถูกแยกไว้ในฟังก์ชันเดียว:

```
src/lib/verifyContainer.ts  →  export async function verifyContainer(input): Promise<VerificationResult>
```

ฟังก์ชันรับภาพจากกล้องทั้งสองด้าน (`imageA`, `imageB`) และปัจจุบันคืนค่า **mock**
(สุ่มแบบถ่วงน้ำหนัก + หน่วงเวลาให้เหมือนประมวลผลจริง) เมื่อพร้อมเชื่อมต่อจริง
ให้แทนที่ **เฉพาะ body ของฟังก์ชันนี้** เช่น ส่ง `imageA`/`imageB` ไปยัง REST API,
zero-shot vision model หรือ rule-based latch-angle check — ส่วน UI ทั้งหมดไม่ต้องแก้
เพราะพึ่งพาเพียง type `VerificationResult` (ดู `src/types.ts`)

หลักการที่ฝังไว้ตาม spec: เมื่อ confidence ต่ำกว่าเกณฑ์ (`CONFIDENCE_THRESHOLD`)
ระบบจะคืน `Uncertain` และขอให้ตรวจซ้ำ แทนที่จะเสี่ยงคืน Pass ผิด ๆ
(ลดความเสี่ยง false "Locked")

## โครงสร้างโปรเจกต์

```
src/
  types.ts                     โครงสร้างข้อมูลกลาง (VerificationResult, Verdict, ฯลฯ)
  lib/
    verifyContainer.ts         ⭐ จุดสลับ mock → API จริง
    format.ts                  จัดรูปแบบวันเวลา/ป้ายกำกับ (Thai + คำทับศัพท์)
    csv.ts                     export CSV
    utils.ts                   cn()
  data/
    constants.ts               สถานี / พนักงาน / หัวหน้างาน (mock)
    session.tsx                context: สถานี + ผู้ตรวจ ปัจจุบัน
    store.tsx                  context: log store (localStorage) + override
    seed.ts                    สร้างประวัติตัวอย่างตอนเปิดครั้งแรก
  components/
    ui/                        shadcn primitives (button, card, dialog, select, ...)
    verify/                    หน้าจอสถานีตรวจสอบ (dual camera, result, override, latch graphic)
    history/                   Dashboard + ตาราง + สถิติ + รายละเอียด
    layout/Header.tsx          แถบบน + nav + ตัวเลือก session
  App.tsx                      providers + routing
```

## Language

UI เป็น **ภาษาไทยเป็นหลัก** และคงคำทับศัพท์ภาษาอังกฤษสำหรับคำเชิงเทคนิค
(`Verify`, `Pass/Fail`, `Locked/Unlocked`, `Not Visible`, `Override`) ตามธรรมเนียม
ซอฟต์แวร์ในที่ทำงานไทย

## หมายเหตุ POC

- ข้อมูล log เก็บใน `localStorage` (คีย์ `ube.logs.v1`) — มีปุ่ม "รีเซ็ตข้อมูลตัวอย่าง" ในหน้า Dashboard
- แต่ละกล้องใช้ webcam ผ่าน `getUserMedia` และมี fallback เป็นอัปโหลดรูป/โหมด Demo
  เมื่อไม่มีกล้องหรือไม่ได้รับอนุญาต (มีปุ่มลัด "เปิดกล้องทั้งคู่" / "Demo ทั้งคู่")
- โหมด Demo ใช้ภาพจำลอง latch (SVG) แยกรายด้าน โดยคันโยกจะพลิกขึ้น/สีเปลี่ยนตามผลตรวจ
  (Locked = พับราบสีเขียว, Unlocked = ยกขึ้นสีแดง) เพื่อสาธิตได้โดยไม่ต้องมีกล้อง
