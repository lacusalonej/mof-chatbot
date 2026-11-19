"""Authentication API routes — การยืนยันตัวตนและการจัดการเซสชัน."""

from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Request, Form
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    decode_access_token,
    ACCESS_TOKEN_EXPIRE_MINUTES,
)
from app.core.config import settings
from app.db.database import SessionLocal, get_db
from app.models.user import User
from app.models.session import UserSession
from app.models.audit_log import AuditLog

router = APIRouter(prefix="/api/auth", tags=["authentication"])


def get_current_user(
    request: Request, db: Session = Depends(get_db)
) -> User:
    """ดึงข้อมูลผู้ใช้ปัจจุบันจาก JWT token ใน header หรือ cookie"""
    authorization = request.headers.get("Authorization")
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="ไม่พบการยืนยันตัวตน",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = authorization.split(" ")[1]
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token ไม่ถูกต้องหรือหมดอายุ",
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token ไม่มีข้อมูลผู้ใช้",
        )

    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="ผู้ใช้งานไม่存在หรือถูกระงับการใช้งาน",
        )

    return user


@router.post("/login")
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    request: Request = None,
    db: Session = Depends(get_db),
):
    """เข้าสู่ระบบด้วยชื่อผู้ใช้และรหัสผ่าน"""
    user = db.query(User).filter(User.username == form_data.username).first()

    if not user or not verify_password(form_data.password, user.hashed_password):
        # บันทึกความพยายามล็อกอินที่ล้มเหลว
        if user:
            user.failed_login_attempts += 1
            if user.failed_login_attempts >= settings.MAX_LOGIN_ATTEMPTS:
                user.is_locked = True
                user.locked_until = datetime.utcnow() + timedelta(
                    minutes=settings.ACCOUNT_LOCKOUT_MINUTES
                )
            db.commit()

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง",
        )

    if user.is_locked:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="บัญชีถูกระงับการใช้งานชั่วคราว กรุณาลองใหม่ภายหลัง",
        )

    # รีเซ็ตตัวนับความล้มเหลวและอัปเดตเวลาล็อกอินล่าสุด
    user.failed_login_attempts = 0
    user.last_login_at = datetime.utcnow()
    db.commit()

    # สร้าง access token
    access_token = create_access_token(
        data={"sub": str(user.id), "username": user.username, "role": user.role},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )

    # สร้างเซสชัน
    session_token = create_access_token(
        data={"sub": str(user.id), "type": "session"},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )

    db_session = UserSession(
        user_id=user.id,
        session_token=session_token,
        expires_at=datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
        is_active=True,
    )
    db.add(db_session)

    # บันทึก audit log
    audit = AuditLog(
        user_id=user.id,
        action="login",
        resource_type="user",
        resource_id=user.id,
        ip_address=request.client.host if request and request.client else None,
        user_agent=request.headers.get("user-agent") if request else None,
    )
    db.add(audit)
    db.commit()

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
        },
    }


@router.post("/logout")
async def logout(
    current_user: User = Depends(get_current_user),
    request: Request = None,
    db: Session = Depends(get_db),
):
    """ออกจากระบบ"""
    # บันทึก audit log
    audit = AuditLog(
        user_id=current_user.id,
        action="logout",
        resource_type="user",
        resource_id=current_user.id,
        ip_address=request.client.host if request and request.client else None,
        user_agent=request.headers.get("user-agent") if request else None,
    )
    db.add(audit)
    db.commit()

    return {"message": "ออกจากระบบเรียบร้อยแล้ว"}


@router.get("/me")
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """ดึงข้อมูลผู้ใช้ที่ล็อกอินอยู่"""
    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role,
        "is_active": current_user.is_active,
    }


@router.post("/register")
async def register_first_admin(
    username: str = Form(...),
    email: str = Form(...),
    password: str = Form(...),
    full_name: str = Form(...),
    db: Session = Depends(get_db),
):
    """สร้างบัญชี Super Admin คนแรก (ใช้เฉพาะตอนเริ่มต้นระบบครั้งแรก)

    หากมีผู้ใช้อยู่แล้วในระบบจะไม่สามารถสร้างบัญชีใหม่ผ่าน endpoint นี้
    """
    existing_user = db.query(User).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="ระบบมีผู้ใช้อยู่แล้ว ไม่สามารถสร้างบัญชีแรกผ่าน API นี้",
        )

    # ตรวจสอบชื่อผู้ใช้ซ้ำ
    if db.query(User).filter(User.username == username).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="ชื่อผู้ใช้นี้มีอยู่แล้ว",
        )

    if db.query(User).filter(User.email == email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="อีเมลนี้มีอยู่แล้ว",
        )

    hashed_password = hash_password(password)

    admin_user = User(
        username=username,
        email=email,
        hashed_password=hashed_password,
        full_name=full_name,
        role="super_admin",
        is_active=True,
        is_locked=False,
    )

    db.add(admin_user)
    db.commit()
    db.refresh(admin_user)

    return {
        "message": "สร้างบัญชี Super Admin เรียบร้อยแล้ว",
        "user": {
            "id": admin_user.id,
            "username": admin_user.username,
            "email": admin_user.email,
            "role": admin_user.role,
        },
    }


# Dependency สำหรับตรวจสอบสิทธิ์ admin
def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """ตรวจสอบว่าผู้ใช้มีสิทธิ์ admin หรือไม่"""
    if current_user.role not in ("super_admin", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="ไม่มีสิทธิ์เข้าถึงฟังก์ชันนี้",
        )
    return current_user


# Dependency สำหรับตรวจสอบสิทธิ์ editor ขึ้นไป
def require_editor(current_user: User = Depends(get_current_user)) -> User:
    """ตรวจสอบว่าผู้ใช้มีสิทธิ์ editor หรือไม่"""
    if current_user.role not in ("super_admin", "admin", "editor"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="ไม่มีสิทธิ์แก้ไขข้อมูล",
        )
    return current_user