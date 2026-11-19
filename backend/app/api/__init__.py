# API routes module
from app.api.auth import router as auth_router
from app.api.chat import router as chat_router
from app.api.documents import router as documents_router
from app.api.admin import router as admin_router
from app.api.trial import router as trial_router
from app.api.websites import router as websites_router

__all__ = [
    "auth_router",
    "chat_router",
    "documents_router",
    "admin_router",
    "trial_router",
    "websites_router",
]