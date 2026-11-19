"""Trial Link API routes — ลิงก์สำหรับทดลองใช้งาน Chatbot."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, timedelta

from app.db.database import get_db
from app.models.user import User
from app.models.trial_link import TrialLink
from app.core.security import generate_secure_token, hash_token
from app.api.auth import get_current_user, require_admin

router = APIRouter(prefix="/api/trial", tags=["trial-links"])


@router.post("/links")
async def create_trial_link(
    name: Optional[str] = None,
    expiry_days: Optional[int] = None,
    max_usages: Optional[int] = None,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """สร้างลิงก์ทดลองใช้งานใหม่"""
    from app.core.config import settings

    expiry_days = expiry_days or settings.TRIAL_LINK_DEFAULT_EXPIRY_DAYS
    max_usages = max_usages or settings.TRIAL_LINK_MAX_USAGES

    # สร้าง token แบบ secure random
    raw_token = generate_secure_token()
    hashed_token = hash_token(raw_token)

    expires_at = datetime.utcnow() + timedelta(days=expiry_days)

    trial_link = TrialLink(
        token=hashed_token,
        name=name,
        created_by=current_user.id,
        expires_at=expires_at,
        max_usages=max_usages,
        usage_count=0,
        is_active=True,
        is_indexed=False,  # ป้องกัน search engine indexing
    )

    db.add(trial_link)
    db.commit()
    db.refresh(trial_link)

    # สร้าง URL สำหรับแชร์ (ตัวอย่าง)
    trial_url = f"{'http://localhost:3000'}?trial={raw_token}"

    return {
        "message": "สร้างลิงก์ทดลองเรียบร้อยแล้ว",
        "trial_link": {
            "id": trial_link.id,
            "name": trial_link.name,
            "token": raw_token,  # ส่ง raw token เฉพาะตอนสร้างเท่านั้น
            "trial_url": trial_url,
            "expires_at": trial_link.expires_at.isoformat(),
            "max_usages": trial_link.max_usages,
            "is_active": trial_link.is_active,
        },
        "warning": "กรุณาคัดลอก token ไว้ใช้งาน จะไม่สามารถดู token แบบ plain text ได้อีกครั้งหลังจากนี้",
    }


@router.get("/links")
async def list_trial_links(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """ดึงรายการลิงก์ทดลองทั้งหมด"""
    links = db.query(TrialLink).order_by(TrialLink.created_at.desc()).all()
    return {
        "trial_links": [
            {
                "id": link.id,
                "name": link.name,
                "token_preview": link.token[:8] + "..." if link.token else "",
                "expires_at": link.expires_at.isoformat(),
                "max_usages": link.max_usages,
                "usage_count": link.usage_count,
                "is_active": link.is_active,
                "is_indexed": link.is_indexed,
                "created_at": link.created_at.isoformat(),
            }
            for link in links
        ],
    }


@router.post("/links/{link_id}/revoke")
async def revoke_trial_link(
    link_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """ยกเลิกลิงก์ทดลอง"""
    link = db.query(TrialLink).filter(TrialLink.id == link_id).first()
    if not link:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="ไม่พบลิงก์นี้",
        )

    link.is_active = False
    db.commit()

    return {"message": "ยกเลิกลิงก์ทดลองเรียบร้อยแล้ว"}


@router.get("/validate/{token}")
async def validate_trial_token(
    token: str,
    db: Session = Depends(get_db),
):
    """ตรวจสอบว่า trial token ถูกต้องหรือไม่ (ใช้สำหรับ frontend)"""
    from app.core.security import verify_token

    links = db.query(TrialLink).filter(TrialLink.is_active == True).all()

    for link in links:
        if verify_token(token, link.token):
            # ตรวจสอบวันหมดอายุ
            if link.expires_at < datetime.utcnow():
                return {"valid": False, "reason": "ลิงก์หมดอายุแล้ว"}

            # ตรวจสอบจำนวนการใช้งาน
            if link.usage_count >= link.max_usages:
                return {"valid": False, "reason": "เกินจำนวนการใช้งานสูงสุดแล้ว"}

            return {
                "valid": True,
                "link_id": link.id,
                "name": link.name,
            }

    return {"valid": False, "reason": "ไม่พบลิงก์หรือไม่ถูกต้อง"}