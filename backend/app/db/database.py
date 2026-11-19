"""Database connection and session management."""

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

from app.core.config import settings

# สร้าง engine สำหรับเชื่อมต่อฐานข้อมูล
# ใช้ check_same_thread=False สำหรับ SQLite เพื่อรองรับการใช้งานแบบ async
engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {},
    echo=settings.DEBUG,
)

# สร้าง session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class สำหรับทุก model
Base = declarative_base()


def get_db():
    """Dependency สำหรับดึง database session (ใช้กับ FastAPI Depends)"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_tables():
    """สร้างตารางทั้งหมดในฐานข้อมูล (ใช้สำหรับ initialization ครั้งแรก)"""
    Base.metadata.create_all(bind=engine)