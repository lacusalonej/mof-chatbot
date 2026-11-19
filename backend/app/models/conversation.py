"""Conversation and message models — บทสนทนาระหว่างผู้ใช้กับ Chatbot."""

from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Integer, Boolean
from sqlalchemy.orm import relationship

from app.models.base import Base, TimestampMixin


class Conversation(Base, TimestampMixin):
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(100), index=True, nullable=False)  # รหัสเซสชันสนทนา
    user_type = Column(String(20), default="public", nullable=False)  # public | trial | admin
    trial_link_id = Column(Integer, nullable=True)  # อ้างอิงถึงลิงก์ทดลองหากใช้ผ่าน trial
    title = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)

    # Relationships
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Conversation(session_id='{self.session_id}')>"


class Message(Base, TimestampMixin):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"), nullable=False)
    role = Column(String(20), nullable=False)  # user | assistant
    content = Column(Text, nullable=False)
    citations = Column(Text, nullable=True)  # JSON string ของแหล่งอ้างอิง
    response_time_ms = Column(Integer, nullable=True)
    token_count = Column(Integer, nullable=True)

    conversation = relationship("Conversation", back_populates="messages")

    def __repr__(self):
        return f"<Message(role='{self.role}', conversation_id={self.conversation_id})>"