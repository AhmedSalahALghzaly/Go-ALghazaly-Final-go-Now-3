"""
Category Routes
"""
from fastapi import APIRouter
from typing import Optional
from datetime import datetime, timezone
import uuid
import logging

from ....core.database import get_database
from ....core.security import serialize_doc
from ....models.schemas import CategoryCreate
from ....services.websocket import manager

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/categories")

@router.get("")
async def get_categories(parent_id: Optional[str] = None):
    db = get_database()
    query = {"deleted_at": None}
    if parent_id is None:
        query["parent_id"] = None
    else:
        query["parent_id"] = parent_id
    categories = await db.categories.find(query).sort([("sort_order", 1), ("name", 1)]).to_list(1000)
    return [serialize_doc(c) for c in categories]

@router.get("/all")
async def get_all_categories():
    db = get_database()
    categories = await db.categories.find({"deleted_at": None}).sort([("sort_order", 1), ("name", 1)]).to_list(1000)
    return [serialize_doc(c) for c in categories]

@router.get("/tree")
async def get_categories_tree():
    db = get_database()
    categories = await db.categories.find({"deleted_at": None}).sort([("sort_order", 1), ("name", 1)]).to_list(1000)
    all_cats = [serialize_doc(c) for c in categories]
    cats_by_id = {c["id"]: {**c, "children": []} for c in all_cats}
    root = []
    for c in all_cats:
        if c.get("parent_id") and c["parent_id"] in cats_by_id:
            cats_by_id[c["parent_id"]]["children"].append(cats_by_id[c["id"]])
        elif not c.get("parent_id"):
            root.append(cats_by_id[c["id"]])
    return root

@router.post("")
async def create_category(category: CategoryCreate):
    db = get_database()
    logger.info(f"Creating category: {category.name}, image_data present: {bool(category.image_data)}")
    doc = {
        "_id": f"cat_{uuid.uuid4().hex[:8]}",
        **category.dict(),
        "sort_order": 0,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
        "deleted_at": None
    }
    await db.categories.insert_one(doc)
    await manager.broadcast({"type": "sync", "tables": ["categories"]})
    return serialize_doc(doc)

@router.delete("/{cat_id}")
async def delete_category(cat_id: str):
    db = get_database()
    await db.categories.update_one(
        {"_id": cat_id},
        {"$set": {"deleted_at": datetime.now(timezone.utc), "updated_at": datetime.now(timezone.utc)}}
    )
    await manager.broadcast({"type": "sync", "tables": ["categories"]})
    return {"message": "Deleted"}
