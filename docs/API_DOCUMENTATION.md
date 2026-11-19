# API Documentation — MOF PSDG AI Chatbot

เอกสารนี้อธิบาย API endpoints ทั้งหมดของระบบ Chatbot

## Base URL

```
http://localhost:8000
```

## Authentication

ส่วนใหญ่ของ API ต้องการการยืนยันตัวตนด้วย JWT Bearer Token

```
Authorization: Bearer <access_token>
```

## Endpoints

### Health Check

#### GET /health
ตรวจสอบสถานะระบบ

**Response:**
```json
{
  "status": "healthy",
  "app": "MOF PSDG AI Chatbot",
  "version": "1.0.0",
  "database": "connected",
  "ai_provider": "demo"
}
```

---

### Authentication API

#### POST /api/auth/login
เข้าสู่ระบบ

**Request Body (form-encoded):**
```
username: string
password: string
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 3600,
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@mof.go.th",
    "full_name": "ผู้ดูแลระบบ",
    "role": "super_admin"
  }
}
```

#### POST /api/auth/logout
ออกจากระบบ

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{ "message": "ออกจากระบบเรียบร้อยแล้ว" }
```

#### GET /api/auth/me
ดึงข้อมูลผู้ใช้ปัจจุบัน

**Headers:** `Authorization: Bearer <token>`

#### POST /api/auth/register
สร้างบัญชี Super Admin คนแรก (ใช้ครั้งแรกเท่านั้น)

**Request Body:**
```json
{
  "username": "string",
  "email": "string",
  "password": "string",
  "full_name": "string"
}
```

---

### Chat API

#### POST /api/chat/conversation
สร้างบทสนทนาใหม่

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "conversation_id": 1,
  "session_id": "uuid-string"
}
```

#### POST /api/chat/message
ส่งข้อความและรับคำตอบจาก AI

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "message": "ภารกิจของกลุ่มพัฒนาระบบบริหารคืออะไร",
  "conversation_id": 1
}
```

**Response:**
```json
{
  "response": "กลุ่มพัฒนาระบบบริหารมีภารกิจดังนี้...",
  "conversation_id": 1,
  "session_id": "uuid-string",
  "citations": [
    {
      "document_title": "คู่มือการปฏิบัติงาน",
      "organization": "กลุ่มพัฒนาระบบบริหาร กระทรวงการคลัง",
      "page_number": 5,
      "excerpt": "..."
    }
  ],
  "ai_provider": "demo"
}
```

#### GET /api/chat/conversation/{id}
ดึงข้อมูลบทสนทนาและข้อความทั้งหมด

**Headers:** `Authorization: Bearer <token>`

---

### Document API

#### POST /api/documents/upload
อัปโหลดเอกสารเข้าฐานความรู้

**Headers:** `Authorization: Bearer <token>` (สิทธิ์ editor ขึ้นไป)

**Request Body (multipart/form-data):**
```
file: binary (pdf, docx, doc, xlsx, csv, txt, md, html)
title: string (optional)
category: string (optional)
classification: "PUBLIC" | "INTERNAL"
```

#### GET /api/documents
ดึงรายการเอกสารทั้งหมด

**Headers:** `Authorization: Bearer <token>`

#### GET /api/documents/{id}
ดึงรายละเอียดเอกสาร

**Headers:** `Authorization: Bearer <token>`

#### DELETE /api/documents/{id}
ลบเอกสาร

**Headers:** `Authorization: Bearer <token>` (สิทธิ์ editor ขึ้นไป)

---

### Admin API

#### GET /api/admin/stats
สถิติภาพรวมระบบ

**Headers:** `Authorization: Bearer <token>` (สิทธิ์ admin ขึ้นไป)

**Response:**
```json
{
  "document_count": 10,
  "active_document_count": 8,
  "pending_document_count": 1,
  "error_document_count": 1,
  "chat_count": 50,
  "session_count": 25
}
```

#### GET /api/admin/users
รายการผู้ใช้ทั้งหมด

#### GET /api/admin/audit-logs
ประวัติการใช้งานระบบ

#### GET /api/admin/system-status
สถานะระบบย่อยต่างๆ

---

### Trial Link API

#### POST /api/trial/links
สร้างลิงก์ทดลองใช้งาน

**Headers:** `Authorization: Bearer <token>` (สิทธิ์ admin ขึ้นไป)

**Request Body:**
```json
{
  "name": "ลิงก์ทดลองสำหรับหน่วยงานภายนอก",
  "expiry_days": 7,
  "max_usages": 100
}
```

**Response:**
```json
{
  "trial_link": {
    "id": 1,
    "name": "ลิงก์ทดลองสำหรับหน่วยงานภายนอก",
    "token": "abc123xyz789",
    "trial_url": "http://localhost:3000?trial=abc123xyz789",
    "expires_at": "2026-11-25T17:00:00",
    "max_usages": 100,
    "is_active": true
  }
}
```

#### GET /api/trial/links
รายการลิงก์ทดลองทั้งหมด

#### POST /api/trial/links/{id}/revoke
ยกเลิกลิงก์ทดลอง

#### GET /api/trial/validate/{token}
ตรวจสอบว่า token ถูกต้องหรือไม่ (ใช้สำหรับ frontend ไม่ต้อง authenticate)

---

### Website Source API

#### POST /api/websites
เพิ่มเว็บไซต์แหล่งข้อมูล (ต้องอยู่ใน allowlist)

**Headers:** `Authorization: Bearer <token>` (สิทธิ์ editor ขึ้นไป)

**Request Body:**
```json
{
  "url": "https://psdg.mof.go.th/",
  "check_interval_hours": 24
}
```

#### GET /api/websites
รายการเว็บไซต์แหล่งข้อมูลทั้งหมด

#### DELETE /api/websites/{id}
ลบเว็บไซต์แหล่งข้อมูล

---

### Error Responses

ทุก endpoint สามารถคืนค่าข้อผิดพลาดในรูปแบบ:

```json
{
  "detail": "คำอธิบายข้อผิดพลาดเป็นภาษาไทย"
}
```

รหัสสถานะ HTTP ที่ใช้บ่อย:
- `200` — สำเร็จ
- `400` — คำขอไม่ถูกต้อง
- `401` — ไม่ได้ยืนยันตัวตน
- `403` — ไม่มีสิทธิ์เข้าถึง
- `404` — ไม่พบข้อมูล
- `413` — ไฟล์ใหญ่เกินไป
- `500` — ข้อผิดพลาดภายในเซิร์ฟเวอร์