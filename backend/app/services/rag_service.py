"""RAG Service — ระบบค้นหาข้อมูลและสร้างคำตอบจากฐานความรู้ (Retrieval-Augmented Generation).

ใช้ ChromaDB เป็น vector store สำหรับค้นหา document chunk ที่เกี่ยวข้อง
แล้วส่งบริบทพร้อมคำถามให้ AI Engine สร้างคำตอบ
"""

from __future__ import annotations

import logging
from typing import Any

import chromadb

from app.core.config import settings
from app.db.database import SessionLocal
from app.models.document_chunk import DocumentChunk
from app.services.ai_engine import AIEngine

logger = logging.getLogger(__name__)


class RAGService:
    """บริการ RAG (Retrieval-Augmented Generation) สำหรับค้นหาข้อมูลจากฐานความรู้"""

    def __init__(self) -> None:
        self.ai_engine = AIEngine()
        self._chroma_client = chromadb.PersistentClient(
            path=settings.CHROMA_PERSIST_DIRECTORY
        )
        self._collection = self._chroma_client.get_or_create_collection(
            name=settings.CHROMA_COLLECTION_NAME,
        )
        logger.info(f"RAGService initialized with collection: {settings.CHROMA_COLLECTION_NAME}")

    # ------------------------------------------------------------------
    # Add document chunks to ChromaDB + SQL
    # ------------------------------------------------------------------
    def add_document_chunks(
        self,
        document_id: int,
        chunks: list[dict[str, Any]],
    ) -> None:
        """เพิ่ม chunk ของเอกสารลงใน ChromaDB และฐานข้อมูล SQL"""
        db = SessionLocal()
        try:
            embeddings: list[list[float]] = []
            documents: list[str] = []
            metadatas: list[dict[str, Any]] = []
            ids: list[str] = []
            chunk_records: list[DocumentChunk] = []

            for chunk in chunks:
                content = chunk["content"]
                chunk_index = chunk["chunk_index"]
                embedding = self.ai_engine.generate_embedding(content)

                chunk_id = f"doc_{document_id}_chunk_{chunk_index}"
                embeddings.append(embedding)
                documents.append(content)
                metadatas.append(
                    {
                        "document_id": document_id,
                        "chunk_index": chunk_index,
                    }
                )
                ids.append(chunk_id)

                chunk_records.append(
                    DocumentChunk(
                        document_id=document_id,
                        chunk_index=chunk_index,
                        content=content,
                        vector_id=chunk_id,
                    )
                )

            if embeddings:
                self._collection.add(
                    embeddings=embeddings,
                    documents=documents,
                    metadatas=metadatas,
                    ids=ids,
                )

            for record in chunk_records:
                db.add(record)
            db.commit()
            logger.info(f"Added {len(chunks)} chunks for document {document_id}")
        except Exception:
            logger.exception(f"Failed to add chunks for document {document_id}")
            db.rollback()
            raise
        finally:
            db.close()

    # ------------------------------------------------------------------
    # Search
    # ------------------------------------------------------------------
    def search(
        self,
        query: str,
        top_k: int = 5,
    ) -> list[dict[str, Any]]:
        """ค้นหาชิ้นส่วนเอกสารที่เกี่ยวข้องกับคำถามจาก ChromaDB"""
        try:
            query_embedding = self.ai_engine.generate_embedding(query)
            results = self._collection.query(
                query_embeddings=[query_embedding],
                n_results=top_k,
            )
            chunks: list[dict[str, Any]] = []
            if results and results.get("documents") and results["documents"][0]:
                for i, doc in enumerate(results["documents"][0]):
                    chunks.append(
                        {
                            "content": doc,
                            "metadata": (
                                results.get("metadatas", [[]])[0][i]
                                if results.get("metadatas")
                                else {}
                            ),
                            "distance": (
                                results.get("distances", [[0]])[0][i]
                                if results.get("distances")
                                else 0
                            ),
                            "id": (
                                results.get("ids", [[]])[0][i]
                                if results.get("ids")
                                else ""
                            ),
                        }
                    )
            return chunks
        except Exception:
            logger.exception("RAG search failed")
            return []

    # ------------------------------------------------------------------
    # Generate response with RAG
    # ------------------------------------------------------------------
    def generate_response_with_rag(
        self,
        user_message: str,
        conversation_history: list[dict[str, str]] | None = None,
        top_k: int = 5,
    ) -> dict[str, Any]:
        """สร้างคำตอบโดยใช้ RAG pipeline: ค้นหา chunk → สร้างบริบท → เรียก AI"""
        # ค้นหาข้อมูลจากฐานความรู้
        relevant_chunks = self.search(user_message, top_k=top_k)

        # สร้าง context จาก chunk ที่พบ
        context_parts: list[str] = []
        citations: list[dict[str, Any]] = []
        for chunk in relevant_chunks:
            context_parts.append(chunk["content"])
            citations.append(
                {
                    "content": chunk["content"][:200],
                    "metadata": chunk.get("metadata", {}),
                }
            )

        context = "\n\n".join(context_parts) if context_parts else ""

        # สร้าง system prompt พร้อม context
        system_prompt = """คุณคือผู้ช่วยตอบคำถามของกลุ่มพัฒนาระบบบริหาร สำนักงานปลัดกระทรวงการคลัง
ตอบคำถามโดยใช้ข้อมูลจากฐานความรู้ที่ให้มาเท่านั้น
หากไม่พบข้อมูลที่เกี่ยวข้อง ให้บอกว่าไม่พบข้อมูล อย่าแต่งขึ้นเอง
ตอบเป็นภาษาไทย"""

        if context:
            system_prompt += f"\n\nข้อมูลจากฐานความรู้:\n{context}"

        messages: list[dict[str, str]] = [{"role": "system", "content": system_prompt}]
        if conversation_history:
            messages.extend(conversation_history)
        messages.append({"role": "user", "content": user_message})

        # สร้างคำตอบด้วย AI Engine
        response_text = self.ai_engine.generate_response(messages)

        return {
            "response": response_text,
            "citations": citations,
            "chunks_found": len(relevant_chunks),
        }

    def close(self) -> None:
        self.ai_engine.close()
