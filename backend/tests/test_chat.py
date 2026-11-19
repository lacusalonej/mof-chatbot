"""Chat API tests."""

import pytest


class TestCreateConversation:
    """Tests for conversation creation."""

    def test_create_conversation_authenticated(self, client, auth_headers):
        """Authenticated user can create a conversation."""
        response = client.post("/api/chat/conversation", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "conversation_id" in data
        assert "session_id" in data

    def test_create_conversation_without_token(self, client):
        """Creating conversation without token now returns 200 (auth removed)."""
        response = client.post("/api/chat/conversation")
        assert response.status_code == 200
        data = response.json()
        assert "conversation_id" in data
        assert "session_id" in data


class TestSendMessage:
    """Tests for sending messages."""

    def test_send_message_demo_mode(self, client, auth_headers):
        """Sending a message in demo mode returns demo response."""
        # First create a conversation
        conv_response = client.post(
            "/api/chat/conversation", headers=auth_headers
        )
        conversation_id = conv_response.json()["conversation_id"]

        response = client.post(
            "/api/chat/message",
            headers=auth_headers,
            data={"message": "ทดสอบการส่งข้อความ", "conversation_id": conversation_id},
        )
        assert response.status_code == 200
        data = response.json()
        assert "response" in data
        assert "conversation_id" in data
        assert "ai_provider" in data
        assert data["ai_provider"] == "demo"
        assert data["conversation_id"] == conversation_id

    def test_send_message_empty(self, client, auth_headers):
        """Sending an empty message returns 400."""
        response = client.post(
            "/api/chat/message",
            headers=auth_headers,
            data={"message": ""},
        )
        assert response.status_code == 400

    def test_send_message_creates_new_conversation(self, client, auth_headers):
        """Sending a message without conversation_id creates a new conversation."""
        response = client.post(
            "/api/chat/message",
            headers=auth_headers,
            data={"message": "ทดสอบสร้างบทสนทนาใหม่"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "conversation_id" in data
        assert "session_id" in data


class TestGetConversation:
    """Tests for retrieving conversations."""

    def test_get_conversation(self, client, auth_headers):
        """Get a conversation and its messages."""
        # Create conversation and send a message
        conv_response = client.post(
            "/api/chat/conversation", headers=auth_headers
        )
        conversation_id = conv_response.json()["conversation_id"]

        client.post(
            "/api/chat/message",
            headers=auth_headers,
            data={"message": "ข้อความทดสอบ", "conversation_id": conversation_id},
        )

        response = client.get(
            f"/api/chat/conversation/{conversation_id}", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["conversation"]["id"] == conversation_id
        assert len(data["messages"]) >= 1
        assert data["messages"][0]["role"] == "user"

    def test_get_nonexistent_conversation(self, client, auth_headers):
        """Get nonexistent conversation returns 404."""
        response = client.get("/api/chat/conversation/99999", headers=auth_headers)
        assert response.status_code == 404
