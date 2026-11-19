"""Document API routes — การจัดการเอกสารในฐานความรู้."""

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import os
import uuid

from app.db.database import get_db
from app.models.user import User
from app.models.document import Document
from app.models.document_chunk import DocumentChunk
from app.api.auth import get_current_user, require_editor
from app.core.config import settings

import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/documents", tags=["documents"])

# สร้างโฟลдерอัปโหลดถ้ายังไม่มี
os.makedirs(settings.UPLOAD_DIRECTORY, exist_ok=True)


def allowed_file(filename: str) -> bool:
    """ตรวจสอบว่าไฟล์มีนามสกุลที่อนุญาตหรือไม่"""
    allowed_types = [t.strip().lower() for t in settings.ALLOWED_FILE_TYPES.split(",")]
    ext = filename.rsplit(".", 1)[1].lower() if "." in filename else ""
    return ext in allowed_types


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    category: Optional[str] = Form(None),
    classification: str = Form("PUBLIC"),
    current_user: User = Depends(require_editor),
    db: Session = Depends(get_db),
):
    """อัปโหลดเอกสารเข้าฐานความรู้"""
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="ไม่พบไฟล์ที่อัปโหลด",
        )

    if not allowed_file(file.filename):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"ประเภทไฟล์ไม่รองรับ อนุญาตเฉพาะ: {settings.ALLOWED_FILE_TYPES}",
        )

    # ตรวจสอบขนาดไฟล์
    content = await file.read()
    if len(content) > settings.MAX_FILE_SIZE_MB * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"ไฟล์มีขนาดใหญ่เกินไป (สูงสุด {settings.MAX_FILE_SIZE_MB} MB)",
        )

    # สร้างชื่อไฟล์ที่ไม่ซ้ำกัน
    file_ext = file.filename.rsplit(".", 1)[1].lower() if "." in file.filename else ""
    unique_filename = f"{uuid.uuid4().hex}.{file_ext}"
    file_path = os.path.join(settings.UPLOAD_DIRECTORY, unique_filename)

    # บันทึกไฟล์
    with open(file_path, "wb") as f:
        f.write(content)

    # สร้างสถิติเอกสาร
    document_id = f"DOC-{uuid.uuid4().hex[:8].upper()}"
    doc_title = title or file.filename

    document = Document(
        document_id=document_id,
        title=doc_title,
        category=category,
        access_classification=classification,
        file_type=file_ext,
        file_path=file_path,
        processing_status="pending",
        import_date=datetime.utcnow(),
    )
    db.add(document)
    db.commit()
    db.refresh(document)

    # TODO: ประมวลผลเอกสาร (extract text, chunk, embed) ใน Phase 5-6
    from app.services.document_processor import DocumentProcessor

    processor = DocumentProcessor()
    try:
        result = processor.process_document(document.id, file_path)
        document.processing_status = "completed" if result["success"] else "failed"
        document.chunk_count = result["chunk_count"]
        if result["error"]:
            document.error_message = result["error"]
    except Exception as exc:
        logger.exception(f"Document processing failed for {document.id}")
        document.processing_status = "failed"
        document.error_message = str(exc)
    finally:
        processor.close()
    db.commit()

    return {
        "message": "อัปโหลดเอกสารเรียบร้อยแล้ว",
        "document": {
            "id": document.id,
            "document_id": document.document_id,
            "title": document.title,
            "category": document.category,
            "file_type": document.file_type,
            "classification": document.access_classification,
            "status": document.processing_status,
        },
    }


@router.get("")
async def list_documents(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """ดึงรายการเอกสารทั้งหมด"""
    documents = db.query(Document).order_by(Document.created_at.desc()).all()

    return {
        "documents": [
            {
                "id": doc.id,
                "document_id": doc.document_id,
                "title": doc.title,
                "category": doc.category,
                "file_type": doc.file_type,
                "classification": doc.access_classification,
                "processing_status": doc.processing_status,
                "created_at": doc.created_at.isoformat(),
            }
            for doc in documents
        ],
    }


@router.get("/{document_id}")
async def get_document(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """ดึงรายละเอียดเอกสาร"""
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="ไม่พบเอกสารนี้",
        )

    # ตรวจสอบการจำแนกความลับ — INTERNAL ต้องมีสิทธิ์ editor ขึ้นไป
    if document.access_classification == "INTERNAL":
        if current_user.role not in ("super_admin", "admin", "editor"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="ไม่มีสิทธิ์เข้าถึงเอกสารภายใน",
            )

    return {
        "id": document.id,
        "document_id": document.document_id,
        "title": document.title,
        "organization": document.organization,
        "category": document.category,
        "document_number": document.document_number,
        "publish_date": document.publish_date.isoformat() if document.publish_date else None,
        "effective_date": document.effective_date.isoformat() if document.effective_date else None,
        "fiscal_year": document.fiscal_year,
        "source_url": document.source_url,
        "file_type": document.file_type,
        "file_path": document.file_path,
        "page_count": document.page_count,
        "version": document.version,
        "classification": document.access_classification,
        "processing_status": document.processing_status,
        "chunk_count": document.chunk_count,
        "created_at": document.created_at.isoformat(),
    }


@router.delete("/{document_id}")
async def delete_document(
    document_id: int,
    current_user: User = Depends(require_editor),
    db: Session = Depends(get_db),
):
    """ลบเอกสารจากฐานความรู้"""
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="ไม่พบเอกสารนี้",
        )

    # ลบไฟล์จริงจากดิสก์
    if document.file_path and os.path.exists(document.file_path):
        os.remove(document.file_path)

    db.delete(document)
    db.commit()

    return {"message": "ลบเอกสารเรียบร้อยแล้ว"}