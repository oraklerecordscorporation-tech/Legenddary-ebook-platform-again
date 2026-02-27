#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime
import uuid

class LegendaryAPITester:
    def __init__(self, base_url="https://ebook-builder-ai.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=30)

            success = response.status_code == expected_status
            
            if success:
                self.log_test(name, True)
                try:
                    return True, response.json()
                except:
                    return True, {}
            else:
                self.log_test(name, False, f"Expected {expected_status}, got {response.status_code}: {response.text[:200]}")
                return False, {}

        except Exception as e:
            self.log_test(name, False, f"Request failed: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test API health endpoints"""
        print("\n🔍 Testing Health Endpoints...")
        self.run_test("Health Check", "GET", "", 200)
        self.run_test("Health Status", "GET", "health", 200)

    def test_user_registration(self):
        """Test user registration"""
        print("\n🔍 Testing User Registration...")
        test_email = f"test_{uuid.uuid4().hex[:8]}@example.com"
        test_name = f"Test User {uuid.uuid4().hex[:6]}"
        
        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data={
                "email": test_email,
                "password": "TestPass123!",
                "name": test_name
            }
        )
        
        if success and 'token' in response:
            self.token = response['token']
            self.user_id = response['user']['id']
            self.log_test("Token Received", True)
            return True
        else:
            self.log_test("Token Received", False, "No token in response")
            return False

    def test_user_login(self):
        """Test user login with existing credentials"""
        print("\n🔍 Testing User Login...")
        # First register a user
        test_email = f"login_test_{uuid.uuid4().hex[:8]}@example.com"
        
        # Register
        success, reg_response = self.run_test(
            "Register for Login Test",
            "POST",
            "auth/register",
            200,
            data={
                "email": test_email,
                "password": "LoginTest123!",
                "name": "Login Test User"
            }
        )
        
        if not success:
            return False
            
        # Now test login
        success, login_response = self.run_test(
            "User Login",
            "POST",
            "auth/login",
            200,
            data={
                "email": test_email,
                "password": "LoginTest123!"
            }
        )
        
        return success and 'token' in login_response

    def test_user_profile(self):
        """Test getting user profile"""
        print("\n🔍 Testing User Profile...")
        if not self.token:
            self.log_test("Get User Profile", False, "No auth token available")
            return False
            
        success, response = self.run_test("Get User Profile", "GET", "auth/me", 200)
        return success

    def test_book_operations(self):
        """Test book CRUD operations"""
        print("\n🔍 Testing Book Operations...")
        if not self.token:
            self.log_test("Book Operations", False, "No auth token available")
            return False

        # Create book
        book_data = {
            "title": f"Test Book {uuid.uuid4().hex[:6]}",
            "description": "A test book for API testing",
            "genre": "Fiction"
        }
        
        success, create_response = self.run_test(
            "Create Book",
            "POST",
            "books",
            200,
            data=book_data
        )
        
        if not success or 'id' not in create_response:
            return False
            
        book_id = create_response['id']
        
        # Get books list
        success, _ = self.run_test("Get Books List", "GET", "books", 200)
        if not success:
            return False
            
        # Get specific book
        success, _ = self.run_test("Get Specific Book", "GET", f"books/{book_id}", 200)
        if not success:
            return False
            
        # Update book
        update_data = {"title": "Updated Test Book"}
        success, _ = self.run_test(
            "Update Book",
            "PUT",
            f"books/{book_id}",
            200,
            data=update_data
        )
        if not success:
            return False
            
        # Delete book
        success, _ = self.run_test("Delete Book", "DELETE", f"books/{book_id}", 200)
        return success

    def test_chapter_operations(self):
        """Test chapter CRUD operations"""
        print("\n🔍 Testing Chapter Operations...")
        if not self.token:
            self.log_test("Chapter Operations", False, "No auth token available")
            return False

        # First create a book
        book_data = {
            "title": f"Chapter Test Book {uuid.uuid4().hex[:6]}",
            "description": "Book for chapter testing",
            "genre": "Test"
        }
        
        success, book_response = self.run_test(
            "Create Book for Chapters",
            "POST",
            "books",
            200,
            data=book_data
        )
        
        if not success or 'id' not in book_response:
            return False
            
        book_id = book_response['id']
        
        # Create chapter
        chapter_data = {
            "title": "Test Chapter 1",
            "type": "chapter",
            "order": 1
        }
        
        success, chapter_response = self.run_test(
            "Create Chapter",
            "POST",
            f"books/{book_id}/chapters",
            200,
            data=chapter_data
        )
        
        if not success or 'id' not in chapter_response:
            return False
            
        chapter_id = chapter_response['id']
        
        # Get chapters
        success, _ = self.run_test("Get Chapters", "GET", f"books/{book_id}/chapters", 200)
        if not success:
            return False
            
        # Update chapter
        update_data = {
            "content": "This is test chapter content with some words to test word count."
        }
        success, _ = self.run_test(
            "Update Chapter",
            "PUT",
            f"chapters/{chapter_id}",
            200,
            data=update_data
        )
        if not success:
            return False
            
        # Delete chapter
        success, _ = self.run_test("Delete Chapter", "DELETE", f"chapters/{chapter_id}", 200)
        return success

    def test_ai_suggestions(self):
        """Test AI suggestion endpoints"""
        print("\n🔍 Testing AI Suggestions...")
        if not self.token:
            self.log_test("AI Suggestions", False, "No auth token available")
            return False

        ai_requests = [
            {"type": "content", "prompt": "Help me write about a mysterious forest"},
            {"type": "style", "prompt": "The quick brown fox jumps over the lazy dog"},
            {"type": "footnote", "prompt": "Historical reference needed", "context": "World War II"},
            {"type": "publishing", "prompt": "Fantasy novel about dragons", "context": "Fantasy"},
            {"type": "marketing", "prompt": "Romance novel", "context": "Young adults"}
        ]
        
        all_success = True
        for req in ai_requests:
            success, response = self.run_test(
                f"AI Suggestion - {req['type']}",
                "POST",
                "ai/suggest",
                200,
                data=req
            )
            if not success:
                all_success = False
            elif 'result' not in response:
                self.log_test(f"AI Response Content - {req['type']}", False, "No result in response")
                all_success = False
            else:
                self.log_test(f"AI Response Content - {req['type']}", True)
                
        return all_success

    def test_image_search(self):
        """Test image search functionality"""
        print("\n🔍 Testing Image Search...")
        if not self.token:
            self.log_test("Image Search", False, "No auth token available")
            return False

        search_data = {
            "query": "book cover",
            "count": 6
        }
        
        success, response = self.run_test(
            "Image Search",
            "POST",
            "images/search",
            200,
            data=search_data
        )
        
        if success and isinstance(response, list):
            self.log_test("Image Search Results", True, f"Got {len(response)} results")
            return True
        else:
            self.log_test("Image Search Results", False, "Invalid response format")
            return False

    def test_signature_operations(self):
        """Test signature CRUD operations"""
        print("\n🔍 Testing Signature Operations...")
        if not self.token:
            self.log_test("Signature Operations", False, "No auth token available")
            return False

        # Create signature (mock base64 data)
        signature_data = {
            "name": f"Test Signature {uuid.uuid4().hex[:6]}",
            "data": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
        }
        
        success, sig_response = self.run_test(
            "Create Signature",
            "POST",
            "signatures",
            200,
            data=signature_data
        )
        
        if not success or 'id' not in sig_response:
            return False
            
        sig_id = sig_response['id']
        
        # Get signatures
        success, _ = self.run_test("Get Signatures", "GET", "signatures", 200)
        if not success:
            return False
            
        # Delete signature
        success, _ = self.run_test("Delete Signature", "DELETE", f"signatures/{sig_id}", 200)
        return success

    def test_export_functionality(self):
        """Test book export functionality"""
        print("\n🔍 Testing Export Functionality...")
        if not self.token:
            self.log_test("Export Functionality", False, "No auth token available")
            return False

        # Create a book with chapters for export
        book_data = {
            "title": f"Export Test Book {uuid.uuid4().hex[:6]}",
            "description": "Book for export testing",
            "genre": "Test"
        }
        
        success, book_response = self.run_test(
            "Create Book for Export",
            "POST",
            "books",
            200,
            data=book_data
        )
        
        if not success or 'id' not in book_response:
            return False
            
        book_id = book_response['id']
        
        # Add a chapter
        chapter_data = {
            "title": "Export Test Chapter",
            "type": "chapter",
            "order": 1
        }
        
        success, chapter_response = self.run_test(
            "Create Chapter for Export",
            "POST",
            f"books/{book_id}/chapters",
            200,
            data=chapter_data
        )
        
        if not success:
            return False
            
        # Update chapter with content
        chapter_id = chapter_response['id']
        update_data = {
            "content": "This is test content for export functionality testing."
        }
        success, _ = self.run_test(
            "Add Content to Chapter",
            "PUT",
            f"chapters/{chapter_id}",
            200,
            data=update_data
        )
        
        if not success:
            return False
        
        # Test PDF export
        export_data = {"book_id": book_id, "format": "pdf"}
        success, pdf_response = self.run_test(
            "Export PDF",
            "POST",
            "export",
            200,
            data=export_data
        )
        
        if success and 'data' in pdf_response:
            self.log_test("PDF Export Data", True)
        else:
            self.log_test("PDF Export Data", False, "No data in response")
            
        # Test EPUB export
        export_data = {"book_id": book_id, "format": "epub"}
        success, epub_response = self.run_test(
            "Export EPUB",
            "POST",
            "export",
            200,
            data=export_data
        )
        
        if success and 'data' in epub_response:
            self.log_test("EPUB Export Data", True)
        else:
            self.log_test("EPUB Export Data", False, "No data in response")
            
        return success

    def test_stats_endpoint(self):
        """Test user stats endpoint"""
        print("\n🔍 Testing Stats Endpoint...")
        if not self.token:
            self.log_test("Stats Endpoint", False, "No auth token available")
            return False

        success, response = self.run_test("Get User Stats", "GET", "stats", 200)
        
        if success and isinstance(response, dict):
            required_fields = ['total_books', 'total_words', 'total_chapters']
            all_fields_present = all(field in response for field in required_fields)
            self.log_test("Stats Fields Present", all_fields_present, 
                         f"Missing fields: {[f for f in required_fields if f not in response]}")
            return all_fields_present
        else:
            self.log_test("Stats Response Format", False, "Invalid response format")
            return False

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting Legenddary API Tests...")
        print(f"📡 Testing against: {self.base_url}")
        print("=" * 60)

        # Test sequence
        test_methods = [
            self.test_health_check,
            self.test_user_registration,
            self.test_user_login,
            self.test_user_profile,
            self.test_book_operations,
            self.test_chapter_operations,
            self.test_ai_suggestions,
            self.test_image_search,
            self.test_signature_operations,
            self.test_export_functionality,
            self.test_stats_endpoint
        ]

        for test_method in test_methods:
            try:
                test_method()
            except Exception as e:
                print(f"❌ {test_method.__name__} - CRASHED: {str(e)}")
                self.tests_run += 1

        # Print summary
        print("\n" + "=" * 60)
        print(f"📊 Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        print(f"✅ Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            print("⚠️  Some tests failed - check logs above")
            return 1

def main():
    tester = LegendaryAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())