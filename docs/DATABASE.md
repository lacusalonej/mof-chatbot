# ฐานข้อมูล — MOF PSDG AI Chatbot

เอกสารนี้อธิบายโครงสร้างฐานข้อมูลของระบบ Chatbot

## ภาพรวม

ระบบใช้ฐานข้อมูลแบบ Relational (SQLite สำหรับระบบ locaux, PostgreSQL สำหรับ production) ผ่าน SQLAlchemy ORM

## ตารางในฐานข้อมูล

### 1. users — ผู้ใช้ระบบ

| คอลัมน์ | ชนิดข้อมูล | คำอธิบาย |
|---------|-----------|----------|
| id | Integer (PK) | รหัสผู้ใช้ |
| username | String(50) | ชื่อผู้ใช้ (unique) |
| email | String(100) | อีเมล (unique) |
| hashed_password | String(255) | รหัสผ่านที่แฮชแล้ว |
| full_name | String(100) | ชื่อ-นามสกุล |
| role | String(20) | สิทธิ์: super_admin, admin, editor, viewer |
| is_active | Boolean | สถานะการใช้งาน |
| is_locked | Boolean | ถูกล็อกบัญชีหรือไม่ |
| failed_login_attempts | Integer | จำนวนครั้งที่ล็อกอินผิด |
| locked_until | DateTime | เวลาที่ปลดล็อก |
| last_login_at | DateTime | เวลาล็อกอินล่าสุด |
| created_at | DateTime | วันที่สร้าง |
| updated_at | DateTime | วันที่แก้ไขล่าสุด |

### 2. user_sessions — เซสชันผู้ใช้

| คอลัมน์ | ชนิดข้อมูล | คำอธิบาย |
|---------|-----------|----------|
| id | Integer (PK) | รหัสเซสชัน |
| user_id | Integer (FK) | อ้างอิง users |
| session_token | String(255) | โทเค็นเซสชัน (unique) |
| expires_at | DateTime | เวลาหมดอายุ |
| is_active | Boolean | สถานะเซสชัน |

### 3. documents — เอกสารในฐานความรู้

| คอลัมน์ | ชนิดข้อมูล | คำอธิบาย |
|---------|-----------|----------|
| id | Integer (PK) | รหัสเอกสาร |
| document_id | String(50) | รหัสเอกสารเฉพาะ (เช่น DOC-ABCD1234) |
| title | String(255) | ชื่อเอกสาร |
| organization | String(100) | หน่วยงานเจ้าของเอกสาร |
| category | String(100) | หมวดหมู่ความรู้ |
| document_number | String(100) | เลขที่เอกสาร |
| publish_date | DateTime | วันที่เผยแพร่ |
| effective_date | DateTime | วันที่มีผลบังคับใช้ |
| fiscal_year | String(10) | ปีงบประมาณ |
| source_url | String(500) | URL ต้นทาง |
| file_type | String(20) | นามสกุลไฟล์ |
| file_path | String(500) | เส้นทางไฟล์ในระบบ |
| page_count | Integer | จำนวนหน้า |
| version | String(20) | เวอร์ชันเอกสาร |
| access_classification | String(20) | การจำแนก: PUBLIC / INTERNAL |
| processing_status | String(20) | สถานะ: pending / completed / failed |
| chunk_count | Integer | จำนวนชิ้นข้อความ |
| error_message | Text | ข้อความข้อผิดพลาด (ถ้ามี) |
| created_at | DateTime | วันที่นำเข้า |
| updated_at | DateTime | วันที่แก้ไขล่าสุด |

### 4. document_chunks — ชิ้นข้อความของเอกสาร

| คอลัมน์ | ชนิดข้อมูล | คำอธิบาย |
|---------|-----------|----------|
| id | Integer (PK) | รหัสชิ้นข้อความ |
| document_id | Integer (FK) | อ้างอิง documents |
| chunk_index | Integer | ลำดับชิ้นข้อความ |
| content | Text | เนื้อหาข้อความ |
| content_hash | String(64) | รหัสแฮชสำหรับตรวจสอบไฟล์ซ้ำ |
| page_number | Integer | หมายเลขหน้า |
| vector_id | String(100) | รหัสใน ChromaDB |

### 5. conversations — บทสนทนา

