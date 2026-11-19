"""Admin API tests."""

import pytest


class TestAdminStats:
    """Tests for admin stats endpoint."""

    def test_get_stats(self, client, auth_headers):
        """Get system stats."""
        response = client.get("/api/admin/stats", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "document_count" in data
        assert "chat_count" in data or "session_count" in data

    def test_get_stats_without_auth(self, client):
        """Get stats without token returns 401."""
        response = client.get("/api/admin/stats")
        assert response.status_code == 401


class TestAdminUsers:
    """Tests for admin user management."""

    def test_list_users(self, client, auth_headers):
        """List all users."""
        response = client.get("/api/admin/users", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "users" in data
        assert isinstance(data["users"], list)

    def test_list_users_without_auth(self, client):
        """List users without token returns 401."""
        response = client.get("/api/admin/users")
        assert response.status_code == 401


class TestAdminAuditLogs:
    """Tests for admin audit logs."""

    def test_list_audit_logs(self, client, auth_headers):
        """List audit logs."""
        response = client.get("/api/admin/audit-logs", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "logs" in data

    def test_list_audit_logs_without_auth(self, client):
        """List audit logs without token returns 401."""
        response = client.get("/api/admin/audit-logs")
        assert response.status_code == 401


class TestAdminSystemStatus:
    """Tests for admin system status."""

    def test_system_status(self, client, auth_headers):
        """Get system status."""
        response = client.get("/api/admin/system-status", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "status" in data or "ai_provider" in data
