#!/usr/bin/env python3
"""
Backend API Testing Suite for Al-Ghazaly Auto Parts
Testing cart and order management system v4.0
"""

import requests
import json
import uuid
from datetime import datetime
import time

# Configuration
BASE_URL = "http://localhost:8001"
API_BASE = f"{BASE_URL}/api"

# Test data
TEST_USER_EMAIL = "testuser@alghazaly.com"
TEST_ADMIN_EMAIL = "testadmin@alghazaly.com"
TEST_CUSTOMER_EMAIL = "customer@alghazaly.com"

class APITester:
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = None
        self.admin_token = None
        self.customer_token = None
        self.test_results = []
        self.test_user_id = None
        self.test_admin_id = None
        self.test_customer_id = None
        self.test_product_id = None
        self.test_order_id = None
        
    def log_result(self, test_name, success, details="", response_data=None):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        result = {
            "test": test_name,
            "status": status,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        if response_data:
            result["response_data"] = response_data
        self.test_results.append(result)
        print(f"{status}: {test_name}")
        if details:
            print(f"   Details: {details}")
        if not success and response_data:
            print(f"   Response: {response_data}")
        print()

    def test_health_check(self):
        """Test 1: Health Check - Should return v4.0.0"""
        try:
            response = self.session.get(f"{API_BASE}/health")
            
            if response.status_code == 200:
                data = response.json()
                if data.get("version") == "4.0.0":
                    self.log_result("Health Check", True, f"Version: {data.get('version')}")
                    return True
                else:
                    self.log_result("Health Check", False, f"Expected v4.0.0, got {data.get('version')}", data)
                    return False
            else:
                self.log_result("Health Check", False, f"HTTP {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Health Check", False, f"Exception: {str(e)}")
            return False

    def setup_test_data(self):
        """Setup test users and products for testing"""
        try:
            # Create test product first
            product_data = {
                "name": "Test Brake Pad",
                "name_ar": "فرامل اختبار",
                "description": "Test brake pad for testing",
                "price": 150.0,
                "sku": f"TEST-BP-{uuid.uuid4().hex[:8]}",
                "stock_quantity": 100
            }
            
            response = self.session.post(f"{API_BASE}/products", json=product_data)
            if response.status_code == 200:
                self.test_product_id = response.json().get("id")
                self.log_result("Setup Test Product", True, f"Product ID: {self.test_product_id}")
            else:
                self.log_result("Setup Test Product", False, f"HTTP {response.status_code}", response.text)
                
        except Exception as e:
            self.log_result("Setup Test Data", False, f"Exception: {str(e)}")

    def test_cart_apis(self):
        """Test Cart APIs"""
        
        # Test GET /api/cart - Get user's cart
        try:
            response = self.session.get(f"{API_BASE}/cart")
            
            if response.status_code == 401:
                self.log_result("GET /api/cart (unauthenticated)", True, "Correctly requires authentication")
            elif response.status_code == 200:
                data = response.json()
                if "items" in data and "total" in data:
                    self.log_result("GET /api/cart", True, f"Cart retrieved with {len(data.get('items', []))} items")
                else:
                    self.log_result("GET /api/cart", False, "Missing required fields", data)
            else:
                self.log_result("GET /api/cart", False, f"HTTP {response.status_code}", response.text)
                
        except Exception as e:
            self.log_result("GET /api/cart", False, f"Exception: {str(e)}")

        # Test POST /api/cart/add - Add item to cart
        if self.test_product_id:
            try:
                cart_item = {
                    "product_id": self.test_product_id,
                    "quantity": 2
                }
                response = self.session.post(f"{API_BASE}/cart/add", json=cart_item)
                
                if response.status_code == 401:
                    self.log_result("POST /api/cart/add (unauthenticated)", True, "Correctly requires authentication")
                elif response.status_code == 200:
                    data = response.json()
                    if data.get("message") == "Added":
                        self.log_result("POST /api/cart/add", True, "Item added to cart successfully")
                    else:
                        self.log_result("POST /api/cart/add", False, "Unexpected response", data)
                else:
                    self.log_result("POST /api/cart/add", False, f"HTTP {response.status_code}", response.text)
                    
            except Exception as e:
                self.log_result("POST /api/cart/add", False, f"Exception: {str(e)}")

        # Test PUT /api/cart/update - Update item quantity
        if self.test_product_id:
            try:
                update_item = {
                    "product_id": self.test_product_id,
                    "quantity": 3
                }
                response = self.session.put(f"{API_BASE}/cart/update", json=update_item)
                
                if response.status_code == 401:
                    self.log_result("PUT /api/cart/update (unauthenticated)", True, "Correctly requires authentication")
                elif response.status_code == 200:
                    data = response.json()
                    if data.get("message") == "Updated":
                        self.log_result("PUT /api/cart/update", True, "Cart item updated successfully")
                    else:
                        self.log_result("PUT /api/cart/update", False, "Unexpected response", data)
                else:
                    self.log_result("PUT /api/cart/update", False, f"HTTP {response.status_code}", response.text)
                    
            except Exception as e:
                self.log_result("PUT /api/cart/update", False, f"Exception: {str(e)}")

    def test_admin_customer_management_apis(self):
        """Test Admin Customer Management APIs"""
        
        test_user_id = "test-user-123"
        
        # Test GET /api/admin/customer/{user_id}/favorites
        try:
            response = self.session.get(f"{API_BASE}/admin/customer/{test_user_id}/favorites")
            
            if response.status_code == 401:
                self.log_result("GET /api/admin/customer/favorites (unauthenticated)", True, "Correctly requires authentication")
            elif response.status_code == 403:
                self.log_result("GET /api/admin/customer/favorites (unauthorized)", True, "Correctly requires admin access")
            elif response.status_code == 200:
                data = response.json()
                self.log_result("GET /api/admin/customer/favorites", True, f"Retrieved {len(data)} favorites")
            else:
                self.log_result("GET /api/admin/customer/favorites", False, f"HTTP {response.status_code}", response.text)
                
        except Exception as e:
            self.log_result("GET /api/admin/customer/favorites", False, f"Exception: {str(e)}")

        # Test GET /api/admin/customer/{user_id}/cart
        try:
            response = self.session.get(f"{API_BASE}/admin/customer/{test_user_id}/cart")
            
            if response.status_code == 401:
                self.log_result("GET /api/admin/customer/cart (unauthenticated)", True, "Correctly requires authentication")
            elif response.status_code == 403:
                self.log_result("GET /api/admin/customer/cart (unauthorized)", True, "Correctly requires admin access")
            elif response.status_code == 200:
                data = response.json()
                self.log_result("GET /api/admin/customer/cart", True, f"Retrieved cart with {len(data.get('items', []))} items")
            else:
                self.log_result("GET /api/admin/customer/cart", False, f"HTTP {response.status_code}", response.text)
                
        except Exception as e:
            self.log_result("GET /api/admin/customer/cart", False, f"Exception: {str(e)}")

        # Test GET /api/admin/customer/{user_id}/orders
        try:
            response = self.session.get(f"{API_BASE}/admin/customer/{test_user_id}/orders")
            
            if response.status_code == 401:
                self.log_result("GET /api/admin/customer/orders (unauthenticated)", True, "Correctly requires authentication")
            elif response.status_code == 403:
                self.log_result("GET /api/admin/customer/orders (unauthorized)", True, "Correctly requires admin access")
            elif response.status_code == 200:
                data = response.json()
                self.log_result("GET /api/admin/customer/orders", True, f"Retrieved {len(data)} orders")
            else:
                self.log_result("GET /api/admin/customer/orders", False, f"HTTP {response.status_code}", response.text)
                
        except Exception as e:
            self.log_result("GET /api/admin/customer/orders", False, f"Exception: {str(e)}")

        # Test PATCH /api/admin/customer/{user_id}/orders/mark-viewed
        try:
            response = self.session.patch(f"{API_BASE}/admin/customer/{test_user_id}/orders/mark-viewed")
            
            if response.status_code == 401:
                self.log_result("PATCH /api/admin/customer/orders/mark-viewed (unauthenticated)", True, "Correctly requires authentication")
            elif response.status_code == 403:
                self.log_result("PATCH /api/admin/customer/orders/mark-viewed (unauthorized)", True, "Correctly requires admin access")
            elif response.status_code == 200:
                data = response.json()
                self.log_result("PATCH /api/admin/customer/orders/mark-viewed", True, "Orders marked as viewed")
            else:
                self.log_result("PATCH /api/admin/customer/orders/mark-viewed", False, f"HTTP {response.status_code}", response.text)
                
        except Exception as e:
            self.log_result("PATCH /api/admin/customer/orders/mark-viewed", False, f"Exception: {str(e)}")

        # Test GET /api/orders/pending-count/{user_id}
        try:
            response = self.session.get(f"{API_BASE}/orders/pending-count/{test_user_id}")
            
            if response.status_code == 401:
                self.log_result("GET /api/orders/pending-count (unauthenticated)", True, "Correctly requires authentication")
            elif response.status_code == 403:
                self.log_result("GET /api/orders/pending-count (unauthorized)", True, "Correctly requires admin access")
            elif response.status_code == 200:
                data = response.json()
                if "count" in data:
                    self.log_result("GET /api/orders/pending-count", True, f"Pending count: {data['count']}")
                else:
                    self.log_result("GET /api/orders/pending-count", False, "Missing count field", data)
            else:
                self.log_result("GET /api/orders/pending-count", False, f"HTTP {response.status_code}", response.text)
                
        except Exception as e:
            self.log_result("GET /api/orders/pending-count", False, f"Exception: {str(e)}")

    def test_admin_order_creation_api(self):
        """Test Admin Order Creation API"""
        
        # Test POST /api/admin/orders/create
        try:
            order_data = {
                "user_id": "test-customer-123",
                "first_name": "Ahmed",
                "last_name": "Hassan",
                "email": "ahmed.hassan@example.com",
                "phone": "+201234567890",
                "street_address": "123 Test Street",
                "city": "Cairo",
                "state": "Cairo",
                "country": "Egypt",
                "items": [
                    {
                        "product_id": self.test_product_id or "test-product-123",
                        "quantity": 2
                    }
                ],
                "notes": "Test order created by admin"
            }
            
            response = self.session.post(f"{API_BASE}/admin/orders/create", json=order_data)
            
            if response.status_code == 401:
                self.log_result("POST /api/admin/orders/create (unauthenticated)", True, "Correctly requires authentication")
            elif response.status_code == 403:
                self.log_result("POST /api/admin/orders/create (unauthorized)", True, "Correctly requires admin access")
            elif response.status_code == 200:
                data = response.json()
                if "id" in data:
                    self.test_order_id = data["id"]
                    self.log_result("POST /api/admin/orders/create", True, f"Order created with ID: {data['id']}")
                else:
                    self.log_result("POST /api/admin/orders/create", False, "Missing order ID", data)
            else:
                self.log_result("POST /api/admin/orders/create", False, f"HTTP {response.status_code}", response.text)
                
        except Exception as e:
            self.log_result("POST /api/admin/orders/create", False, f"Exception: {str(e)}")

    def test_order_management_apis(self):
        """Test Order Management APIs"""
        
        test_order_id = self.test_order_id or "test-order-123"
        
        # Test DELETE /api/orders/{order_id}
        try:
            response = self.session.delete(f"{API_BASE}/orders/{test_order_id}")
            
            if response.status_code == 401:
                self.log_result("DELETE /api/orders/{order_id} (unauthenticated)", True, "Correctly requires authentication")
            elif response.status_code == 403:
                self.log_result("DELETE /api/orders/{order_id} (unauthorized)", True, "Correctly requires proper access")
            elif response.status_code == 200:
                data = response.json()
                self.log_result("DELETE /api/orders/{order_id}", True, "Order deleted successfully")
            elif response.status_code == 404:
                self.log_result("DELETE /api/orders/{order_id}", True, "Order not found (expected for test)")
            else:
                self.log_result("DELETE /api/orders/{order_id}", False, f"HTTP {response.status_code}", response.text)
                
        except Exception as e:
            self.log_result("DELETE /api/orders/{order_id}", False, f"Exception: {str(e)}")

        # Test PATCH /api/orders/{order_id}/status
        try:
            response = self.session.patch(f"{API_BASE}/orders/{test_order_id}/status?status=preparing")
            
            if response.status_code == 401:
                self.log_result("PATCH /api/orders/{order_id}/status (unauthenticated)", True, "Correctly requires authentication")
            elif response.status_code == 403:
                self.log_result("PATCH /api/orders/{order_id}/status (unauthorized)", True, "Correctly requires proper access")
            elif response.status_code == 200:
                data = response.json()
                self.log_result("PATCH /api/orders/{order_id}/status", True, "Order status updated successfully")
            elif response.status_code == 404:
                self.log_result("PATCH /api/orders/{order_id}/status", True, "Order not found (expected for test)")
            else:
                self.log_result("PATCH /api/orders/{order_id}/status", False, f"HTTP {response.status_code}", response.text)
                
        except Exception as e:
            self.log_result("PATCH /api/orders/{order_id}/status", False, f"Exception: {str(e)}")

    def test_endpoint_existence(self):
        """Test if all required endpoints exist (even if they return auth errors)"""
        
        endpoints_to_test = [
            ("GET", "/api/health"),
            ("GET", "/api/admin/customer/test-user/favorites"),
            ("GET", "/api/admin/customer/test-user/cart"),
            ("GET", "/api/admin/customer/test-user/orders"),
            ("PATCH", "/api/admin/customer/test-user/orders/mark-viewed"),
            ("GET", "/api/orders/pending-count/test-user"),
            ("POST", "/api/admin/orders/create"),
            ("DELETE", "/api/orders/test-order"),
            ("PATCH", "/api/orders/test-order/status?status=preparing"),
            ("GET", "/api/cart"),
            ("POST", "/api/cart/add"),
            ("PUT", "/api/cart/update")
        ]
        
        existing_endpoints = []
        missing_endpoints = []
        
        for method, endpoint in endpoints_to_test:
            try:
                if method == "GET":
                    response = self.session.get(f"{BASE_URL}{endpoint}")
                elif method == "POST":
                    response = self.session.post(f"{BASE_URL}{endpoint}", json={})
                elif method == "PUT":
                    response = self.session.put(f"{BASE_URL}{endpoint}", json={})
                elif method == "PATCH":
                    response = self.session.patch(f"{BASE_URL}{endpoint}", json={})
                elif method == "DELETE":
                    response = self.session.delete(f"{BASE_URL}{endpoint}")
                
                # Endpoint exists if we get anything other than 404
                if response.status_code != 404:
                    existing_endpoints.append(f"{method} {endpoint}")
                else:
                    missing_endpoints.append(f"{method} {endpoint}")
                    
            except Exception as e:
                missing_endpoints.append(f"{method} {endpoint} (Exception: {str(e)})")
        
        self.log_result("Endpoint Existence Check", 
                       len(missing_endpoints) == 0,
                       f"Found {len(existing_endpoints)} endpoints, Missing {len(missing_endpoints)} endpoints")
        
        if missing_endpoints:
            print("Missing endpoints:")
            for endpoint in missing_endpoints:
                print(f"  - {endpoint}")
        
        return len(missing_endpoints) == 0

    def run_all_tests(self):
        """Run all tests"""
        print("=" * 60)
        print("BACKEND API TESTING SUITE - Al-Ghazaly Auto Parts v4.0")
        print("=" * 60)
        print()
        
        # Test 1: Health Check
        self.test_health_check()
        
        # Test 2: Setup test data
        self.setup_test_data()
        
        # Test 3: Endpoint existence
        self.test_endpoint_existence()
        
        # Test 4: Cart APIs
        self.test_cart_apis()
        
        # Test 5: Admin Customer Management APIs
        self.test_admin_customer_management_apis()
        
        # Test 6: Admin Order Creation API
        self.test_admin_order_creation_api()
        
        # Test 7: Order Management APIs
        self.test_order_management_apis()
        
        # Summary
        self.print_summary()

    def print_summary(self):
        """Print test summary"""
        print("=" * 60)
        print("TEST SUMMARY")
        print("=" * 60)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for r in self.test_results if r["success"])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests*100):.1f}%")
        print()
        
        if failed_tests > 0:
            print("FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"  ❌ {result['test']}: {result['details']}")
            print()
        
        print("DETAILED RESULTS:")
        for result in self.test_results:
            status = "✅" if result["success"] else "❌"
            print(f"  {status} {result['test']}")
            if result["details"]:
                print(f"      {result['details']}")
        
        return passed_tests, failed_tests

if __name__ == "__main__":
    tester = APITester()
    tester.run_all_tests()