| คอลัมน์ | ชนิดข้อมูล | คำอธิบาย |
|---------|-----------|----------|
| id | Integer (PK) | รหัสบทสนทนา |
| session_id | String(100) | รหัสเซสชันสนทนา (unique) |
| user_type | String(20) | ประเภท: public / trial / admin |
| trial_link_id | Integer | อ้างอิง trial_links (ถ้าใช้ผ่านลิงก์ทดลอง) |
| title | String(255) | ชื่อบทสนทนา |
| is_active | Boolean | สถานะ |

### 6. messages — ข้อความในบทสนทนา

| คอลัมน์ | ชนิดข้อมูล | คำอธิบาย |
|---------|-----------|----------|
| id | Integer (PK) | รหัสข้อความ |
| conversation_id | Integer (FK) | อ้างอิง conversations |
| role | String(20) | user / assistant / system |
| content | Text | เนื้อหาข้อความ |
| citations | Text | JSON ของแหล่งอ้างอิง |
| response_time_ms | Integer | เวลาตอบสนอง (มิลลิวินาที) |
| token_count | Integer | จำนวนโทเค็น |
| created_at | DateTime | เวลาส่ง |

### 7. trial_links — ลิงก์ทดลองใช้งาน

| คอลัมน์ | ชนิดข้อมูล | คำอธิบาย |
|---------|-----------|----------|
| id | Integer (PK) | รหัสลิงก์ |
| token | String(100) | โทเค็น (แฮชแล้ว, unique) |
| name | String(100) | ชื่อลิงก์ |
| created_by | Integer (FK) | ผู้สร้าง (อ้างอิง users) |
| expires_at | DateTime | วันที่หมดอายุ |
| max_usages | Integer | จำนวนครั้งสูงสุดที่ใช้ได้ |
| usage_count | Integer | จำนวนครั้งที่ใช้ไปแล้ว |
| is_active | Boolean | สถานะการใช้งาน |
| is_indexed | Boolean | อนุญาตให้ search engine จัดทำดัชนีหรือไม่ |

### 8. website_sources — แหล่งข้อมูลเว็บไซต์

| คอลัมน์ | ชนิดข้อมูล | คำอธิบาย |
|---------|-----------|----------|
| id | Integer (PK) | รหัสเว็บไซต์ |
| url | String(500) | URL (unique) |
| domain | String(100) | โดเมน |
| is_allowed | Boolean | อนุญาตหรือไม่ (ต้องอยู่ใน allowlist) |
| last_crawled_at | DateTime | วันที่ Crawl ล่าสุด |
| crawl_status | String(20) | สถานะ: pending / completed / failed |
| page_count | Integer | จำนวนหน้าที่ Crawl ได้ |
| check_interval_hours | Integer | ระยะเวลาตรวจสอบใหม่ (ชั่วโมง) |

### 9. audit_logs — บันทึกการกระทำสำคัญ

| คอลัมน์ | ชนิดข้อมูล | คำอธิบาย |
|---------|-----------|----------|
| id | Integer (PK) | รหัสlog |
| user_id | Integer (FK) | ผู้ใช้ที่กระทำ (อ้างอิง users) |
| action | String(100) | การกระทำ (login, logout, upload, delete ฯลฯ) |
| resource_type | String(50) | ประเภททรัพยากร |
| resource_id | Integer | รหัสทรัพยากร |
| details | Text | รายละเอียด (JSON) |
| ip_address | String(45) | IP Address |
| user_agent | String(500) | User Agent |
| created_at | DateTime | เวลาที่เกิดเหตุการณ์ |

## การเริ่มต้นฐานข้อมูล

```bash
cd backend
python scripts/init_db.py
```

สคริปต์นี้จะสร้างตารางทั้งหมดและสร้างบัญชี Super Admin คนแรก

## การจำแนกความลับของเอกสาร

- **PUBLIC**: เผยแพร่สาธารณะ สามารถตอบผู้ใช้ทั่วไปได้
- **INTERNAL**: เฉพาะภายในหน่วยงาน ไม่ควรนำมาใช้ตอบผู้ใช้สาธารณะ

เอกสารที่มีการจำแนกเป็น INTERNAL ต้องมีสิทธิ์ editor ขึ้นไปจึงจะเข้าถึงได้ผ่าน API