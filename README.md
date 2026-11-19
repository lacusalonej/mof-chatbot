# MOF PSDG AI Chatbot

ระบบ AI Assistant สำหรับตอบคำถามทั่วไปเกี่ยวกับกลุ่มพัฒนาระบบบริหาร กระทรวงการคลัง

โครงการนี้พัฒนาขึ้นใหม่ทั้งหมด (Greenfield Development) โดยไม่ใช่โค้ดหรือข้อมูลจากระบบเดิม

## สถานะโครงการ

| ส่วนประกอบ | สถานะ |
|-------------|--------|
| PROJECT CREATION | COMPLETE |
| FRONTEND | IN PROGRESS |
| BACKEND | IN PROGRESS |
| DATABASE | IN PROGRESS |
| AI ENGINE | NOT CONFIGURED |
| RAG | INCOMPLETE |
| KNOWLEDGE BASE | INCOMPLETE |
| ADMIN | IN PROGRESS |
| TRIAL LINK | INCOMPLETE |
| SECURITY | INCOMPLETE |
| TESTING | INCOMPLETE |
| LOCAL DEPLOYMENT | NOT READY |

## โครงสร้างโฟลเดอร์

```
mof-psdg-chatbot/
├── backend/           # Backend API (Python + FastAPI)
├── frontend/          # Frontend Chatbot + Admin Dashboard
├── docs/              # เอกสารโครงการ
├── knowledge-base/    # เอกสารความรู้ที่อัปโหลด
├── uploads/           # ไฟล์อัปโหลดต่างๆ
├── scripts/           # สคริปต์ช่วยเหลือ
├── config/            # ไฟล์กำหนดค่า
├── docker-compose.yml
└── README.md
```

## เทคโนโลยีที่เลือกใช้ (เบื้องต้น)

- **Backend**: Python 3.11 + FastAPI
- **Frontend**: HTML5 + CSS3 + JavaScript (Vanilla) — รองรับมือถือ
- **Database**: SQLite (สำหรับระบบ locaux) / PostgreSQL (สำหรับ production)
- **Vector Search**: ChromaDB (สำหรับ embeddings และ semantic search)
- **AI Provider**: รองรับหลายผู้ให้บริการ (OpenAI, Anthropic, Ollama, และอื่นๆ)
- **Document Processing**: PyPDF2, python-docx, pandas (สำหรับ PDF, DOCX, XLSX, CSV)

## การติดตั้งและรันระบบ

### ขั้นตอนที่ 1 — ติดตั้ง Python dependencies

```bash
cd backend
pip install -r requirements.txt
```

### ขั้นตอนที่ 2 — กำหนดค่าสภาพแวดล้อม

คัดลอกไฟล์ตัวอย่างและกรอกค่า:

```bash
cp .env.example .env
```

แก้ไขไฟล์ `.env` ตามความเหมาะสม โดยเฉพาะ API Key และ Secret Key

### ขั้นตอนที่ 3 — เริ่มฐานข้อมูล

```bash
python scripts/init_db.py
```

### ขั้นตอนที่ 4 — รัน Backend

```bash
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### ขั้นตอนที่ 5 — เปิด Frontend

เปิดไฟล์ `frontend/index.html` ในเบราว์เซอร์ หรือใช้เซิร์ฟเวอร์静静ไฟล์ใดๆ เช่น:

```bash
cd frontend
python -m http.server 3000
```

จากนั้นเปิด http://localhost:3000

## โหมดสาธิต (Demo Mode)

หากยังไม่มี API Key ระบบจะทำงานในโหมดสาธิต ซึ่งจะไม่เชื่อมต่อ AI จริง แต่สามารถทดสอบ Workflow ของระบบได้

## ความปลอดภัย

- API Key และ Secret ต้องเก็บในไฟล์ `.env` เท่านั้น
- ห้ามนำ `.env` ขึ้น Git repository
- ทุกรหัสผ่านต้องถูกแฮชก่อนจัดเก็บ
- มีระบบตรวจสอบสิทธิ์ (RBAC) สำหรับ Admin Dashboard

## เอกสารเพิ่มเติม

ดูในโฟลเดอร์ `docs/` สำหรับเอกสารรายละเอียดแต่ละส่วน

## หมายเหตุ

ระบบนี้ยังไม่ได้รับอนุญาตให้ Deploy หรือเปิด Tunnel สู่อินเทอร์เน็ต ต้องได้รับอนุญาตก่อนการเผยแพร่ทุกกรณี