"""Document chunk model — ข้อความย่อยของเอกสารสำหรับการค้นหา."""

from sqlalchemy import Column, String, Integer, Text, ForeignKey, Index
from sqlalchemy.orm import relationship

from app.models.base import Base, TimestampMixin


class DocumentChunk(Base, TimestampMixin):
    __tablename__ = "document_chunks"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    chunk_index = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)
    content_hash = Column(String(64), nullable=True)  # สำหรับตรวจสอบไฟล์ซ้ำ
    page_number = Column(Integer, nullable=True)
    vector_id = Column(String(100), nullable=True)  # ID ใน ChromaDB

    __table_args__ = (
        Index("ix_document_chunks_document_id", "document_id"),
    )

    document = relationship("Document", back_populates="chunks")

    def __repr__(self):
        return f"<Chunk(document_id={self.document_id}, index={self.chunk_index})>"