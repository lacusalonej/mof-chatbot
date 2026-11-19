"""Document API tests."""

import io
import pytest


class TestUploadDocument:
    """Tests for document upload."""

    def test_upload_txt_file(self, client, auth_headers):
        """Upload a valid TXT file succeeds."""
        file_content = io.BytesIO("นี่คือเนื้อหาเอกสารทดสอบสำหรับระบบ chatbot".encode("utf-8"))
        response = client.post(
            "/api/documents/upload",
            headers=auth_headers,
            files={"file": ("test.txt", file_content, "text/plain")},
            data={"title": "เอกสารทดสอบ", "category": "ทั่วไป", "classification": "PUBLIC"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "อัปโหลดเอกสารเรียบร้อยแล้ว"
        assert data["document"]["title"] == "เอกสารทดสอบ"
        assert data["document"]["classification"] == "PUBLIC"
        assert data["document"]["file_type"] == "txt"
        assert "id" in data["document"]
        assert "document_id" in data["document"]

    def test_upload_unsupported_file_type(self, client, auth_headers):
        """Uploading an unsupported file type returns 400."""
        file_content = io.BytesIO(b"fake executable content")
        response = client.post(
            "/api/documents/upload",
            headers=auth_headers,
            files={"file": ("malware.exe", file_content, "application/octet-stream")},
        )
        assert response.status_code == 400

    def test_upload_without_auth(self, client):
        """Upload without authentication returns 401."""
        file_content = io.BytesIO(b"test content")
        response = client.post(
            "/api/documents/upload",
            files={"file": ("test.txt", file_content, "text/plain")},
        )
        assert response.status_code == 401


class TestListDocuments:
    """Tests for listing documents."""

    def test_list_documents(self, client, auth_headers):
        """List documents returns a list."""
        response = client.get("/api/documents", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "documents" in data
        assert isinstance(data["documents"], list)

    def test_list_documents_without_auth(self, client):
        """List documents without token returns 401."""
        response = client.get("/api/documents")
        assert response.status_code == 401


class TestGetDocument:
    """Tests for getting a single document."""

    def test_get_document(self, client, auth_headers):
        """Get a document by ID."""
        # Upload a document first
        file_content = io.BytesIO("เนื้อหาสำหรับดูรายละเอียด".encode("utf-8"))
        upload_response = client.post(
            "/api/documents/upload",
            headers=auth_headers,
            files={"file": ("detail.txt", file_content, "text/plain")},
            data={"title": "เอกสารดูรายละเอียด"},
        )
        document_id = upload_response.json()["document"]["id"]

        response = client.get(
            f"/api/documents/{document_id}", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == document_id
        assert data["title"] == "เอกสารดูรายละเอียด"

    def test_get_nonexistent_document(self, client, auth_headers):
        """Get nonexistent document returns 404."""
        response = client.get("/api/documents/99999", headers=auth_headers)
        assert response.status_code == 404


class TestDeleteDocument:
    """Tests for deleting documents."""

    def test_delete_document(self, client, auth_headers):
        """Delete a document by ID."""
        # Upload a document first
        file_content = io.BytesIO("เนื้อหาสำหรับลบ".encode("utf-8"))
        upload_response = client.post(
            "/api/documents/upload",
            headers=auth_headers,
            files={"file": ("delete.txt", file_content, "text/plain")},
            data={"title": "เอกสารสำหรับลบ"},
        )
        document_id = upload_response.json()["document"]["id"]

        response = client.delete(
            f"/api/documents/{document_id}", headers=auth_headers
        )
        assert response.status_code == 200
        assert "message" in response.json()

        # Verify it's gone
        get_response = client.get(
            f"/api/documents/{document_id}", headers=auth_headers
        )
        assert get_response.status_code == 404

    def test_delete_nonexistent_document(self, client, auth_headers):
        """Delete nonexistent document returns 404."""
        response = client.delete("/api/documents/99999", headers=auth_headers)
        assert response.status_code == 404
