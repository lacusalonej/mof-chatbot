"""Base model with common fields for all tables."""

from datetime import datetime
from sqlalchemy import Column, DateTime, Integer
from app.db.database import Base


class TimestampMixin:
    """มิกซ์อินสำหรับฟิลด์ created_at และ updated ที่มีในทุกตาราง"""

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)