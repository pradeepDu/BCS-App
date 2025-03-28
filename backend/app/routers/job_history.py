from fastapi import APIRouter, HTTPException
from typing import List
from app.models.job_history import JobHistory
from app.services.job_history_service import get_user_jobs, get_all_jobs, add_job
from app.utils.logging_utils import setup_logging

router = APIRouter()
logger = setup_logging(__name__)

@router.get("/jobs/", response_model=List[JobHistory])
async def get_jobs(user_id: str = None):
    """Get all jobs or jobs for a specific user"""
    try:
        if user_id:
            jobs = await get_user_jobs(user_id)
        else:
            jobs = await get_all_jobs()
        return jobs
    except Exception as e:
        error_msg = f"Failed to get jobs: {str(e)}"
        logger.error(error_msg)
        raise HTTPException(status_code=500, detail=error_msg)

@router.post("/jobs/", response_model=JobHistory)
async def create_job(job: JobHistory):
    """Create a new job history entry"""
    try:
        await add_job(job)
        return job
    except Exception as e:
        error_msg = f"Failed to create job history: {str(e)}"
        logger.error(error_msg)
        raise HTTPException(status_code=500, detail=error_msg) 