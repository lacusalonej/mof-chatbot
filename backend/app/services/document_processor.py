"""Document Processor — ประมวลผลเอกสารสำหรับฐานความรู้ (Phase 6).

แยกข้อความจากไฟล์อัปโหลด (PDF, DOCX, TXT, MD, HTML, CSV, XLSX)
แบ่งเป็นชิ้นย่อย (chunk) สร้าง embedding ด้วย AI Engine
เก็บลง ChromaDB (ผ่าน RAGService) และฐานข้อมูล SQL
"""

from __future__ import annotations

import csv
import io
import logging
import os
from typing import Any

from app.core.config import settings
from app.services.ai_engine import AIEngine
from app.services.rag_service import RAGService

logger = logging.getLogger(__name__)

# ค่าเริ่มต้นสำหรับการแบ่ง chunk
CHUNK_SIZE = 500      # ตัวอักษรต่อชิ้น
CHUNK_OVERLAP = 50    # ตัวอักษรที่ทับซ้อนกันระหว่างชิ้น


class DocumentProcessor:
    """ประมวลผลเอกสารสำหรับใส่เข้าไปในฐานความรู้ (RAG)"""

    def __init__(self) -> None:
        self.ai_engine = AIEngine()
        self.rag_service = RAGService()

    # ------------------------------------------------------------------
    # Public: process uploaded document
    # ------------------------------------------------------------------
    def process_document(self, document_id: int, file_path: str) -> dict[str, Any]:
        """ประมวลผลเอกสารอัปโหลด: แยกข้อความ → แบ่ง chunk → สร้าง embedding → เก็บ"""
        from typing import Any

        try:
            # 1. แยกข้อความจากไฟล์
            file_ext = os.path.splitext(file_path)[1].lower()
            text = self._extract_text(file_path, file_ext)

            if not text or not text.strip():
                logger.warning(f"No text extracted from {file_path}")
                return {
                    "success": False,
                    "error": "ไม่สามารถแยกข้อความจากไฟล์ได้",
                    "chunk_count": 0,
                }

            # 2. แบ่งข้อความเป็น chunk
            chunks = self._chunk_text(text)

            # 3. สร้างรูปแบบสำหรับ RAG service
            rag_chunks = [
                {"content": chunk, "chunk_index": idx}
                for idx, chunk in enumerate(chunks)
            ]

            # 4. เก็บลง ChromaDB + SQL
            self.rag_service.add_document_chunks(document_id, rag_chunks)

            logger.info(f"Document {document_id}: {len(chunks)} chunks processed")
            return {
                "success": True,
                "chunk_count": len(chunks),
                "error": None,
            }

        except Exception as exc:
            logger.exception(f"Document processing failed for {file_path}")
            return {
                "success": False,
                "error": str(exc),
                "chunk_count": 0,
            }
        finally:
            self.rag_service.close()

    # ------------------------------------------------------------------
    # Private: text extraction by file type
    # ------------------------------------------------------------------
    def _extract_text(self, file_path: str, file_ext: str) -> str:
        """แยกข้อความจากไฟล์ตามนามสกุล"""
        if file_ext in (".txt", ".md", ".html", ".htm", ".csv"):
            return self._extract_plain_text(file_path)
        if file_ext == ".pdf":
            return self._extract_pdf_text(file_path)
        if file_ext == ".docx":
            return self._extract_docx_text(file_path)
        if file_ext == ".xlsx":
            return self._extract_xlsx_text(file_path)
        # fallback: ลองอ่านเป็นข้อความธรรมดา
        return self._extract_plain_text(file_path)

    def _extract_plain_text(self, file_path: str) -> str:
        """อ่านไฟล์ข้อความธรรมดา (txt, md, html, csv)"""
        encodings = ["utf-8", "tis-620", "windows-874", "cp874", "latin-1"]
        for enc in encodings:
            try:
                with open(file_path, "r", encoding=enc) as f:
                    return f.read()
            except (UnicodeDecodeError, UnicodeError):
                continue
        # ลองอ่านเป็น binary แล้วถอดรหัสแบบละเว้นข้อผิดพลาด
        with open(file_path, "rb") as f:
            return f.read().decode("utf-8", errors="ignore")

    def _extract_pdf_text(self, file_path: str) -> str:
        """แยกข้อความจากไฟล์ PDF"""
        try:
            import PyPDF2  # type: ignore
        except ImportError:
            try:
                import pypdf as PyPDF2  # type: ignore
            except ImportError:
                logger.error("PyPDF2/pypdf not installed — cannot extract PDF text")
                return ""

        text_parts = []
        try:
            with open(file_path, "rb") as f:
                reader = PyPDF2.PdfReader(f)
                for page in reader.pages:
                    try:
                        text_parts.append(page.extract_text() or "")
                    except Exception:
                        logger.exception("Failed to extract text from a PDF page")
        except Exception:
            logger.exception("Failed to open PDF file")
            return ""
        return "\n".join(text_parts)

    def _extract_docx_text(self, file_path: str) -> str:
        """แยกข้อความจากไฟล์ DOCX"""
        try:
            from docx import Document  # type: ignore
        except ImportError:
            logger.error("python-docx not installed — cannot extract DOCX text")
            return ""
        try:
            doc = Document(file_path)
            return "\n".join(p.text for p in doc.paragraphs)
        except Exception:
            logger.exception("Failed to open DOCX file")
            return ""

    def _extract_xlsx_text(self, file_path: str) -> str:
        """แยกข้อความจากไฟล์ XLSX"""
        try:
            import openpyxl  # type: ignore
        except ImportError:
            try:
                import pandas as pd  # type: ignore
            except ImportError:
                logger.error("openpyxl/pandas not installed — cannot extract XLSX text")
                return ""
        try:
            # ใช้ openpyxl อ่านทุกชีท
            wb = openpyxl.load_workbook(file_path, data_only=True)
            text_parts = []
            for sheet_name in wb.sheetnames:
                ws = wb[sheet_name]
                text_parts.append(f"=== Sheet: {sheet_name} ===")
                for row in ws.iter_rows(values_only=True):
                    cells = [str(c) for c in row if c is not None]
                    if cells:
                        text_parts.append(" | ".join(cells))
            return "\n".join(text_parts)
        except Exception:
            logger.exception("Failed to open XLSX file")
            return ""

    # ------------------------------------------------------------------
    # Private: text chunking
    # ------------------------------------------------------------------
    def _chunk_text(self, text: str) -> list[str]:
        """แบ่งข้อความเป็นชิ้นย่อยตามขนาดที่กำหนด"""
        if not text:
            return []

        # ทำความสะอาดข้อความเบื้องต้น
        text = text.strip()
        if not text:
            return []

        chunks: list[str] = []
        start = 0
        text_len = len(text)

        while start < text_len:
            end = min(start + CHUNK_SIZE, text_len)

            # พยายามตัดที่ขอบบรรทัดหรือประโยค
            if end < text_len:
                # หาจุดขึ้นบรรทัดใหม่ล่าสุดภายใน chunk
                newline_pos = text.rfind("\n", start, end)
                if newline_pos != -1 and newline_pos > start:
                    end = newline_pos + 1
                else:
                    # หาจุดสิ้นสุดประโยค (. ! ?)
                    for punc in (". ", "! ", "? "):
                        punc_pos = text.rfind(punc, start, end)
                        if punc_pos != -1:
                            end = punc_pos + len(punc)
                            break

            chunk = text[start:end].strip()
            if chunk:
                chunks.append(chunk)

            # ขยับ start ไปข้างหน้า โดยเว้น overlap
            start = end
            if start < text_len:
                start = max(start - CHUNK_OVERLAP, start)

        return chunks

    def close(self) -> None:
        self.ai_engine.close()
        self.rag_service.close()


# ใต้ตัวคลาสเพื่อใช้เป็นฟังก์ชัน standalone ได้ด้วย
def process_uploaded_document(document_id: int, file_path: str) -> dict[str, Any]:
    """ฟังก์ชันสะดวกสำหรับประมวลผลเอกสารอัปโหลดครั้งเดียว"""
    processor = DocumentProcessor()
    try:
        return processor.process_document(document_id, file_path)
    finally:
        processor.close()
