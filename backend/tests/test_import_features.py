"""
Legenddary Import Features - Backend API Tests
Tests: Auth, Books CRUD, Import endpoints (batch, url, smart-paste), Chapter reorder
"""
import pytest
import requests
import os
import io
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
TEST_EMAIL = f"test_import_{datetime.now().strftime('%H%M%S')}@test.com"
TEST_PASSWORD = "TestPass123!"
TEST_NAME = "Test Import User"


class TestHealthAndBasics:
    """Health check and basic connectivity"""
    
    def test_health_endpoint(self):
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print(f"SUCCESS: Health endpoint working - {data}")
    
    def test_root_endpoint(self):
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "Legenddary" in data["message"]
        print(f"SUCCESS: Root endpoint working - {data}")


class TestAuthFlow:
    """Auth registration, login, refresh token flow"""
    
    @pytest.fixture(scope="class")
    def auth_session(self):
        """Register and return auth data"""
        session = requests.Session()
        
        # Register new user
        response = session.post(f"{BASE_URL}/api/auth/register", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "name": TEST_NAME
        })
        assert response.status_code == 200, f"Registration failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert "user" in data
        print(f"SUCCESS: User registered - {data['user']['email']}")
        return data
    
    def test_auth_register(self, auth_session):
        """Validate registration response structure"""
        assert auth_session["user"]["email"] == TEST_EMAIL
        assert auth_session["user"]["name"] == TEST_NAME
        assert auth_session["user"]["subscription_tier"] == "free"
        print("SUCCESS: Registration response structure validated")
    
    def test_auth_login(self, auth_session):
        """Test login with registered credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["email"] == TEST_EMAIL
        print("SUCCESS: Login working correctly")
    
    def test_auth_refresh(self, auth_session):
        """Test token refresh endpoint"""
        response = requests.post(f"{BASE_URL}/api/auth/refresh", json={
            "refresh_token": auth_session["refresh_token"]
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        print("SUCCESS: Token refresh working correctly")
    
    def test_auth_me(self, auth_session):
        """Test get current user endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {auth_session['access_token']}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == TEST_EMAIL
        print("SUCCESS: /auth/me endpoint working")


class TestBooksCRUD:
    """Book CRUD operations with auth"""
    
    @pytest.fixture(scope="class")
    def authenticated_session(self):
        """Get authenticated session for tests"""
        # Register/login
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code != 200:
            # Register first
            response = requests.post(f"{BASE_URL}/api/auth/register", json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD,
                "name": TEST_NAME
            })
        
        data = response.json()
        session = requests.Session()
        session.headers.update({"Authorization": f"Bearer {data['access_token']}"})
        return session, data
    
    def test_create_book(self, authenticated_session):
        """Test creating a new book"""
        session, _ = authenticated_session
        response = session.post(f"{BASE_URL}/api/books", json={
            "title": "TEST_Import Test Book",
            "description": "A book for testing import features",
            "genre": "Test"
        })
        assert response.status_code == 200, f"Create book failed: {response.text}"
        data = response.json()
        assert data["title"] == "TEST_Import Test Book"
        assert "id" in data
        print(f"SUCCESS: Book created - ID: {data['id']}")
        return data["id"]
    
    def test_get_books(self, authenticated_session):
        """Test listing user's books"""
        session, _ = authenticated_session
        response = session.get(f"{BASE_URL}/api/books")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: Got {len(data)} books")
    
    def test_create_and_get_book(self, authenticated_session):
        """Test create book and verify with GET"""
        session, _ = authenticated_session
        
        # Create
        create_resp = session.post(f"{BASE_URL}/api/books", json={
            "title": "TEST_Verify Book",
            "description": "Verify this book exists",
            "genre": "Fiction"
        })
        assert create_resp.status_code == 200
        book_id = create_resp.json()["id"]
        
        # GET to verify persistence
        get_resp = session.get(f"{BASE_URL}/api/books/{book_id}")
        assert get_resp.status_code == 200
        book_data = get_resp.json()
        assert book_data["title"] == "TEST_Verify Book"
        assert book_data["id"] == book_id
        print("SUCCESS: Book creation and GET verification passed")


