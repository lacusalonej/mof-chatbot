"""Admin API routes — สถิติระบบ, จัดการผู้ใช้, ตรวจสอบสถานะ."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.db.database import get_db
from app.models.user import User
from app.models.document import Document
from app.models.conversation import Conversation, Message
from app.models.trial_link import TrialLink
from app.models.audit_log import AuditLog
from app.api.auth import get_current_user, require_admin

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/stats")
async def get_system_stats(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """ดึงสถิติภาพรวมของระบบ"""
    doc_count = db.query(Document).count()
    active_doc_count = db.query(Document).filter(
        Document.processing_status == "completed"
    ).count()
    pending_doc_count = db.query(Document).filter(
        Document.processing_status == "pending"
    ).count()
    error_doc_count = db.query(Document).filter(
        Document.processing_status == "failed"
    ).count()
    chat_count = db.query(Message).filter(Message.role == "user").count()
    session_count = db.query(Conversation).count()

    return {
        "document_count": doc_count,
        "active_document_count": active_doc_count,
        "pending_document_count": pending_doc_count,
        "error_document_count": error_doc_count,
        "chat_count": chat_count,
        "session_count": session_count,
    }


@router.get("/users")
async def list_users(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """ดึงรายการผู้ใช้ทั้งหมด"""
    users = db.query(User).order_by(User.created_at.desc()).all()
    return {
        "users": [
            {
                "id": u.id,
                "username": u.username,
                "email": u.email,
                "full_name": u.full_name,
                "role": u.role,
                "is_active": u.is_active,
                "is_locked": u.is_locked,
                "failed_login_attempts": u.failed_login_attempts,
                "last_login_at": u.last_login_at.isoformat() if u.last_login_at else None,
                "created_at": u.created_at.isoformat(),
            }
            for u in users
        ],
    }


@router.get("/audit-logs")
async def get_audit_logs(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
    limit: int = 100,
):
    """ดึงประวัติการใช้งานระบบ"""
    logs = (
        db.query(AuditLog)
        .order_by(AuditLog.created_at.desc())
        .limit(limit)
        .all()
    )
    return {
        "logs": [
            {
                "id": log.id,
                "action": log.action,
                "resource_type": log.resource_type,
                "resource_id": log.resource_id,
                "user_id": log.user_id,
                "ip_address": log.ip_address,
                "created_at": log.created_at.isoformat(),
            }
            for log in logs
        ],
    }


@router.get("/system-status")
async def get_system_status(
    current_user: User = Depends(require_admin),
):
    """ตรวจสอบสถานะระบบย่อยต่างๆ"""
    from app.core.config import settings

    return {
        "ai_provider": settings.AI_PROVIDER,
        "ai_configured": settings.AI_PROVIDER != "demo",
        "database": "connected",
        "knowledge_base": "pending",  # จะอัปเดตเมื่อมีเอกสาร
        "chroma_directory": settings.CHROMA_PERSIST_DIRECTORY,
        "upload_directory": settings.UPLOAD_DIRECTORY,
    }