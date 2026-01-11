"""
Analytics Routes
"""
from fastapi import APIRouter, HTTPException, Request
from typing import Optional
from datetime import datetime

from ....core.database import db
from ....core.security import get_current_user, get_user_role, serialize_doc

router = APIRouter(prefix="/analytics")

@router.get("/overview")
async def get_analytics_overview(request: Request, start_date: Optional[str] = None, end_date: Optional[str] = None):
    db = get_database()
    user = await get_current_user(request)
    role = await get_user_role(user) if user else "guest"
    if role not in ["owner", "partner"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    date_filter = {}
    if start_date:
        date_filter["$gte"] = datetime.fromisoformat(start_date.replace("Z", "+00:00"))
    if end_date:
        date_filter["$lte"] = datetime.fromisoformat(end_date.replace("Z", "+00:00"))
    
    order_query = {}
    if date_filter:
        order_query["created_at"] = date_filter
    
    orders = await db.orders.find(order_query).to_list(100000)
    
    total_orders = len(orders)
    total_revenue = sum(o.get("total", 0) for o in orders)
    delivered_orders = [o for o in orders if o.get("status") == "delivered"]
    delivered_revenue = sum(o.get("total", 0) for o in delivered_orders)
    aov = total_revenue / total_orders if total_orders > 0 else 0
    
    status_counts = {}
    for status in ["pending", "preparing", "shipped", "out_for_delivery", "delivered", "cancelled"]:
        status_counts[status] = sum(1 for o in orders if o.get("status") == status)
    
    customer_app_orders = sum(1 for o in orders if o.get("order_source", "customer_app") == "customer_app")
    admin_assisted_orders = sum(1 for o in orders if o.get("order_source") == "admin_assisted")
    
    order_source_breakdown = {
        "customer_app": customer_app_orders,
        "admin_assisted": admin_assisted_orders,
        "customer_app_percentage": round((customer_app_orders / total_orders * 100) if total_orders > 0 else 0, 1),
        "admin_assisted_percentage": round((admin_assisted_orders / total_orders * 100) if total_orders > 0 else 0, 1),
    }
    
    total_discount_value = 0
    bundle_revenue = 0
    regular_revenue = 0
    bundle_orders = 0
    
    for order in orders:
        order_has_bundle = False
        for item in order.get("items", []):
            original_price = item.get("original_unit_price", item.get("price", 0))
            final_price = item.get("final_unit_price", item.get("price", 0))
            quantity = item.get("quantity", 1)
            discount = (original_price - final_price) * quantity
            total_discount_value += max(0, discount)
            
            if item.get("bundle_group_id") or item.get("discount_details", {}).get("discount_type") == "bundle":
                bundle_revenue += final_price * quantity
                order_has_bundle = True
            else:
                regular_revenue += final_price * quantity
        
        if order_has_bundle:
            bundle_orders += 1
    
    discount_performance = {
        "total_discount_value": round(total_discount_value, 2),
        "bundle_revenue": round(bundle_revenue, 2),
        "regular_revenue": round(regular_revenue, 2),
        "bundle_orders_count": bundle_orders,
        "bundle_revenue_percentage": round((bundle_revenue / total_revenue * 100) if total_revenue > 0 else 0, 1),
        "average_discount_per_order": round(total_discount_value / total_orders if total_orders > 0 else 0, 2),
    }
    
    product_sales = {}
    for order in orders:
        for item in order.get("items", []):
            pid = item.get("product_id")
            if pid:
                if pid not in product_sales:
                    product_sales[pid] = {"count": 0, "revenue": 0, "name": item.get("product_name", "Unknown")}
                product_sales[pid]["count"] += item.get("quantity", 1)
                product_sales[pid]["revenue"] += item.get("final_unit_price", item.get("price", 0)) * item.get("quantity", 1)
    
    top_products = sorted(product_sales.values(), key=lambda x: x["revenue"], reverse=True)[:10]
    
    revenue_by_day = {}
    for order in orders:
        day = order.get("created_at").strftime("%Y-%m-%d") if order.get("created_at") else "Unknown"
        revenue_by_day[day] = revenue_by_day.get(day, 0) + order.get("total", 0)
    
    products = await db.products.find({}).to_list(100000)
    product_admin_map = {p["_id"]: p.get("added_by_admin_id") for p in products}
    
    admin_sales = {}
    for order in orders:
        for item in order.get("items", []):
            admin_id = product_admin_map.get(item.get("product_id"))
            if admin_id:
                if admin_id not in admin_sales:
                    admin_sales[admin_id] = {"count": 0, "revenue": 0}
                admin_sales[admin_id]["count"] += item.get("quantity", 1)
                admin_sales[admin_id]["revenue"] += item.get("final_unit_price", item.get("price", 0)) * item.get("quantity", 1)
    
    admins = await db.admins.find({}).to_list(1000)
    admin_name_map = {a["_id"]: a.get("name", a.get("email", "Unknown")) for a in admins}
    
    sales_by_admin = [
        {"admin_id": aid, "name": admin_name_map.get(aid, "Unknown"), **data}
        for aid, data in admin_sales.items()
    ]
    
    recent_customers = await db.users.find({}).sort("created_at", -1).limit(5).to_list(5)
    low_stock = await db.products.find({"stock_quantity": {"$lt": 10}, "deleted_at": None}).limit(10).to_list(10)
    
    return {
        "total_orders": total_orders,
        "total_revenue": total_revenue,
        "delivered_revenue": delivered_revenue,
        "average_order_value": round(aov, 2),
        "orders_by_status": status_counts,
        "order_source_breakdown": order_source_breakdown,
        "discount_performance": discount_performance,
        "top_products": top_products,
        "revenue_by_day": [{"date": k, "revenue": v} for k, v in sorted(revenue_by_day.items())],
        "sales_by_admin": sales_by_admin,
        "recent_customers": [serialize_doc(c) for c in recent_customers],
        "low_stock_products": [serialize_doc(p) for p in low_stock],
    }

@router.get("/collections")
async def get_collections(request: Request, admin_id: Optional[str] = None):
    db = get_database()
    user = await get_current_user(request)
    role = await get_user_role(user) if user else "guest"
    if role not in ["owner", "partner"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    query = {"settled": True}
    if admin_id:
        query["added_by_admin_id"] = admin_id
    
    products = await db.products.find(query).to_list(10000)
    admins = await db.admins.find({}).to_list(1000)
    admin_map = {a["_id"]: serialize_doc(a) for a in admins}
    
    result = []
    for p in products:
        p_data = serialize_doc(p)
        p_data["admin"] = admin_map.get(p.get("added_by_admin_id"))
        result.append(p_data)
    
    return result
