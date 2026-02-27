"""
Legenddary - Idea Wizard & Focus Mode Backend Tests
Tests: Idea Wizard endpoint, book + chapter generation, Focus Mode state
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
TEST_EMAIL = f"test_wizard_{datetime.now().strftime('%H%M%S%f')}@test.com"
TEST_PASSWORD = "WizardTest123!"
TEST_NAME = "Wizard Test User"


class TestHealthCheck:
    """Ensure backend is healthy before running Idea Wizard tests"""
    
    def test_health_endpoint(self):
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print(f"SUCCESS: Health check passed - {data}")


class TestIdeaWizardAuth:
    """Test Idea Wizard endpoint requires authentication"""
    
    def test_wizard_create_requires_auth(self):
        """POST /api/ideas/wizard-create should require authentication"""
        response = requests.post(f"{BASE_URL}/api/ideas/wizard-create", json={
            "idea": "Test idea",
            "genre": "Fantasy",
            "tone": "Epic",
            "audience": "Young Adults",
            "chapter_count": 5
        })
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        assert response.status_code != 404, "Endpoint should exist (404 not acceptable)"
        print(f"SUCCESS: /api/ideas/wizard-create requires auth (status: {response.status_code})")


class TestIdeaWizardFunctionality:
    """Full Idea Wizard flow tests"""
    
    @pytest.fixture(scope="class")
    def auth_data(self):
        """Register a new user and return auth data"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "name": TEST_NAME
        })
        assert response.status_code == 200, f"Registration failed: {response.text}"
        data = response.json()
        print(f"SUCCESS: Registered user {data['user']['email']}")
        return data
    
    def test_wizard_create_with_valid_data(self, auth_data):
        """Test creating book from Idea Wizard with valid inputs"""
        headers = {"Authorization": f"Bearer {auth_data['access_token']}"}
        
        response = requests.post(
            f"{BASE_URL}/api/ideas/wizard-create",
            json={
                "idea": "A young wizard discovers an ancient spell book that grants them powers but slowly corrupts their soul",
                "genre": "Fantasy",
                "tone": "Dark",
                "audience": "Young Adults",
                "chapter_count": 8,
                "title_hint": "The Corrupted Tome"
            },
            headers=headers,
            timeout=60  # AI generation can take time
        )
        
        assert response.status_code == 200, f"Wizard create failed: {response.text}"
        data = response.json()
        
        # Validate response structure
        assert "book_id" in data, "Response should contain book_id"
        assert "title" in data, "Response should contain title"
        assert "chapter_count" in data, "Response should contain chapter_count"
        assert "outline" in data, "Response should contain outline"
        assert "first_chapter_id" in data, "Response should contain first_chapter_id"
        
        # Validate data values
        assert len(data["book_id"]) > 0, "book_id should not be empty"
        assert data["chapter_count"] == 8, f"Expected 8 chapters, got {data['chapter_count']}"
        assert len(data["outline"]) == 8, f"Outline should have 8 items, got {len(data['outline'])}"
        assert len(data["first_chapter_id"]) > 0, "first_chapter_id should not be empty"
        
        print(f"SUCCESS: Wizard created book '{data['title']}' with {data['chapter_count']} chapters")
        print(f"  Book ID: {data['book_id']}")
        print(f"  First Chapter ID: {data['first_chapter_id']}")
        
        return data
    
    def test_wizard_book_persists_in_db(self, auth_data):
        """Verify the wizard-created book actually exists in DB"""
        headers = {"Authorization": f"Bearer {auth_data['access_token']}"}
        
        # First create a book
        create_response = requests.post(
            f"{BASE_URL}/api/ideas/wizard-create",
            json={
                "idea": "A detective in a cyberpunk city solves crimes using AI",
                "genre": "Sci-Fi",
                "tone": "Cinematic",
                "audience": "General Adult Readers",
                "chapter_count": 5
            },
            headers=headers,
            timeout=60
        )
        assert create_response.status_code == 200
        wizard_data = create_response.json()
        book_id = wizard_data["book_id"]
        
        # GET the book to verify persistence
        get_response = requests.get(f"{BASE_URL}/api/books/{book_id}", headers=headers)
        assert get_response.status_code == 200, f"Failed to GET created book: {get_response.text}"
        book_data = get_response.json()
        
        assert book_data["id"] == book_id
        assert book_data["genre"] == "Sci-Fi"
        print(f"SUCCESS: Wizard book verified in DB - '{book_data['title']}'")
    
    def test_wizard_chapters_created(self, auth_data):
        """Verify wizard creates correct number of chapters with content"""
        headers = {"Authorization": f"Bearer {auth_data['access_token']}"}
        
        # Create book with 6 chapters
        create_response = requests.post(
            f"{BASE_URL}/api/ideas/wizard-create",
            json={
                "idea": "A chef travels the world learning ancient recipes",
                "genre": "Romance",
                "tone": "Warm",
                "audience": "General Adult Readers",
                "chapter_count": 6
            },
            headers=headers,
            timeout=60
        )
        assert create_response.status_code == 200
        wizard_data = create_response.json()
        book_id = wizard_data["book_id"]
        
        # GET chapters to verify
        chapters_response = requests.get(
            f"{BASE_URL}/api/books/{book_id}/chapters",
            headers=headers
        )
        assert chapters_response.status_code == 200
        chapters = chapters_response.json()
        
        assert len(chapters) == 6, f"Expected 6 chapters, got {len(chapters)}"
        
        # First chapter should have content (draft)
        first_chapter = next((c for c in chapters if c["id"] == wizard_data["first_chapter_id"]), None)
        assert first_chapter is not None, "First chapter not found"
        assert len(first_chapter["content"]) > 0, "First chapter should have content"
        assert first_chapter["word_count"] > 0, "First chapter should have word count > 0"
        
        print(f"SUCCESS: {len(chapters)} chapters created, first chapter has {first_chapter['word_count']} words")
    
    def test_wizard_validates_chapter_count_min(self, auth_data):
        """Test wizard rejects chapter_count below minimum (3)"""
        headers = {"Authorization": f"Bearer {auth_data['access_token']}"}
        
        response = requests.post(
            f"{BASE_URL}/api/ideas/wizard-create",
            json={
                "idea": "Short story test",
                "genre": "Fantasy",
                "tone": "Epic",
                "audience": "Young Adults",
                "chapter_count": 1  # Below minimum of 3
            },
            headers=headers,
            timeout=30
        )
        
        # Should return 422 validation error
        assert response.status_code == 422, f"Expected validation error, got {response.status_code}"
        print("SUCCESS: Wizard correctly rejects chapter_count < 3")
    
    def test_wizard_validates_chapter_count_max(self, auth_data):
        """Test wizard rejects chapter_count above maximum (20)"""
        headers = {"Authorization": f"Bearer {auth_data['access_token']}"}
        
        response = requests.post(
            f"{BASE_URL}/api/ideas/wizard-create",
            json={
                "idea": "Long book test",
                "genre": "Fantasy",
                "tone": "Epic",
                "audience": "Young Adults",
                "chapter_count": 25  # Above maximum of 20
            },
            headers=headers,
            timeout=30
        )
        
        # Should return 422 validation error
        assert response.status_code == 422, f"Expected validation error, got {response.status_code}"
        print("SUCCESS: Wizard correctly rejects chapter_count > 20")
    
    def test_wizard_requires_idea_field(self, auth_data):
        """Test wizard requires idea field"""
        headers = {"Authorization": f"Bearer {auth_data['access_token']}"}
        
        response = requests.post(
            f"{BASE_URL}/api/ideas/wizard-create",
            json={
                "genre": "Fantasy",
                "tone": "Epic",
                "audience": "Young Adults",
                "chapter_count": 8
                # Missing idea field
            },
            headers=headers,
            timeout=30
        )
        
        # Should return 422 validation error
        assert response.status_code == 422, f"Expected validation error, got {response.status_code}"
        print("SUCCESS: Wizard correctly requires 'idea' field")


