from datetime import datetime
from typing import List
from app.models.job_history import JobHistory
from app.services.database import Database
from app.utils.logging_utils import setup_logging

logger = setup_logging(__name__)

async def load_job_history() -> List[JobHistory]:
    """Load job history from MongoDB"""
    try:
        db = Database.get_db()
        jobs = await db.jobs.find().to_list(length=None)
        return [JobHistory(**job) for job in jobs]
    except Exception as e:
        logger.error(f"Error loading job history: {str(e)}")
        return []

async def get_all_jobs() -> List[JobHistory]:
    """Get all jobs from the database"""
    try:
        db = Database.get_db()
        jobs = await db.jobs.find().sort("timestamp", -1).to_list(length=None)
        return [JobHistory(**job) for job in jobs]
    except Exception as e:
        logger.error(f"Error getting all jobs: {str(e)}")
        return []

async def add_job(job: JobHistory):
    """Add a new job to history"""
    try:
        db = Database.get_db()
        job_dict = job.dict()
        await db.jobs.insert_one(job_dict)
        logger.info(f"Added new job to history: {job.id}")
    except Exception as e:
        logger.error(f"Error adding job to history: {str(e)}")
        raise Exception(f"Failed to add job to history: {str(e)}")

async def get_user_jobs(user_id: str) -> List[JobHistory]:
    """Get all jobs for a specific user"""
    try:
        db = Database.get_db()
        jobs = await db.jobs.find({"user_id": user_id}).sort("timestamp", -1).to_list(length=None)
        return [JobHistory(**job) for job in jobs]
    except Exception as e:
        logger.error(f"Error getting user jobs: {str(e)}")
        return [] 