#!/usr/bin/env python3
"""
Al-Ghazaly Auto Parts Backend API Testing Suite
Tests the modularized FastAPI backend v4.1.0

This test suite covers:
1. Health check and version endpoints
2. Product listing with cursor pagination
3. Category, car brands, car models, product brands endpoints
4. Bundle offers and promotions
5. Marketing home slider
6. Cart system with server-side pricing
7. Stock validation
8. Authentication-protected endpoints

Usage: python backend_test.py
"""

import requests
import json
import sys
from datetime import datetime
from typing import Dict, Any, List, Optional

# Backend URL Configuration
BASE_URL = "http://localhost:8001"
API_BASE = f"{BASE_URL}/api"

class BackendTester:
    def __init__(self):
        self.session = requests.Session()
        self.test_results = []
        self.failed_tests = []
        self.passed_tests = []
        
    def log_test(self, test_name: str, success: bool, details: str = "", response_data: Any = None):
        """Log test result"""
        result = {
            "test": test_name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat(),
            "response_data": response_data
        }
        self.test_results.append(result)
        
        if success:
            self.passed_tests.append(test_name)
            print(f"✅ {test_name}")
            if details:
                print(f"   {details}")
        else:
            self.failed_tests.append(test_name)
            print(f"❌ {test_name}")
            print(f"   {details}")
    
    def test_health_endpoint(self):
        """Test GET /api/health"""
        try:
            response = self.session.get(f"{API_BASE}/health")
            if response.status_code == 200:
                data = response.json()
                if data.get("status") == "healthy" and data.get("api_version") == "4.1.0":
                    self.log_test("Health Check", True, 
                                f"Status: {data.get('status')}, Version: {data.get('api_version')}, DB: {data.get('database')}")
                else:
                    self.log_test("Health Check", False, 
                                f"Unexpected response: {data}")
            else:
                self.log_test("Health Check", False, 
                            f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Health Check", False, f"Exception: {str(e)}")
    
    def test_version_endpoint(self):
        """Test GET /api/version"""
        try:
            response = self.session.get(f"{API_BASE}/version")
            if response.status_code == 200:
                data = response.json()
                required_fields = ["api_version", "build_date", "min_frontend_version", "features"]
                if all(field in data for field in required_fields):
                    features = data.get("features", [])
                    expected_features = ["cursor_pagination", "offline_sync", "websocket_realtime", "modular_backend"]
                    has_expected = all(feat in features for feat in expected_features)
                    self.log_test("Version Info", has_expected, 
                                f"Version: {data.get('api_version')}, Features: {len(features)}")
                else:
                    self.log_test("Version Info", False, f"Missing required fields: {data}")
            else:
                self.log_test("Version Info", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Version Info", False, f"Exception: {str(e)}")
    
    def test_products_endpoint(self):
        """Test GET /api/products with cursor pagination"""
        try:
            # Test basic product listing
            response = self.session.get(f"{API_BASE}/products?limit=10")
            if response.status_code == 200:
                data = response.json()
                required_fields = ["products", "total", "next_cursor", "prev_cursor", "has_more", "page_size"]
                if all(field in data for field in required_fields):
                    products = data.get("products", [])
                    self.log_test("Products Listing", True, 
                                f"Found {len(products)} products, Total: {data.get('total')}, Has more: {data.get('has_more')}")
                    
                    # Test cursor pagination if we have products
                    if products and data.get("next_cursor"):
                        cursor_response = self.session.get(f"{API_BASE}/products?cursor={data['next_cursor']}&limit=5")
                        if cursor_response.status_code == 200:
                            cursor_data = cursor_response.json()
                            self.log_test("Cursor Pagination", True, 
                                        f"Cursor pagination works, got {len(cursor_data.get('products', []))} more products")
                        else:
                            self.log_test("Cursor Pagination", False, 
                                        f"Cursor pagination failed: HTTP {cursor_response.status_code}")
                    else:
                        self.log_test("Cursor Pagination", True, "No cursor available (expected for small datasets)")
                else:
                    self.log_test("Products Listing", False, f"Missing required fields: {data}")
            else:
                self.log_test("Products Listing", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Products Listing", False, f"Exception: {str(e)}")
    
    def test_categories_endpoint(self):
        """Test GET /api/categories"""
        try:
            response = self.session.get(f"{API_BASE}/categories")
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_test("Categories Listing", True, f"Found {len(data)} categories")
                elif isinstance(data, dict) and "categories" in data:
                    categories = data.get("categories", [])
                    self.log_test("Categories Listing", True, f"Found {len(categories)} categories")
                else:
                    self.log_test("Categories Listing", False, f"Unexpected response format: {data}")
            else:
                self.log_test("Categories Listing", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Categories Listing", False, f"Exception: {str(e)}")
    
    def test_car_brands_endpoint(self):
        """Test GET /api/car-brands"""
        try:
            response = self.session.get(f"{API_BASE}/car-brands")
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_test("Car Brands Listing", True, f"Found {len(data)} car brands")
                elif isinstance(data, dict) and "car_brands" in data:
                    brands = data.get("car_brands", [])
                    self.log_test("Car Brands Listing", True, f"Found {len(brands)} car brands")
                else:
                    self.log_test("Car Brands Listing", False, f"Unexpected response format: {data}")
            else:
                self.log_test("Car Brands Listing", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Car Brands Listing", False, f"Exception: {str(e)}")
    
    def test_car_models_endpoint(self):
        """Test GET /api/car-models"""
        try:
            response = self.session.get(f"{API_BASE}/car-models")
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_test("Car Models Listing", True, f"Found {len(data)} car models")
                elif isinstance(data, dict) and "car_models" in data:
                    models = data.get("car_models", [])
                    self.log_test("Car Models Listing", True, f"Found {len(models)} car models")
                else:
                    self.log_test("Car Models Listing", False, f"Unexpected response format: {data}")
            else:
                self.log_test("Car Models Listing", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Car Models Listing", False, f"Exception: {str(e)}")
    
    def test_product_brands_endpoint(self):
        """Test GET /api/product-brands"""
        try:
            response = self.session.get(f"{API_BASE}/product-brands")
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_test("Product Brands Listing", True, f"Found {len(data)} product brands")
                elif isinstance(data, dict) and "product_brands" in data:
                    brands = data.get("product_brands", [])
                    self.log_test("Product Brands Listing", True, f"Found {len(brands)} product brands")
                else:
                    self.log_test("Product Brands Listing", False, f"Unexpected response format: {data}")
            else:
                self.log_test("Product Brands Listing", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Product Brands Listing", False, f"Exception: {str(e)}")
    
    def test_bundle_offers_endpoint(self):
        """Test GET /api/bundle-offers"""
        try:
            response = self.session.get(f"{API_BASE}/bundle-offers")
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_test("Bundle Offers Listing", True, f"Found {len(data)} bundle offers")
                elif isinstance(data, dict) and "bundle_offers" in data:
                    offers = data.get("bundle_offers", [])
                    self.log_test("Bundle Offers Listing", True, f"Found {len(offers)} bundle offers")
                else:
                    self.log_test("Bundle Offers Listing", False, f"Unexpected response format: {data}")
            else:
                self.log_test("Bundle Offers Listing", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Bundle Offers Listing", False, f"Exception: {str(e)}")
    
    def test_promotions_endpoint(self):
        """Test GET /api/promotions"""
        try:
            response = self.session.get(f"{API_BASE}/promotions")
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_test("Promotions Listing", True, f"Found {len(data)} promotions")
                elif isinstance(data, dict) and "promotions" in data:
                    promotions = data.get("promotions", [])
                    self.log_test("Promotions Listing", True, f"Found {len(promotions)} promotions")
                else:
                    self.log_test("Promotions Listing", False, f"Unexpected response format: {data}")
            else:
                self.log_test("Promotions Listing", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Promotions Listing", False, f"Exception: {str(e)}")
    
    def test_marketing_home_slider(self):
        """Test GET /api/marketing/home-slider"""
        try:
            response = self.session.get(f"{API_BASE}/marketing/home-slider")
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_test("Marketing Home Slider", True, f"Found {len(data)} slider items")
                elif isinstance(data, dict) and "slider_items" in data:
                    items = data.get("slider_items", [])
                    self.log_test("Marketing Home Slider", True, f"Found {len(items)} slider items")
                else:
                    self.log_test("Marketing Home Slider", False, f"Unexpected response format: {data}")
            else:
                self.log_test("Marketing Home Slider", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Marketing Home Slider", False, f"Exception: {str(e)}")
    
    def test_cart_endpoints_unauthenticated(self):
        """Test cart endpoints without authentication (should fail)"""
        cart_endpoints = [
            ("GET", "/cart", "Get Cart", {}),
            ("POST", "/cart/add", "Add to Cart", {"product_id": "test_prod", "quantity": 1}),
            ("PUT", "/cart/update", "Update Cart", {"product_id": "test_prod", "quantity": 2}),
            ("DELETE", "/cart/clear", "Clear Cart", {}),
            ("POST", "/cart/validate-stock", "Validate Stock", {})
        ]
        
        for method, endpoint, name, payload in cart_endpoints:
            try:
                if method == "GET":
                    response = self.session.get(f"{API_BASE}{endpoint}")
                elif method == "POST":
                    response = self.session.post(f"{API_BASE}{endpoint}", json=payload)
                elif method == "PUT":
                    response = self.session.put(f"{API_BASE}{endpoint}", json=payload)
                elif method == "DELETE":
                    response = self.session.delete(f"{API_BASE}{endpoint}")
                
                if response.status_code == 401:
                    self.log_test(f"{name} (Auth Required)", True, "Correctly requires authentication")
                else:
                    self.log_test(f"{name} (Auth Required)", False, 
                                f"Expected 401, got {response.status_code}: {response.text}")
            except Exception as e:
                self.log_test(f"{name} (Auth Required)", False, f"Exception: {str(e)}")
    
    def test_bundle_void_endpoint(self):
        """Test DELETE /api/cart/void-bundle/{bundle_group_id} without auth"""
        try:
            response = self.session.delete(f"{API_BASE}/cart/void-bundle/test_bundle_123")
            if response.status_code == 401:
                self.log_test("Void Bundle (Auth Required)", True, "Correctly requires authentication")
            else:
                self.log_test("Void Bundle (Auth Required)", False, 
                            f"Expected 401, got {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Void Bundle (Auth Required)", False, f"Exception: {str(e)}")
    
    def test_database_connectivity(self):
        """Test database connectivity through health endpoint"""
        try:
            response = self.session.get(f"{API_BASE}/health")
            if response.status_code == 200:
                data = response.json()
                db_status = data.get("database", "unknown")
                if db_status == "healthy":
                    self.log_test("Database Connectivity", True, "MongoDB connection healthy")
                else:
                    self.log_test("Database Connectivity", False, f"Database status: {db_status}")
            else:
                self.log_test("Database Connectivity", False, f"Health check failed: {response.status_code}")
        except Exception as e:
            self.log_test("Database Connectivity", False, f"Exception: {str(e)}")
    
    def test_json_responses(self):
        """Test that all endpoints return valid JSON"""
        endpoints = [
            "/health",
            "/version", 
            "/products",
            "/categories",
            "/car-brands",
            "/car-models",
            "/product-brands",
            "/bundle-offers",
            "/promotions",
            "/marketing/home-slider"
        ]
        
        valid_json_count = 0
        for endpoint in endpoints:
            try:
                response = self.session.get(f"{API_BASE}{endpoint}")
                if response.status_code == 200:
                    response.json()  # This will raise an exception if not valid JSON
                    valid_json_count += 1
            except Exception:
                pass
        
        success = valid_json_count == len(endpoints)
        self.log_test("JSON Response Validation", success, 
                    f"{valid_json_count}/{len(endpoints)} endpoints return valid JSON")
    
    def test_root_endpoint(self):
        """Test GET / (root endpoint)"""
        try:
            response = self.session.get(BASE_URL)
            if response.status_code == 200:
                data = response.json()
                expected_fields = ["message", "version", "architecture", "status"]
                if all(field in data for field in expected_fields):
                    self.log_test("Root Endpoint", True, 
                                f"Message: {data.get('message')}, Architecture: {data.get('architecture')}")
                else:
                    self.log_test("Root Endpoint", False, f"Missing expected fields: {data}")
            else:
                self.log_test("Root Endpoint", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Root Endpoint", False, f"Exception: {str(e)}")
    
    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting Al-Ghazaly Auto Parts Backend API Tests")
        print(f"📍 Testing backend at: {BASE_URL}")
        print("=" * 60)
        
        # Core functionality tests
        self.test_root_endpoint()
        self.test_health_endpoint()
        self.test_version_endpoint()
        self.test_database_connectivity()
        
        # Data endpoint tests
        self.test_products_endpoint()
        self.test_categories_endpoint()
        self.test_car_brands_endpoint()
        self.test_car_models_endpoint()
        self.test_product_brands_endpoint()
        self.test_bundle_offers_endpoint()
        self.test_promotions_endpoint()
        self.test_marketing_home_slider()
        
        # Authentication tests
        self.test_cart_endpoints_unauthenticated()
        self.test_bundle_void_endpoint()
        
        # Response format tests
        self.test_json_responses()
        
        # Print summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        print(f"✅ Passed: {len(self.passed_tests)}")
        print(f"❌ Failed: {len(self.failed_tests)}")
        print(f"📈 Success Rate: {len(self.passed_tests)}/{len(self.test_results)} ({len(self.passed_tests)/len(self.test_results)*100:.1f}%)")
        
        if self.failed_tests:
            print("\n❌ FAILED TESTS:")
            for test in self.failed_tests:
                print(f"   - {test}")
        
        print(f"\n🕒 Test completed at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        return len(self.failed_tests) == 0

def main():
    """Main test runner"""
    tester = BackendTester()
    success = tester.run_all_tests()
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()