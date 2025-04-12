from fastapi import APIRouter, HTTPException
from typing import List
from ..database import get_jobs_collection
from ..models.job_history import JobHistory, JobHistoryCreate
import logging
from datetime import datetime
from bson import ObjectId

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/jobs/", response_model=List[JobHistory])
async def get_jobs(user_id: str = None):
    """Get all jobs or jobs for a specific user"""
    try:
        collection = get_jobs_collection()
        query = {} if user_id is None else {"user_id": user_id}
        jobs = list(collection.find(query))
        return [JobHistory(**job) for job in jobs]
    except Exception as e:
        error_msg = f"Failed to get jobs: {str(e)}"
        logger.error(error_msg)
        raise HTTPException(status_code=500, detail=error_msg)

@router.post("/jobs/", response_model=JobHistory)
async def create_job(job: JobHistoryCreate):
    """Create a new job history entry"""
    try:
        collection = get_jobs_collection()
        job_dict = job.model_dump(exclude={'frontend_id'})  # Exclude frontend-generated ID
        job_dict["timestamp"] = datetime.utcnow()
        
        # Log the incoming data for debugging
        logger.info(f"Creating job history entry with data: {job_dict}")
        
        result = collection.insert_one(job_dict)
        job_dict["_id"] = result.inserted_id
        
        # Log the created document
        logger.info(f"Created job history entry with ID: {result.inserted_id}")
        
        return JobHistory(**job_dict)
    except Exception as e:
        error_msg = f"Failed to create job history: {str(e)}"
        logger.error(error_msg)
        logger.exception("Full error details:")  # Log the full stack trace
        raise HTTPException(status_code=500, detail=error_msg) 