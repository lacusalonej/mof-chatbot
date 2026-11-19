"""Chat API routes — การส่งข้อความและจัดการบทสนทนา."""

from fastapi import APIRouter, Depends, HTTPException, status, Form
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime

from app.db.database import get_db
from app.models.conversation import Conversation, Message
from app.core.config import settings

router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.post("/conversation")
async def create_conversation(
    db: Session = Depends(get_db),
):
    """สร้างบทสนทนาใหม่"""
    import uuid

    session_id = str(uuid.uuid4())

    conversation = Conversation(
        session_id=session_id,
        user_type="public",
    )
    db.add(conversation)
    db.commit()
    db.refresh(conversation)

    return {
        "conversation_id": conversation.id,
        "session_id": session_id,
    }


@router.post("/message")
async def send_message(
    message: str = Form(default=""),
    conversation_id: Optional[int] = Form(None),
    db: Session = Depends(get_db),
):
    """ส่งข้อความและรับคำตอบจาก AI (RAG)"""
    if not message or not message.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="ข้อความไม่สามารถเป็นค่าว่างได้",
        )

    # ดึงหรือสร้างบทสนทนา
    conversation = None
    if conversation_id:
        conversation = (
            db.query(Conversation)
            .filter(Conversation.id == conversation_id)
            .first()
        )
        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="ไม่พบบทสนทนานี้",
            )

    if not conversation:
        import uuid
        conversation = Conversation(
            session_id=str(uuid.uuid4()),
            user_type="public",
        )
        db.add(conversation)
        db.commit()
        db.refresh(conversation)

    # บันทึกข้อความจากผู้ใช้
    user_message = Message(
        conversation_id=conversation.id,
        role="user",
        content=message,
    )
    db.add(user_message)
    db.commit()

    # ========================================================================
    # RAG Pipeline — Phase 5 (AI Engine & RAG)
    # ค้นหา chunk จาก ChromaDB แล้วสร้างคำตอบด้วย AI Engine
    # ========================================================================
    from app.services.rag_service import RAGService

    rag_service = RAGService()
    try:
        # ดึงประวัติการสนทนาล่าสุดในบทสนทนาเดียวกัน (ถ้ามี)
        conversation_history: list[dict[str, str]] = []
        if conversation:
            prior_messages = (
                db.query(Message)
                .filter(Message.conversation_id == conversation.id)
                .order_by(Message.created_at.asc())
                .all()
            )
            for msg in prior_messages:
                conversation_history.append({"role": msg.role, "content": msg.content})

        # สร้างคำตอบด้วย RAG pipeline
        rag_result = rag_service.generate_response_with_rag(
            user_message=message,
            conversation_history=conversation_history,
            top_k=5,
        )
        response_text = rag_result["response"]
        citations = rag_result["citations"]
    finally:
        rag_service.close()

    # บันทึกคำตอบจาก AI
    import json
    assistant_message = Message(
        conversation_id=conversation.id,
        role="assistant",
        content=response_text,
        citations=json.dumps(citations, ensure_ascii=False) if citations else None,
    )
    db.add(assistant_message)
    db.commit()

    return {
        "response": response_text,
        "conversation_id": conversation.id,
        "session_id": conversation.session_id,
        "citations": citations,
        "ai_provider": settings.AI_PROVIDER,
    }


@router.get("/conversation/{conversation_id}")
async def get_conversation(
    conversation_id: int,
    db: Session = Depends(get_db),
):
    """ดึงข้อมูลบทสนทนาและข้อความทั้งหมด"""
    conversation = (
        db.query(Conversation)
        .filter(Conversation.id == conversation_id)
        .first()
    )
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="ไม่พบบทสนทนานี้",
        )

    messages = (
        db.query(Message)
        .filter(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.asc())
        .all()
    )

    return {
        "conversation": {
            "id": conversation.id,
            "session_id": conversation.session_id,
            "user_type": conversation.user_type,
            "created_at": conversation.created_at.isoformat(),
        },
        "messages": [
            {
                "id": msg.id,
                "role": msg.role,
                "content": msg.content,
                "citations": msg.citations,
                "created_at": msg.created_at.isoformat(),
            }
            for msg in messages
        ],
    }