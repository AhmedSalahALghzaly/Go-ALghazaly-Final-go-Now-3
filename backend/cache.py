"""
Redis cache service for high-performance caching
"""
import redis.asyncio as redis
import json
from typing import Optional, Any
import logging
import os

logger = logging.getLogger(__name__)

REDIS_URL = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')

# Redis connection pool
redis_pool: Optional[redis.Redis] = None

async def get_redis() -> redis.Redis:
    """Get Redis connection"""
    global redis_pool
    if redis_pool is None:
        redis_pool = redis.from_url(REDIS_URL, decode_responses=True)
    return redis_pool

async def close_redis():
    """Close Redis connection"""
    global redis_pool
    if redis_pool:
        await redis_pool.close()
        redis_pool = None

class CacheService:
    """Redis cache service with typed methods"""
    
    # Cache TTL in seconds
    SHORT_TTL = 60  # 1 minute
    MEDIUM_TTL = 300  # 5 minutes
    LONG_TTL = 3600  # 1 hour
    
    # Cache key prefixes
    PREFIX_PRODUCTS = "products:"
    PREFIX_CATEGORIES = "categories:"
    PREFIX_CAR_BRANDS = "car_brands:"
    PREFIX_CAR_MODELS = "car_models:"
    PREFIX_PRODUCT_BRANDS = "product_brands:"
    PREFIX_USER = "user:"
    PREFIX_CART = "cart:"
    PREFIX_SYNC = "sync:"
    
    @staticmethod
    async def get(key: str) -> Optional[Any]:
        """Get value from cache"""
        try:
            r = await get_redis()
            value = await r.get(key)
            if value:
                return json.loads(value)
            return None
        except Exception as e:
            logger.warning(f"Cache get error: {e}")
            return None
    
    @staticmethod
    async def set(key: str, value: Any, ttl: int = None) -> bool:
        """Set value in cache"""
        try:
            r = await get_redis()
            ttl = ttl or CacheService.MEDIUM_TTL
            await r.setex(key, ttl, json.dumps(value, default=str))
            return True
        except Exception as e:
            logger.warning(f"Cache set error: {e}")
            return False
    
    @staticmethod
    async def delete(key: str) -> bool:
        """Delete key from cache"""
        try:
            r = await get_redis()
            await r.delete(key)
            return True
        except Exception as e:
            logger.warning(f"Cache delete error: {e}")
            return False
    
    @staticmethod
    async def delete_pattern(pattern: str) -> int:
        """Delete all keys matching pattern"""
        try:
            r = await get_redis()
            keys = []
            async for key in r.scan_iter(match=pattern):
                keys.append(key)
            if keys:
                return await r.delete(*keys)
            return 0
        except Exception as e:
            logger.warning(f"Cache delete pattern error: {e}")
            return 0
    
    @staticmethod
    async def invalidate_products():
        """Invalidate all product-related cache"""
        await CacheService.delete_pattern(f"{CacheService.PREFIX_PRODUCTS}*")
    
    @staticmethod
    async def invalidate_categories():
        """Invalidate all category-related cache"""
        await CacheService.delete_pattern(f"{CacheService.PREFIX_CATEGORIES}*")
    
    @staticmethod
    async def invalidate_car_brands():
        """Invalidate all car brand-related cache"""
        await CacheService.delete_pattern(f"{CacheService.PREFIX_CAR_BRANDS}*")
    
    @staticmethod
    async def invalidate_car_models():
        """Invalidate all car model-related cache"""
        await CacheService.delete_pattern(f"{CacheService.PREFIX_CAR_MODELS}*")
    
    @staticmethod
    async def invalidate_product_brands():
        """Invalidate all product brand-related cache"""
        await CacheService.delete_pattern(f"{CacheService.PREFIX_PRODUCT_BRANDS}*")
    
    # Specific cache methods
    @staticmethod
    async def get_all_products():
        """Get all products from cache"""
        return await CacheService.get(f"{CacheService.PREFIX_PRODUCTS}all")
    
    @staticmethod
    async def set_all_products(products: list, ttl: int = None):
        """Cache all products"""
        await CacheService.set(f"{CacheService.PREFIX_PRODUCTS}all", products, ttl or CacheService.LONG_TTL)
    
    @staticmethod
    async def get_product(product_id: str):
        """Get single product from cache"""
        return await CacheService.get(f"{CacheService.PREFIX_PRODUCTS}{product_id}")
    
    @staticmethod
    async def set_product(product_id: str, product: dict, ttl: int = None):
        """Cache single product"""
        await CacheService.set(f"{CacheService.PREFIX_PRODUCTS}{product_id}", product, ttl or CacheService.LONG_TTL)
    
    @staticmethod
    async def get_categories_tree():
        """Get categories tree from cache"""
        return await CacheService.get(f"{CacheService.PREFIX_CATEGORIES}tree")
    
    @staticmethod
    async def set_categories_tree(tree: list, ttl: int = None):
        """Cache categories tree"""
        await CacheService.set(f"{CacheService.PREFIX_CATEGORIES}tree", tree, ttl or CacheService.LONG_TTL)
    
    @staticmethod
    async def get_all_car_brands():
        """Get all car brands from cache"""
        return await CacheService.get(f"{CacheService.PREFIX_CAR_BRANDS}all")
    
    @staticmethod
    async def set_all_car_brands(brands: list, ttl: int = None):
        """Cache all car brands"""
        await CacheService.set(f"{CacheService.PREFIX_CAR_BRANDS}all", brands, ttl or CacheService.LONG_TTL)
    
    @staticmethod
    async def get_all_car_models():
        """Get all car models from cache"""
        return await CacheService.get(f"{CacheService.PREFIX_CAR_MODELS}all")
    
    @staticmethod
    async def set_all_car_models(models: list, ttl: int = None):
        """Cache all car models"""
        await CacheService.set(f"{CacheService.PREFIX_CAR_MODELS}all", models, ttl or CacheService.LONG_TTL)
    
    @staticmethod
    async def get_all_product_brands():
        """Get all product brands from cache"""
        return await CacheService.get(f"{CacheService.PREFIX_PRODUCT_BRANDS}all")
    
    @staticmethod
    async def set_all_product_brands(brands: list, ttl: int = None):
        """Cache all product brands"""
        await CacheService.set(f"{CacheService.PREFIX_PRODUCT_BRANDS}all", brands, ttl or CacheService.LONG_TTL)
    
    # Sync timestamp tracking
    @staticmethod
    async def get_last_sync_timestamp(table: str) -> Optional[int]:
        """Get last sync timestamp for a table"""
        return await CacheService.get(f"{CacheService.PREFIX_SYNC}timestamp:{table}")
    
    @staticmethod
    async def set_last_sync_timestamp(table: str, timestamp: int):
        """Set last sync timestamp for a table"""
        await CacheService.set(f"{CacheService.PREFIX_SYNC}timestamp:{table}", timestamp, CacheService.LONG_TTL)


