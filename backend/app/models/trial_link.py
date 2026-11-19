"""Trial link model — ลิงก์สำหรับทดลองใช้งาน Chatbot."""

from sqlalchemy import Column, String, Integer, DateTime, Boolean, ForeignKey, Text
from sqlalchemy.orm import relationship

from app.models.base import Base, TimestampMixin


class TrialLink(Base, TimestampMixin):
    __tablename__ = "trial_links"

    id = Column(Integer, primary_key=True, index=True)
    token = Column(String(100), unique=True, index=True, nullable=False)  # Token แบบ hash
    name = Column(String(100), nullable=True)  # ชื่อลิงก์สำหรับอ้างอิง
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    max_usages = Column(Integer, default=100, nullable=False)
    usage_count = Column(Integer, default=0, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    is_indexed = Column(Boolean, default=False, nullable=False)  # ป้องกัน search engine indexing

    # Relationships
    creator = relationship("User", foreign_keys=[created_by])

    def __repr__(self):
        return f"<TrialLink(token='{self.token[:8]}...', active={self.is_active})>"