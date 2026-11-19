"""สคริปต์เริ่มต้นฐานข้อมูลและสร้างบัญชี Admin คนแรก

การใช้งาน:
    python scripts/init_db.py

สคริปต์นี้จะ:
1. สร้างตารางทั้งหมดในฐานข้อมูล
2. สร้างบัญชี Super Admin คนแรก (หากยังไม่มี)
3. แสดงข้อมูลบัญชีที่สร้างขึ้น
"""

import sys
import os

# เพิ่ม path เพื่อให้ import โมดูลในโปรเจกต์ได้
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.database import SessionLocal, engine, Base
from app.models.user import User
from app.core.config import settings
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def init_db():
    # สร้างตารางทั้งหมด
    Base.metadata.create_all(bind=engine)
    print("[OK] สร้างตารางฐานข้อมูลเรียบร้อยแล้ว")

    db = SessionLocal()
    try:
        # ตรวจสอบว่ามีผู้ใช้อยู่แล้วหรือไม่
        existing_user = db.query(User).first()
        if existing_user:
            print(f"[INFO] พบผู้ใช้อยู่แล้วในระบบ: {existing_user.username}")
            return

        # สร้างบัญชี Super Admin คนแรก
        admin_username = input("กรุณาระบุชื่อผู้ใช้ Admin คนแรก: ").strip() or "admin"
        admin_email = input("กรุณาระบุอีเมล Admin: ").strip() or "admin@mof.go.th"
        admin_password = input("กรุณาระบุรหัสผ่าน Admin: ").strip()
        if not admin_password:
            admin_password = "Admin@12345"
            print(f"[WARNING] ไม่ได้ระบุรหัสผ่าน ใช้ค่าเริ่มต้น: {admin_password}")
            print("[WARNING] ควรเปลี่ยนรหัสผ่านทันทีหลังจากเข้าสู่ระบบครั้งแรก")

        admin_full_name = input("กรุณาระบุชื่อ-นามสกุล: ").strip() or "ระบบผู้ดูแล"

        hashed_password = hash_password(admin_password)

        admin_user = User(
            username=admin_username,
            email=admin_email,
            hashed_password=hashed_password,
            full_name=admin_full_name,
            role="super_admin",
            is_active=True,
            is_locked=False,
        )

        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)

        print("\n" + "=" * 50)
        print("[SUCCESS] สร้างบัญชี Super Admin เรียบร้อยแล้ว")
        print(f"  ชื่อผู้ใช้: {admin_user.username}")
        print(f"  อีเมล: {admin_user.email}")
        print(f"  สิทธิ์: {admin_user.role}")
        print(f"  รหัสผ่าน: {admin_password}")
        print("=" * 50)
        print("\n[หมายเหตุ] กรอกข้อมูลนี้เพื่อเข้าสู่ระบบ Admin Dashboard ครั้งแรก")
        print("[คำเตือน] เปลี่ยนรหัสผ่านทันทีหลังจากล็อกอิน และอย่าแชร์ให้ผู้อื่นทราบ\n")

    finally:
        db.close()


if __name__ == "__main__":
    init_db()