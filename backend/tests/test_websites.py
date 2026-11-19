"""Website source API tests."""
import uuid

import pytest


class TestListWebsites:
    """Tests for listing website sources."""

    def test_list_websites(self, client, auth_headers):
        """List website sources."""
        response = client.get("/api/websites", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "websites" in data or isinstance(data, list)

    def test_list_websites_without_auth(self, client):
        """List websites without token returns 401."""
        response = client.get("/api/websites")
        assert response.status_code == 401


class TestCreateWebsite:
    """Tests for creating website sources."""

    def test_create_website(self, client, auth_headers):
        """Create a website source."""
        unique_url = f"https://psdg.mof.go.th/test-{uuid.uuid4().hex[:8]}"
        response = client.post(
            "/api/websites",
            headers=auth_headers,
            json={"url": unique_url, "name": "PSDG Website"},
        )
        assert response.status_code in (200, 201)
        data = response.json()
        assert "url" in data or "website" in data

    def test_create_website_without_auth(self, client):
        """Create website without token returns 401."""
        response = client.post(
            "/api/websites",
            json={"url": "https://example.com"},
        )
        assert response.status_code == 401
