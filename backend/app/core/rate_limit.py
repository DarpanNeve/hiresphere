from fastapi import HTTPException, Request
import time
import asyncio
from collections import defaultdict
import logging
from app.core.config import settings
from app.core.cache import cache

logger = logging.getLogger(__name__)


class RateLimiter:
    def __init__(self):
        self.requests = defaultdict(list)
        self.lock = asyncio.Lock()

    async def check_rate_limit(self, request: Request):
        if settings.RATE_LIMIT_STORAGE == "redis" and cache._redis:
            await self._check_rate_limit_redis(request)
        else:
            await self._check_rate_limit_memory(request)

    async def _check_rate_limit_redis(self, request: Request):
        try:
            client_ip = request.client.host
            key = f"rate_limit:{client_ip}"

            async with cache._redis.pipeline() as pipe:
                current_time = int(time.time())
                window_start = current_time - 60

                # Add current request and get count
                await pipe.zadd(key, {str(current_time): current_time})
                await pipe.zremrangebyscore(key, 0, window_start)
                await pipe.zcard(key)
                await pipe.expire(key, 60)
                _, _, request_count, _ = await pipe.execute()

                if request_count > settings.RATE_LIMIT_PER_MINUTE:
                    raise HTTPException(
                        status_code=429,
                        detail="Too many requests"
                    )

        except Exception as e:
            logger.error(f"Rate limit check error: {str(e)}")
            # Fallback to memory-based rate limiting
            await self._check_rate_limit_memory(request)

    async def _check_rate_limit_memory(self, request: Request):
        async with self.lock:
            client_ip = request.client.host
            current_time = time.time()

            # Remove old requests
            self.requests[client_ip] = [
                req_time for req_time in self.requests[client_ip]
                if current_time - req_time < 60
            ]

            # Check rate limit
            if len(self.requests[client_ip]) >= settings.RATE_LIMIT_PER_MINUTE:
                raise HTTPException(
                    status_code=429,
                    detail="Too many requests"
                )

            # Add current request
            self.requests[client_ip].append(current_time)


rate_limiter = RateLimiter()