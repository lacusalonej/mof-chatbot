"""AI Engine — ผู้ให้บริการ AI แบบหลายค่าย (OpenAI, Anthropic, Ollama, Demo).

รองรับการสร้างคำตอบ (chat completion) และ embedding vector
จากผู้ให้บริการ AI ที่กำหนดในไฟล์ .env
ทุกค่า secrète ต้องอ่านจาก environment variable เท่านั้น ห้ามเขียนลง source code โดยตรง
"""

from __future__ import annotations

import hashlib
import logging
from typing import Any

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


class AIEngine:
    """คลาสหลักสำหรับเรียกใช้งาน AI จากผู้ให้บริการต่าง ๆ"""

    def __init__(self) -> None:
        self.provider = settings.AI_PROVIDER
        self._http_client = httpx.Client(timeout=60.0)

    # ------------------------------------------------------------------
    # Public: chat completion
    # ------------------------------------------------------------------
    def generate_response(
        self,
        messages: list[dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 2000,
    ) -> str:
        """สร้างคำตอบจาก AI ตาม provider ที่กำหนด"""
        try:
            if self.provider == "demo":
                return self._demo_response(messages)
            if self.provider == "openai":
                return self._openai_response(messages, temperature, max_tokens)
            if self.provider == "anthropic":
                return self._anthropic_response(messages, temperature, max_tokens)
            if self.provider == "ollama":
                return self._ollama_response(messages, temperature, max_tokens)
            logger.warning(f"Unknown AI provider: {self.provider}, falling back to demo")
            return self._demo_response(messages)
        except Exception as exc:
            logger.exception(f"AI generation failed: {exc}")
            return f"ขออภัยค่ะ ระบบเกิดข้อผิดพลาดในการสร้างคำตอบ: {exc}"

    # ------------------------------------------------------------------
    # Public: embedding
    # ------------------------------------------------------------------
    def generate_embedding(self, text: str) -> list[float]:
        """สร้าง embedding vector จากข้อความ"""
        try:
            if self.provider == "demo":
                return self._demo_embedding(text)
            if self.provider == "openai":
                return self._openai_embedding(text)
            if self.provider == "ollama":
                return self._ollama_embedding(text)
            return self._demo_embedding(text)
        except Exception as exc:
            logger.exception(f"Embedding generation failed: {exc}")
            return self._demo_embedding(text)

    def close(self) -> None:
        """ปิด HTTP client"""
        try:
            self._http_client.close()
        except Exception:
            pass

    # ------------------------------------------------------------------
    # Private: Demo provider
    # ------------------------------------------------------------------
    def _demo_response(self, messages: list[dict[str, str]]) -> str:
        last_user = ""
        for msg in reversed(messages):
            if msg.get("role") == "user":
                last_user = msg.get("content", "")
                break
        return (
            f"[Demo Mode] คำถาม: {last_user}\n\n"
            "ระบบยังอยู่ในโหมดสาธิต (Demo Mode) ยังไม่ได้เชื่อมต่อกับ AI จริง\n"
            "กรุณากำหนด AI Provider ในไฟล์ .env (openai, anthropic, ollama) "
            "และระบุ API Key ที่ถูกต้อง"
        )

    def _demo_embedding(self, text: str) -> list[float]:
        """สร้าง embedding แบบง่ายจาก hash สำหรับ demo mode (384 มิติ)"""
        digest = hashlib.sha256(text.encode("utf-8")).hexdigest()
        values = []
        for i in range(0, len(digest), 2):
            byte_val = int(digest[i : i + 2], 16)
            values.append((byte_val - 127.5) / 127.5)
        while len(values) < 384:
            values.extend(values[: 384 - len(values)])
        return values[:384]

    # ------------------------------------------------------------------
    # Private: OpenAI
    # ------------------------------------------------------------------
    def _openai_response(
        self,
        messages: list[dict[str, str]],
        temperature: float,
        max_tokens: int,
    ) -> str:
        try:
            from openai import OpenAI
        except ImportError:
            logger.error("openai package not installed")
            return "ขออภัยค่ะ ยังไม่ได้ติดตั้ง openai package กรุณาติดตั้งก่อนใช้งาน"
        if not settings.OPENAI_API_KEY:
            return "ขออภัยค่ะ ยังไม่ได้กำหนด OPENAI_API_KEY ในไฟล์ .env"
        client = OpenAI(api_key=settings.OPENAI_API_KEY)
        response = client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return response.choices[0].message.content or ""

    def _openai_embedding(self, text: str) -> list[float]:
        try:
            from openai import OpenAI
        except ImportError:
            logger.error("openai package not installed")
            return self._demo_embedding(text)
        if not settings.OPENAI_API_KEY:
            return self._demo_embedding(text)
        client = OpenAI(api_key=settings.OPENAI_API_KEY)
        response = client.embeddings.create(
            model=settings.OPENAI_EMBEDDING_MODEL,
            input=text,
        )
        return response.data[0].embedding

    # ------------------------------------------------------------------
    # Private: Anthropic
    # ------------------------------------------------------------------
    def _anthropic_response(
        self,
        messages: list[dict[str, str]],
        temperature: float,
        max_tokens: int,
    ) -> str:
        try:
            import anthropic
        except ImportError:
            logger.error("anthropic package not installed")
            return "ขออภัยค่ะ ยังไม่ได้ติดตั้ง anthropic package กรุณาติดตั้งก่อนใช้งาน"
        if not settings.ANTHROPIC_API_KEY:
            return "ขออภัยค่ะ ยังไม่ได้กำหนด ANTHROPIC_API_KEY ในไฟล์ .env"
        client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        system_msg = ""
        user_msgs = []
        for msg in messages:
            if msg.get("role") == "system":
                system_msg = msg.get("content", "")
            else:
                user_msgs.append(msg)
        response = client.messages.create(
            model=settings.ANTHROPIC_MODEL,
            system=system_msg,
            messages=user_msgs,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return response.content[0].text if response.content else ""

    # ------------------------------------------------------------------
    # Private: Ollama
    # ------------------------------------------------------------------
    def _ollama_response(
        self,
        messages: list[dict[str, str]],
        temperature: float,
        max_tokens: int,
    ) -> str:
        payload = {
            "model": settings.OLLAMA_MODEL,
            "messages": messages,
            "stream": False,
            "options": {
                "temperature": temperature,
                "num_predict": max_tokens,
            },
        }
        resp = self._http_client.post(
            f"{settings.OLLAMA_BASE_URL}/api/chat",
            json=payload,
        )
        resp.raise_for_status()
        data = resp.json()
        return data.get("message", {}).get("content", "")

    def _ollama_embedding(self, text: str) -> list[float]:
        payload = {
            "model": settings.OLLAMA_MODEL,
            "prompt": text,
        }
        resp = self._http_client.post(
            f"{settings.OLLAMA_BASE_URL}/api/embeddings",
            json=payload,
        )
        resp.raise_for_status()
        data = resp.json()
        return data.get("embedding", [])
