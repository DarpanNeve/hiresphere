from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings
import logging
from typing import Optional
import asyncio
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError, NetworkTimeout

logger = logging.getLogger(__name__)


class MongoDB:
    client: Optional[AsyncIOMotorClient] = None
    database = None
    _connect_lock = asyncio.Lock()
    _max_retries = 3
    _retry_delay = 1  # seconds

    @classmethod
    async def connect_to_mongo(cls):
        if cls.client is not None:
            return

        async with cls._connect_lock:
            # Double check to prevent race condition
            if cls.client is not None:
                return

            retries = 0
            while retries < cls._max_retries:
                try:
                    logger.info("Connecting to MongoDB...")
                    cls.client = AsyncIOMotorClient(
                        settings.MONGODB_URL,
                        minPoolSize=settings.MONGODB_MIN_POOL_SIZE,
                        maxPoolSize=settings.MONGODB_MAX_POOL_SIZE,
                        maxIdleTimeMS=settings.MONGODB_MAX_IDLE_TIME_MS,
                        connectTimeoutMS=settings.MONGODB_CONNECT_TIMEOUT_MS,
                        serverSelectionTimeoutMS=settings.MONGODB_SERVER_SELECTION_TIMEOUT_MS,
                        retryWrites=True,
                        retryReads=True,
                        socketTimeoutMS=30000,  # Increased socket timeout
                        waitQueueTimeoutMS=10000,  # Wait queue timeout
                        heartbeatFrequencyMS=10000,  # Heartbeat frequency
                    )

                    # Test the connection
                    await cls.client.admin.command('ping')

                    cls.database = cls.client[settings.DATABASE_NAME]
                    logger.info("Connected to MongoDB successfully")

                    # Create indexes
                    await cls.create_indexes()
                    return
                except (ConnectionFailure, ServerSelectionTimeoutError, NetworkTimeout) as e:
                    retries += 1
                    if retries >= cls._max_retries:
                        logger.error(f"Failed to connect to MongoDB after {cls._max_retries} attempts: {str(e)}")
                        raise
                    logger.warning(
                        f"MongoDB connection attempt {retries} failed, retrying in {cls._retry_delay} seconds...")
                    await asyncio.sleep(cls._retry_delay * retries)  # Exponential backoff
                except Exception as e:
                    logger.error(f"Unexpected error connecting to MongoDB: {str(e)}")
                    raise

    @classmethod
    async def close_mongo_connection(cls):
        try:
            if cls.client is not None:
                cls.client.close()
                cls.client = None
                cls.database = None
                logger.info("MongoDB connection closed")
        except Exception as e:
            logger.error(f"Error closing MongoDB connection: {str(e)}")

    @classmethod
    async def get_database(cls):
        if cls.client is None:
            await cls.connect_to_mongo()
        return cls.database

    @classmethod
    async def create_indexes(cls):
        try:
            # Create indexes for frequently queried collections
            await cls.database.users.create_index("email", unique=True)
            await cls.database.users.create_index([("organization_id", 1), ("role", 1)])
            await cls.database.users.create_index([("created_by", 1), ("role", 1)])

            await cls.database.organizations.create_index("name")

            await cls.database.interviews.create_index([("user_id", 1), ("created_at", -1)])
            await cls.database.interviews.create_index([("organization_id", 1), ("created_at", -1)])

            await cls.database.candidates.create_index([("hr_id", 1), ("created_at", -1)])
            await cls.database.candidates.create_index([("organization_id", 1), ("created_at", -1)])

            await cls.database.interview_links.create_index("token", unique=True)
            await cls.database.interview_links.create_index([("hr_id", 1), ("created_at", -1)])
            await cls.database.interview_links.create_index([("organization_id", 1), ("created_at", -1)])

            await cls.database.subscriptions.create_index([("organization_id", 1), ("status", 1)])

            logger.info("MongoDB indexes created successfully")
        except Exception as e:
            logger.error(f"Failed to create MongoDB indexes: {str(e)}")
            raise

    @classmethod
    async def ensure_connected(cls):
        """Ensure database connection is active, reconnect if necessary"""
        if cls.client is None:
            await cls.connect_to_mongo()
            return

        try:
            # Test connection with ping
            await cls.client.admin.command('ping')
        except (ConnectionFailure, ServerSelectionTimeoutError, NetworkTimeout):
            logger.warning("MongoDB connection lost, attempting to reconnect...")
            cls.client = None
            await cls.connect_to_mongo()

    @classmethod
    async def execute_with_retry(cls, operation):
        """Execute a database operation with retry logic"""
        retries = 0
        while retries < cls._max_retries:
            try:
                await cls.ensure_connected()
                return await operation()
            except (ConnectionFailure, ServerSelectionTimeoutError, NetworkTimeout) as e:
                retries += 1
                if retries >= cls._max_retries:
                    logger.error(f"Operation failed after {cls._max_retries} attempts: {str(e)}")
                    raise
                logger.warning(f"Operation attempt {retries} failed, retrying in {cls._retry_delay} seconds...")
                await asyncio.sleep(cls._retry_delay * retries)


db = MongoDB()