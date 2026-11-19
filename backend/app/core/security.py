"""Security utilities — การแฮชรหัสผ่าน, JWT tokens, และการเข้ารหัส.

ทุกการจัดการความลับต้องทำผ่าน environment variables เท่านั้น
ห้ามเขียน secret ลงใน source code โดยตรง
"""

import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional, Union

import bcrypt
from jose import JWTError, jwt

from app.core.config import settings

# JWT settings
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = settings.SESSION_TIMEOUT_MINUTES


def hash_password(password: str) -> str:
    """แฮชรหัสผ่านด้วย bcrypt"""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """ตรวจสอบรหัสผ่านว่าตรงกับแฮชหรือไม่"""
    return bcrypt.checkpw(
        plain_password.encode("utf-8"), hashed_password.encode("utf-8")
    )


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """สร้าง JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=ACCESS_TOKEN_EXPIRE_MINUTES
        )
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> Optional[dict]:
    """ถอดรหัส JWT access token และคืนค่าข้อมูลผู้ใช้"""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None


def generate_secure_token(length: int = 32) -> str:
    """สร้าง token แบบ secure random สำหรับ trial links ฯลฯ"""
    return secrets.token_urlsafe(length)


def hash_token(token: str) -> str:
    """แฮช token ก่อนจัดเก็บในฐานข้อมูล"""
    return bcrypt.hashpw(token.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_token(plain_token: str, hashed_token: str) -> bool:
    """ตรวจสอบ token ว่าตรงกับแฮชหรือไม่"""
    return bcrypt.checkpw(
        plain_token.encode("utf-8"), hashed_token.encode("utf-8")
    )