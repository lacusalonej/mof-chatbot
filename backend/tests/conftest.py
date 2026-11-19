"""Pytest configuration and shared fixtures for MOF PSDG AI Chatbot tests."""

import os
import sys

# Ensure the backend directory is on the path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
import uuid
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.db.database import SessionLocal
from app.core.security import hash_password
from app.models.user import User


@pytest.fixture(scope="session")
def client():
    """Create a TestClient for the FastAPI app."""
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="function")
def db_session():
    """Create a database session for the test."""
    session = SessionLocal()
    yield session
    session.close()


@pytest.fixture(scope="function")
def super_admin_user(db_session):
    """Create a super_admin user with a unique username to avoid test conflicts."""
    unique_suffix = uuid.uuid4().hex[:8]
    username = f"test_admin_{unique_suffix}"
    email = f"test_admin_{unique_suffix}@example.com"

    user = User(
        username=username,
        email=email,
        hashed_password=hash_password("TestPass123!"),
        full_name="Test Admin",
        role="super_admin",
        is_active=True,
        is_locked=False,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture(scope="function")
def auth_headers(client, super_admin_user):
    """Login as super_admin and return auth headers with Bearer token."""
    login_response = client.post(
        "/api/auth/login",
        data={"username": super_admin_user.username, "password": "TestPass123!"},
    )
    assert login_response.status_code == 200, f"Login failed: {login_response.text}"
    token = login_response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
