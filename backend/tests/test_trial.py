"""Trial link API tests."""

import pytest


class TestCreateTrialLink:
    """Tests for creating trial links."""

    def test_create_trial_link(self, client, auth_headers):
        """Create a trial link."""
        response = client.post(
            "/api/trial/links",
            headers=auth_headers,
            json={"name": "Test Trial", "expiry_days": 7, "max_usages": 100},
        )
        assert response.status_code == 200
        data = response.json()
        assert "trial_link" in data
        assert "token" in data["trial_link"]
        assert "trial_url" in data["trial_link"]
        assert "expires_at" in data["trial_link"]

    def test_create_trial_link_without_auth(self, client):
        """Create trial link without token returns 401."""
        response = client.post(
            "/api/trial/links",
            json={"name": "Test Trial", "expiry_days": 7, "max_usages": 100},
        )
        assert response.status_code == 401


class TestListTrialLinks:
    """Tests for listing trial links."""

    def test_list_trial_links(self, client, auth_headers):
        """List trial links."""
        response = client.get("/api/trial/links", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "trial_links" in data
        assert isinstance(data["trial_links"], list)

    def test_list_trial_links_without_auth(self, client):
        """List trial links without token returns 401."""
        response = client.get("/api/trial/links")
        assert response.status_code == 401


class TestValidateTrialLink:
    """Tests for validating trial links."""

    def test_validate_invalid_trial_link(self, client):
        """Validate an invalid trial link token returns valid=False."""
        response = client.get("/api/trial/validate/invalid_token_12345")
        assert response.status_code == 200
        data = response.json()
        assert data["valid"] is False

    def test_validate_trial_link(self, client, auth_headers):
        """Validate a trial link token."""
        # First create a trial link
        create_response = client.post(
            "/api/trial/links",
            headers=auth_headers,
            json={"name": "Test Trial", "expiry_days": 7, "max_usages": 100},
        )
        assert create_response.status_code == 200
        raw_token = create_response.json()["trial_link"]["token"]

        validate_response = client.get(f"/api/trial/validate/{raw_token}")
        assert validate_response.status_code == 200
        data = validate_response.json()
        assert data["valid"] is True
