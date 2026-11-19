"""Website source model — แหล่งข้อมูลจากเว็บไซต์ที่อนุญาต."""

from sqlalchemy import Column, String, DateTime, Boolean, Integer, Text
from sqlalchemy.orm import relationship

from app.models.base import Base, TimestampMixin


class WebsiteSource(Base, TimestampMixin):
    __tablename__ = "website_sources"

    id = Column(Integer, primary_key=True, index=True)
    url = Column(String(500), unique=True, nullable=False)
    domain = Column(String(100), nullable=False)
    is_allowed = Column(Boolean, default=False, nullable=False)  # ต้องอยู่ใน allowlist
    last_crawled_at = Column(DateTime, nullable=True)
    crawl_status = Column(String(20), default="pending", nullable=False)  # pending | completed | failed
    page_count = Column(Integer, default=0, nullable=True)
    error_message = Column(Text, nullable=True)
    check_interval_hours = Column(Integer, default=24, nullable=True)

    def __repr__(self):
        return f"<WebsiteSource(url='{self.url}', allowed={self.is_allowed})>"