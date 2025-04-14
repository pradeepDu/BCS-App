from motor.motor_asyncio import AsyncIOMotorClient
from app.config import MONGODB_URL, MONGODB_DB_NAME
from app.utils.logging_utils import setup_logging

logger = setup_logging(__name__)

class Database:
    _client: AsyncIOMotorClient = None
    _db = None

    @classmethod
    async def connect(cls):
        """Connect to MongoDB"""
        try:
            if cls._client is None:
                cls._client = AsyncIOMotorClient(MONGODB_URL)
                cls._db = cls._client[MONGODB_DB_NAME]
                logger.info("Connected to MongoDB")
        except Exception as e:
            logger.error(f"Failed to connect to MongoDB: {str(e)}")
            raise

    @classmethod
    async def close(cls):
        """Close MongoDB connection"""
        if cls._client is not None:
            cls._client.close()
            cls._client = None
            cls._db = None
            logger.info("Closed MongoDB connection")

    @classmethod
    def get_db(cls):
        """Get database instance"""
        if cls._db is None:
            raise Exception("Database not connected. Call Database.connect() first.")
        return cls._db

    @classmethod
    def get_job_logs_collection(cls):
        """Get job logs collection"""
        if cls._db is None:
            raise Exception("Database not connected. Call Database.connect() first.")
        return cls._db.job_logs 