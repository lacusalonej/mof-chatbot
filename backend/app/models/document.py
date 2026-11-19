"""Document model — การจัดการเอกสารในฐานความรู้."""

from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship

from app.models.base import Base, TimestampMixin


class Document(Base, TimestampMixin):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(String(50), unique=True, index=True, nullable=False)
    title = Column(String(255), nullable=False)
    organization = Column(String(100), default="กลุ่มพัฒนาระบบบริหาร กระทรวงการคลัง", nullable=False)
    category = Column(String(100), nullable=True)
    document_number = Column(String(100), nullable=True)
    publish_date = Column(DateTime, nullable=True)
    effective_date = Column(DateTime, nullable=True)
    fiscal_year = Column(String(10), nullable=True)
    source_url = Column(String(500), nullable=True)
    file_type = Column(String(20), nullable=True)
    file_path = Column(String(500), nullable=True)
    page_count = Column(Integer, nullable=True)
    import_date = Column(DateTime, nullable=True)
    last_updated = Column(DateTime, nullable=True)
    version = Column(String(20), default="1.0", nullable=True)
    access_classification = Column(String(20), default="PUBLIC", nullable=False)  # PUBLIC | INTERNAL
    processing_status = Column(String(20), default="pending", nullable=False)  # pending | completed | failed
    chunk_count = Column(Integer, default=0, nullable=True)
    error_message = Column(Text, nullable=True)

    # Relationships
    chunks = relationship("DocumentChunk", back_populates="document", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Document(document_id='{self.document_id}', title='{self.title}')>"