# Pub/Sub for real-time updates
class PubSubService:
    """Redis Pub/Sub for real-time notifications"""
    
    CHANNEL_PRODUCTS = "channel:products"
    CHANNEL_ORDERS = "channel:orders"
    CHANNEL_SYNC = "channel:sync"
    
    @staticmethod
    async def publish(channel: str, message: dict):
        """Publish message to channel"""
        try:
            r = await get_redis()
            await r.publish(channel, json.dumps(message, default=str))
        except Exception as e:
            logger.warning(f"Pub/Sub publish error: {e}")
    
    @staticmethod
    async def notify_product_change(product_id: str, action: str):
        """Notify about product change"""
        await PubSubService.publish(
            PubSubService.CHANNEL_PRODUCTS,
            {"product_id": product_id, "action": action}
        )
    
    @staticmethod
    async def notify_order_change(order_id: str, action: str, user_id: str = None):
        """Notify about order change"""
        await PubSubService.publish(
            PubSubService.CHANNEL_ORDERS,
            {"order_id": order_id, "action": action, "user_id": user_id}
        )
    
    @staticmethod
    async def notify_sync_available(tables: list):
        """Notify clients that new data is available for sync"""
        await PubSubService.publish(
            PubSubService.CHANNEL_SYNC,
            {"tables": tables, "action": "sync_available"}
        )
