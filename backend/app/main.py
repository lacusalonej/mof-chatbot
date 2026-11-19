"""MOF PSDG AI Chatbot — Backend Application Entry Point."""

import time
from collections import defaultdict

from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.db.database import engine, Base, create_tables

# นำเข้าโมเดลทั้งหมดก่อนสร้างตาราง เพื่อให้ Base.metadata ทราบโครงสร้างตาราง
from app.models import user, session, document, document_chunk, conversation, trial_link, audit_log, website_source  # noqa: F401

# สร้างตารางฐานข้อมูลเมื่อเริ่มแอปพลิเคชัน
create_tables()

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="ระบบ AI Assistant สำหรับกลุ่มพัฒนาระบบบริหาร กระทรวงการคลัง",
)

# CORS middleware — อนุญาตให้ frontend เรียกใช้ API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # ใน production ควรจำกัดเฉพาะ domain ที่เชื่อถือได้
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files สำหรับอัปโหลดเอกสาร
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIRECTORY), name="uploads")


@app.get("/health")
async def health_check():
    """Health check endpoint สำหรับตรวจสอบสถานะระบบ"""
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "database": "connected",
        "ai_provider": settings.AI_PROVIDER,
    }


# ============================================================================
# API Routes (routers define their own prefixes)
# ============================================================================

from app.api import chat, documents, admin, auth, trial, websites

app.include_router(chat.router, tags=["chat"])
app.include_router(documents.router, tags=["documents"])
app.include_router(admin.router, tags=["admin"])
app.include_router(auth.router, tags=["auth"])
app.include_router(trial.router, tags=["trial-links"])
app.include_router(websites.router, tags=["websites"])


# Static files สำหรับ frontend (หน้าเว็บแชทบอท)
from pathlib import Path
_FRONTEND_DIR = Path(__file__).resolve().parent.parent.parent / "frontend"
app.mount("/", StaticFiles(directory=str(_FRONTEND_DIR), html=True), name="frontend")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host=settings.BACKEND_HOST, port=settings.BACKEND_PORT)