"""Website Source API routes — การจัดการแหล่งข้อมูลจากเว็บไซต์."""

from fastapi import APIRouter, Body, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime

from app.db.database import get_db
from app.models.user import User
from app.models.website_source import WebsiteSource
from app.api.auth import get_current_user, require_editor

router = APIRouter(prefix="/api/websites", tags=["website-sources"])


@router.post("")
async def add_website_source(
    url: str = Body(...),
    check_interval_hours: Optional[int] = Body(24),
    current_user: User = Depends(require_editor),
    db: Session = Depends(get_db),
):
    """เพิ่มเว็บไซต์แหล่งข้อมูล (ต้องอยู่ใน allowlist เท่านั้น)"""
    from app.core.config import settings

    # ตรวจสอบ domain ว่าอยู่ใน allowlist หรือไม่
    allowed_domains = [
        "palad.mof.go.th",
        "psdg.mof.go.th",
    ]

    from urllib.parse import urlparse
    parsed = urlparse(url)
    domain = parsed.netloc.lower()

    if domain not in allowed_domains:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"โดเมน {domain} ไม่อยู่ในรายการที่อนุญาต (allowlist)",
        )

    # ตรวจสอบว่ามี URL นี้อยู่แล้วหรือไม่
    existing = db.query(WebsiteSource).filter(WebsiteSource.url == url).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="มี URL นี้ในระบบแล้ว",
        )

    website = WebsiteSource(
        url=url,
        domain=domain,
        is_allowed=True,
        last_crawled_at=None,
        crawl_status="pending",
        page_count=0,
        check_interval_hours=check_interval_hours,
    )

    db.add(website)
    db.commit()
    db.refresh(website)

    return {
        "message": "เพิ่มเว็บไซต์แหล่งข้อมูลเรียบร้อยแล้ว",
        "website": {
            "id": website.id,
            "url": website.url,
            "domain": website.domain,
            "is_allowed": website.is_allowed,
            "crawl_status": website.crawl_status,
        },
    }


@router.get("")
async def list_website_sources(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """ดึงรายการเว็บไซต์แหล่งข้อมูลทั้งหมด"""
    websites = db.query(WebsiteSource).order_by(WebsiteSource.created_at.desc()).all()
    return {
        "websites": [
            {
                "id": w.id,
                "url": w.url,
                "domain": w.domain,
                "is_allowed": w.is_allowed,
                "last_crawled_at": w.last_crawled_at.isoformat() if w.last_crawled_at else None,
                "crawl_status": w.crawl_status,
                "page_count": w.page_count,
            }
            for w in websites
        ],
    }


@router.delete("/{website_id}")
async def delete_website_source(
    website_id: int,
    current_user: User = Depends(require_editor),
    db: Session = Depends(get_db),
):
    """ลบเว็บไซต์แหล่งข้อมูล"""
    website = db.query(WebsiteSource).filter(WebsiteSource.id == website_id).first()
    if not website:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="ไม่พบเว็บไซต์นี้",
        )

    db.delete(website)
    db.commit()

    return {"message": "ลบเว็บไซต์แหล่งข้อมูลเรียบร้อยแล้ว"}