class TestBookEditorSaveWithFocusMode:
    """Test save functionality works regardless of focus mode state"""
    
    @pytest.fixture(scope="class")
    def book_with_chapter(self):
        """Create a book and chapter for testing"""
        # Login with existing or create new user
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if login_response.status_code != 200:
            register_response = requests.post(f"{BASE_URL}/api/auth/register", json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD,
                "name": TEST_NAME
            })
            token = register_response.json()["access_token"]
        else:
            token = login_response.json()["access_token"]
        
        headers = {"Authorization": f"Bearer {token}"}
        
        # Create book
        book_response = requests.post(
            f"{BASE_URL}/api/books",
            json={"title": "TEST_Focus Mode Book", "description": "Testing save in focus mode"},
            headers=headers
        )
        book_id = book_response.json()["id"]
        
        # Create chapter
        chapter_response = requests.post(
            f"{BASE_URL}/api/books/{book_id}/chapters",
            json={"title": "Test Chapter", "type": "chapter", "order": 10},
            headers=headers
        )
        chapter_id = chapter_response.json()["id"]
        
        return {"book_id": book_id, "chapter_id": chapter_id, "token": token}
    
    def test_chapter_update_works(self, book_with_chapter):
        """Test that chapter content can be saved (simulates focus mode save)"""
        data = book_with_chapter
        headers = {"Authorization": f"Bearer {data['token']}"}
        
        # Update chapter content (what save button does)
        new_content = "<p>This is my focus mode writing session content.</p>"
        response = requests.put(
            f"{BASE_URL}/api/chapters/{data['chapter_id']}",
            json={"content": new_content},
            headers=headers
        )
        
        assert response.status_code == 200, f"Save failed: {response.text}"
        updated = response.json()
        assert updated["content"] == new_content
        assert updated["word_count"] > 0
        
        # Verify persistence with GET
        get_response = requests.get(
            f"{BASE_URL}/api/books/{data['book_id']}/chapters",
            headers=headers
        )
        chapters = get_response.json()
        chapter = next(c for c in chapters if c["id"] == data["chapter_id"])
        assert chapter["content"] == new_content
        
        print("SUCCESS: Chapter save works correctly (focus mode save scenario)")


class TestRegressionBookCreation:
    """Regression: normal dashboard book creation still works"""
    
    def test_normal_book_creation_still_works(self):
        """Ensure normal dashboard 'New Book' dialog flow still works"""
        # Login
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if login_response.status_code != 200:
            register_response = requests.post(f"{BASE_URL}/api/auth/register", json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD,
                "name": TEST_NAME
            })
            token = register_response.json()["access_token"]
        else:
            token = login_response.json()["access_token"]
        
        headers = {"Authorization": f"Bearer {token}"}
        
        # Create book via normal flow (POST /api/books)
        response = requests.post(
            f"{BASE_URL}/api/books",
            json={
                "title": "TEST_Regression Normal Book",
                "description": "Created via normal dashboard dialog",
                "genre": "Mystery"
            },
            headers=headers
        )
        
        assert response.status_code == 200, f"Normal book creation failed: {response.text}"
        data = response.json()
        assert data["title"] == "TEST_Regression Normal Book"
        assert data["genre"] == "Mystery"
        assert "id" in data
        
        print(f"SUCCESS: Normal book creation still works - ID: {data['id']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
