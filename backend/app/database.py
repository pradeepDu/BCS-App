from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import MongoClient
import os
from typing import Optional
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get MongoDB configuration from environment
MONGODB_URL = os.getenv("MONGODB_URL")
DATABASE_NAME = os.getenv("DATABASE_NAME", "bcs_platform")

if not MONGODB_URL:
    raise ValueError("MONGODB_URL environment variable is not set")

# Create MongoDB client
client = MongoClient(MONGODB_URL)
db = client[DATABASE_NAME]

# Async client for FastAPI
async_client = AsyncIOMotorClient(MONGODB_URL)
async_db = async_client[DATABASE_NAME]

# Get collection
def get_jobs_collection():
    return db.jobs

async def get_async_jobs_collection():
    return async_db.jobs 