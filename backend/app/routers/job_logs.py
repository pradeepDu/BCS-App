from fastapi import APIRouter, HTTPException
from typing import List
from app.models.job_log import JobLog, JobLogCreate
from app.services.database import Database
import logging
from datetime import datetime
from bson import ObjectId

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/{job_id}", response_model=List[JobLog])
async def get_job_logs(job_id: str):
    """Get all logs for a specific job"""
    try:
        logger.info(f"Getting logs for job_id: {job_id}")
        
        # Validate the job_id
        if not job_id or len(job_id) < 1:
            logger.error(f"Invalid job_id: {job_id}")
            raise HTTPException(status_code=400, detail="Invalid job_id")
            
        db = Database.get_job_logs_collection()
        
        # Always search as a string first
        logs = await db.find({"job_id": job_id}).sort("timestamp", 1).to_list(length=None)
        logger.info(f"Found {len(logs)} logs for job_id: {job_id}")
            
        # Add debugging info
        if logs:
            logger.info(f"Sample log: {logs[0]}")
        else:
            logger.warning(f"No logs found for job_id: {job_id}")
            
            # List all job_ids in the collection for debugging
            all_logs = await db.distinct("job_id")
            logger.info(f"Available job_ids in collection: {all_logs[:10]} (showing first 10)")
            
        return [JobLog(**log) for log in logs]
    except Exception as e:
        error_msg = f"Failed to get job logs: {str(e)}"
        logger.error(error_msg)
        logger.exception("Full error details:")
        raise HTTPException(status_code=500, detail=error_msg)

@router.post("/", response_model=JobLog)
async def create_job_log(log: JobLogCreate):
    """Create a new job log entry"""
    try:
        db = Database.get_job_logs_collection()
        log_dict = log.model_dump()
        log_dict["timestamp"] = datetime.utcnow()
        
        # Log the incoming data for debugging
        logger.info(f"Creating job log entry with data: {log_dict}")
        
        result = await db.insert_one(log_dict)
        log_dict["_id"] = result.inserted_id
        
        # Log the created document
        logger.info(f"Created job log entry with ID: {result.inserted_id}")
        
        return JobLog(**log_dict)
    except Exception as e:
        error_msg = f"Failed to create job log: {str(e)}"
        logger.error(error_msg)
        logger.exception("Full error details:")  # Log the full stack trace
        raise HTTPException(status_code=500, detail=error_msg)

@router.delete("/{job_id}", response_model=dict)
async def delete_job_logs(job_id: str):
    """Delete all logs for a specific job"""
    try:
        db = Database.get_job_logs_collection()
        result = await db.delete_many({"job_id": job_id})
        return {"deleted_count": result.deleted_count}
    except Exception as e:
        error_msg = f"Failed to delete job logs: {str(e)}"
        logger.error(error_msg)
        raise HTTPException(status_code=500, detail=error_msg)

@router.get("/all", response_model=List[JobLog])
async def get_all_job_logs(limit: int = 100):
    """Get all job logs for debugging purposes (with limit)"""
    try:
        logger.info(f"Getting all job logs (limited to {limit})")
        
        db = Database.get_job_logs_collection()
        logs = await db.find().sort("timestamp", -1).limit(limit).to_list(length=None)
        
        logger.info(f"Found {len(logs)} logs")
        if logs:
            logger.info(f"First log job_id: {logs[0].get('job_id')}")
        
        return [JobLog(**log) for log in logs]
    except Exception as e:
        error_msg = f"Failed to get all job logs: {str(e)}"
        logger.error(error_msg)
        logger.exception("Full error details:")
        raise HTTPException(status_code=500, detail=error_msg) 