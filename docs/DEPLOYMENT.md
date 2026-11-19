# การติดตั้งและปรับใช้ระบบ — MOF PSDG AI Chatbot

เอกสารนี้อธิบายขั้นตอนการติดตั้งและรันระบบในสภาพแวดล้อม locaux

## ข้อกำหนดของระบบ

- Python 3.11 ขึ้นไป
- pip (Python package manager)
- เว็บเบราว์เซอร์ที่ทันสมัย
- หน่วยความจำขั้นต่ำ 4 GB (แนะนำ 8 GB สำหรับการประมวลผลเอกสารจำนวนมาก)

## ขั้นตอนการติดตั้ง

### ขั้นตอนที่ 1 — ดาวน์โหลดหรือ Clone โปรเจกต์

โปรเจกต์อยู่ที่: `D:\Chatbot mof new\mof-psdg-chatbot`

### ขั้นตอนที่ 2 — ติดตั้ง Python dependencies

```bash
cd D:\Chatbot mof new\mof-psdg-chatbot\backend
pip install -r requirements.txt
```

### ขั้นตอนที่ 3 — กำหนดค่าสภาพแวดล้อม

```bash
cd D:\Chatbot mof new\mof-psdg-chatbot
copy .env.example .env
```

แก้ไขไฟล์ `.env` ด้วยตัวแก้ไขข้อความ ตั้งค่าต่อไปนี้อย่างน้อย:
- `SECRET_KEY`: สตริงสุ่มสำหรับการเข้ารหัส (เปลี่ยนจากค่าเริ่มต้น)
- `AI_PROVIDER`: เลือก `demo` หากยังไม่มี API Key, หรือ `openai`/`anthropic`/`ollama` หากมี

### ขั้นตอนที่ 4 — เริ่มต้นฐานข้อมูลและสร้างบัญชี Admin

```bash
cd backend
python scripts/init_db.py
```

สคริปต์จะสร้างตารางฐานข้อมูลและขอข้อมูลสำหรับบัญชี Super Admin คนแรก

### ขั้นตอนที่ 5 — รัน Backend server

```bash
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend จะทำงานที่ http://localhost:8000

### ขั้นตอนที่ 6 — เปิด Frontend

เปิดไฟล์ `D:\Chatbot mof new\mof-psdg-chatbot\frontend\index.html` ในเบราว์เซอร์

หรือใช้เซิร์ฟเวอร์ไฟล์ง่ายๆ:
```bash
cd frontend
python -m http.server 3000
```
จากนั้นเปิด http://localhost:3000

## การรันด้วย Docker (ทางเลือก)

```bash
cd D:\Chatbot mof new\mof-psdg-chatbot
docker-compose up -d
```

## การตรวจสอบว่าระบบทำงานปกติ

เปิด http://localhost:8000/health ในเบราว์เซอร์ ควรเห็นข้อความตอบกลับดังนี้:

```json
{
  "status": "healthy",
  "app": "MOF PSDG AI Chatbot",
  "version": "1.0.0",
  "database": "connected",
  "ai_provider": "demo"
}
```

## โหมดสาธิต (Demo Mode)

หากไม่ได้ตั้งค่า API Key ระบบจะทำงานในโหมดสาธิต:
- ไม่เชื่อมต่อ AI จริง
- สามารถทดสอบ Workflow ของระบบได้ทั้งหมด
- คำตอบจะเป็นข้อความแจ้งว่าอยู่ในโหมดสาธิต

## ข้อควรระวัง

1. ระบบนี้ยังไม่ได้รับอนุญาตให้ Deploy หรือเปิด Tunnel สู่อินเทอร์เน็ต
2. ต้องได้รับอนุญาตก่อนการเผยแพร่ทุกกรณี
3. API Key ต้องเก็บเป็นความลับ ไม่เผยแพร่ต่อสาธารณะ
4. ไม่ควรใช้รหัสผ่านเริ่มต้นในระบบจริง