class TestImportEndpoints:
    """Import Center endpoints - batch, url, smart-paste"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get auth token for import tests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code != 200:
            response = requests.post(f"{BASE_URL}/api/auth/register", json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD,
                "name": TEST_NAME
            })
        return response.json()["access_token"]
    
    def test_batch_import_requires_auth(self):
        """Batch import should require authentication (not 404)"""
        response = requests.post(f"{BASE_URL}/api/import/batch")
        assert response.status_code == 401 or response.status_code == 422  # 401 auth or 422 validation
        assert response.status_code != 404
        print("SUCCESS: /api/import/batch endpoint exists and requires auth")
    
    def test_url_import_requires_auth(self):
        """URL import should require authentication (not 404)"""
        response = requests.post(f"{BASE_URL}/api/import/url", json={"url": "https://example.com"})
        assert response.status_code == 401
        assert response.status_code != 404
        print("SUCCESS: /api/import/url endpoint exists and requires auth")
    
    def test_smart_paste_requires_auth(self):
        """Smart paste should require authentication (not 404)"""
        response = requests.post(f"{BASE_URL}/api/import/smart-paste", json={"content": "test"})
        assert response.status_code == 401
        assert response.status_code != 404
        print("SUCCESS: /api/import/smart-paste endpoint exists and requires auth")
    
    def test_detect_structure_requires_auth(self):
        """AI detect-structure should require authentication (not 404)"""
        response = requests.post(f"{BASE_URL}/api/ai/detect-structure", json={"content": "test"})
        assert response.status_code == 401
        assert response.status_code != 404
        print("SUCCESS: /api/ai/detect-structure endpoint exists and requires auth")
    
    def test_url_import_with_auth(self, auth_token):
        """Test URL import with valid auth"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Test with empty URL (should return 400, not 500)
        response = requests.post(
            f"{BASE_URL}/api/import/url",
            json={"url": ""},
            headers=headers
        )
        assert response.status_code == 400
        assert "URL required" in response.json().get("detail", "")
        print("SUCCESS: URL import validation working")
    
    def test_url_import_with_valid_url(self, auth_token):
        """Test URL import with a valid URL"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Test with simple URL
        response = requests.post(
            f"{BASE_URL}/api/import/url",
            json={"url": "https://www.example.com"},
            headers=headers
        )
        # Should either succeed (200) or fail gracefully (400), not 500
        assert response.status_code in [200, 400]
        print(f"SUCCESS: URL import responded with {response.status_code}")
    
    def test_google_drive_url_handling(self, auth_token):
        """Test Google Drive URL parsing"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Test with fake Google Drive URL (should handle gracefully)
        response = requests.post(
            f"{BASE_URL}/api/import/url",
            json={"url": "https://drive.google.com/file/d/abc123/view"},
            headers=headers
        )
        # Should handle gracefully even if file doesn't exist
        assert response.status_code in [200, 400]
        print(f"SUCCESS: Google Drive URL handled with status {response.status_code}")
    
    def test_smart_paste_with_auth(self, auth_token):
        """Test smart paste with valid auth and content"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Test with empty content (should return 400)
        response = requests.post(
            f"{BASE_URL}/api/import/smart-paste",
            json={"content": ""},
            headers=headers
        )
        assert response.status_code == 400
        
        # Test with valid content
        response = requests.post(
            f"{BASE_URL}/api/import/smart-paste",
            json={"content": "Chapter 1: Introduction\n\nThis is the first paragraph.\n\nChapter 2: Methods\n\nThis is another section."},
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "cleaned" in data
        print(f"SUCCESS: Smart paste returned cleaned content")
    
    def test_detect_structure_with_auth(self, auth_token):
        """Test AI structure detection"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response = requests.post(
            f"{BASE_URL}/api/ai/detect-structure",
            json={
                "content": "Chapter 1: The Beginning\n\nOnce upon a time...\n\nChapter 2: The Middle\n\nThe story continues...",
                "split_by": "chapter"
            },
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "chapters" in data
        assert "count" in data
        print(f"SUCCESS: Structure detection found {data['count']} chapters")


class TestChapterReorder:
    """Chapter reorder endpoint tests"""
    
    @pytest.fixture(scope="class")
    def book_with_chapters(self):
        """Create a book with chapters for reorder testing"""
        # Login
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code != 200:
            response = requests.post(f"{BASE_URL}/api/auth/register", json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD,
                "name": TEST_NAME
            })
        
        token = response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Create book
        book_resp = requests.post(
            f"{BASE_URL}/api/books",
            json={"title": "TEST_Reorder Book", "description": "For reorder testing"},
            headers=headers
        )
        book_id = book_resp.json()["id"]
        
        # Create chapters
        chapter_ids = []
        for i in range(3):
            ch_resp = requests.post(
                f"{BASE_URL}/api/books/{book_id}/chapters",
                json={"title": f"Chapter {i+1}", "type": "chapter", "order": i * 10},
                headers=headers
            )
            chapter_ids.append(ch_resp.json()["id"])
        
        return {"book_id": book_id, "chapter_ids": chapter_ids, "token": token}
    
    def test_reorder_chapters_requires_auth(self):
        """Reorder endpoint should require auth (not 404)"""
        response = requests.put(
            f"{BASE_URL}/api/books/fake-id/reorder-chapters",
            json=[]
        )
        assert response.status_code == 401
        assert response.status_code != 404
        print("SUCCESS: /api/books/{id}/reorder-chapters exists and requires auth")
    
    def test_reorder_chapters(self, book_with_chapters):
        """Test reordering chapters"""
        data = book_with_chapters
        headers = {"Authorization": f"Bearer {data['token']}"}
        
        # Reverse the chapter order
        reversed_ids = list(reversed(data["chapter_ids"]))
        
        response = requests.put(
            f"{BASE_URL}/api/books/{data['book_id']}/reorder-chapters",
            json=reversed_ids,
            headers=headers
        )
        assert response.status_code == 200
        result = response.json()
        assert result["reordered"] == 3
        print("SUCCESS: Chapter reorder working correctly")


class TestStats:
    """Stats endpoint test"""
    
    def test_stats_endpoint(self):
        """Test stats endpoint requires auth"""
        response = requests.get(f"{BASE_URL}/api/stats")
        assert response.status_code == 401
        print("SUCCESS: Stats endpoint exists and requires auth")


# Cleanup fixture
@pytest.fixture(scope="session", autouse=True)
def cleanup():
    """Cleanup test data after all tests"""
    yield
    # Note: In production, implement proper cleanup of TEST_ prefixed data
    print("Test session complete - cleanup would run here")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
