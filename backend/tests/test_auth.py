"""Authentication API tests."""

import pytest
from app.models.user import User


class TestLogin:
    """Tests for the login endpoint."""

    def test_login_success(self, client, super_admin_user):
        """Successful login returns access token and user info."""
        response = client.post(
            "/api/auth/login",
            data={"username": super_admin_user.username, "password": "TestPass123!"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert "expires_in" in data
        assert data["user"]["username"] == super_admin_user.username
        assert data["user"]["role"] == "super_admin"

    def test_login_wrong_password(self, client, super_admin_user):
        """Login with wrong password returns 401."""
        response = client.post(
            "/api/auth/login",
            data={"username": super_admin_user.username, "password": "WrongPass123!"},
        )
        assert response.status_code == 401

    def test_login_nonexistent_user(self, client):
        """Login with nonexistent username returns 401."""
        response = client.post(
            "/api/auth/login",
            data={"username": "nonexistent", "password": "anything"},
        )
        assert response.status_code == 401


class TestLogout:
    """Tests for the logout endpoint."""

    def test_logout_success(self, client, auth_headers):
        """Successful logout returns success message."""
        response = client.post("/api/auth/logout", headers=auth_headers)
        assert response.status_code == 200
        assert "message" in response.json()

    def test_logout_without_token(self, client):
        """Logout without token returns 401."""
        response = client.post("/api/auth/logout")
        assert response.status_code == 401


class TestMe:
    """Tests for the /me endpoint."""

    def test_get_current_user(self, client, auth_headers, super_admin_user):
        """Get current user info with valid token."""
        response = client.get("/api/auth/me", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["username"] == super_admin_user.username
        assert data["role"] == "super_admin"
        assert data["is_active"] is True

    def test_get_current_user_without_token(self, client):
        """Get current user without token returns 401."""
        response = client.get("/api/auth/me")
        assert response.status_code == 401


class TestRegisterFirstAdmin:
    """Tests for the register-first-admin endpoint."""

    def test_register_first_admin_when_none_exists(self, client, db_session):
        """Register first admin succeeds when no users exist."""
        # Clean up existing users first
        db_session.query(User).delete()
        db_session.commit()

        response = client.post(
            "/api/auth/register",
            data={
                "username": "new_admin",
                "email": "new_admin@example.com",
                "password": "NewPass123!",
                "full_name": "New Admin",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["user"]["username"] == "new_admin"
        assert data["user"]["role"] == "super_admin"

    def test_register_when_user_already_exists(self, client, super_admin_user):
        """Register fails when a user already exists."""
        response = client.post(
            "/api/auth/register",
            data={
                "username": "another_admin",
                "email": "another@example.com",
                "password": "Pass123!",
                "full_name": "Another Admin",
            },
        )
        assert response.status_code == 400
        assert "มีผู้ใช้อยู่แล้ว" in response.json()["detail"]
