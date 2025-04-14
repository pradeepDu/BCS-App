import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import logging
from bson import ObjectId
import os
from dotenv import load_dotenv
import re
from app.services.database import Database
from datetime import datetime, timedelta

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# MongoDB connection string from environment variable or default
MONGO_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DATABASE_NAME = os.getenv("DATABASE_NAME", "video_processing")

# UUID pattern to identify generated IDs vs real file names
UUID_PATTERN = re.compile(r'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', re.IGNORECASE)

async def connect_to_mongodb():
    try:
        client = AsyncIOMotorClient(MONGO_URL)
        db = client[DATABASE_NAME]
        logger.info("Connected to MongoDB")
        return db
    except Exception as e:
        logger.error(f"Failed to connect to MongoDB: {e}")
        raise

async def fix_job_logs(db):
    """Ensure job_ids in job_logs collection match the _id format in jobs collection"""
    try:
        # Get all jobs
        jobs = await db.jobs.find().to_list(length=None)
        logger.info(f"Found {len(jobs)} jobs")
        
        # Get all logs
        logs = await db.job_logs.find().to_list(length=None)
        logger.info(f"Found {len(logs)} logs")
        
        # Create map of job _id to frontend_id
        job_id_map = {}
        for job in jobs:
            job_id_map[str(job["_id"])] = job

        # Find logs with job_id that might be an ObjectId
        logs_to_update = []
        for log in logs:
            job_id = log.get("job_id")
            if job_id and ObjectId.is_valid(job_id) and job_id not in job_id_map:
                # Check if this is an ObjectId that needs conversion
                logs_to_update.append(log)
        
        logger.info(f"Found {len(logs_to_update)} logs that may need updating")
        
        # Update each log if needed
        update_count = 0
        for log in logs_to_update:
            log_id = log["_id"]
            job_id = log["job_id"]
            
            # Find the job that has this ObjectId
            matching_job = None
            for job_id_str, job in job_id_map.items():
                if job_id_str == job_id:
                    matching_job = job
                    break
                    
            if matching_job:
                logger.info(f"Updating log {log_id} - job_id from {job_id} to {job_id}")
                result = await db.job_logs.update_one(
                    {"_id": log_id},
                    {"$set": {"job_id": job_id}}
                )
                if result.modified_count:
                    update_count += 1
                    logger.info(f"Updated log {log_id}")
                else:
                    logger.warning(f"Failed to update log {log_id}")
        
        logger.info(f"Updated {update_count} logs")
        
        # Check for logs with job_ids that don't match any jobs
        orphaned_logs = []
        for log in logs:
            job_id = log.get("job_id")
            if job_id not in job_id_map:
                orphaned_logs.append(log)
        
        logger.info(f"Found {len(orphaned_logs)} orphaned logs")
        if orphaned_logs:
            logger.info(f"First few orphaned log job_ids: {[log['job_id'] for log in orphaned_logs[:5]]}")
            
        return {
            "total_jobs": len(jobs),
            "total_logs": len(logs),
            "logs_checked": len(logs_to_update),
            "logs_updated": update_count,
            "orphaned_logs": len(orphaned_logs)
        }
        
    except Exception as e:
        logger.error(f"Error fixing job logs: {e}")
        raise

async def delete_duplicate_job_history():
    """Delete duplicate job history entries, keeping only those with real file names"""
    try:
        # Connect to database
        await Database.connect()
        logger.info("Connected to database")
        
        # Get all jobs
        db = Database.get_db()
        all_jobs = await db.jobs.find().to_list(length=None)
        logger.info(f"Found {len(all_jobs)} job history entries")
        
        # Group jobs by similar properties (user_id and timestamp within 1 minute)
        job_groups = {}
        for job in all_jobs:
            # Extract key fields
            user_id = job.get('user_id')
            timestamp = job.get('timestamp')
            job_id = str(job.get('_id'))
            
            if not (user_id and timestamp):
                continue
                
            # Create a timestamp group by rounding to the nearest minute
            rounded_time = timestamp.replace(second=0, microsecond=0)
            group_key = f"{user_id}_{rounded_time.isoformat()}"
            
            if group_key not in job_groups:
                job_groups[group_key] = []
                
            job_groups[group_key].append(job)
        
        logger.info(f"Grouped jobs into {len(job_groups)} distinct groups")
        
        # Process each group
        delete_count = 0
        for group_key, jobs in job_groups.items():
            if len(jobs) <= 1:
                continue
                
            # If we have multiple jobs in a group, keep the one with a real file name
            # (not a UUID) if possible
            jobs_to_delete = []
            uuid_jobs = []
            real_name_jobs = []
            
            for job in jobs:
                file_name = job.get('file_name', '')
                if UUID_PATTERN.match(file_name) or file_name.startswith(('watermark_', 'transcode_')):
                    uuid_jobs.append(job)
                else:
                    real_name_jobs.append(job)
            
            # If we have real name jobs, delete the UUID jobs
            if real_name_jobs:
                jobs_to_delete = uuid_jobs
            # Otherwise, keep the most recent UUID job
            elif len(uuid_jobs) > 1:
                # Sort by timestamp, newest first
                uuid_jobs.sort(key=lambda j: j.get('timestamp', datetime.min), reverse=True)
                # Keep the newest, delete the rest
                jobs_to_delete = uuid_jobs[1:]
            
            # Delete the jobs marked for deletion
            for job in jobs_to_delete:
                job_id = str(job.get('_id'))
                logger.info(f"Deleting job {job_id} with file name {job.get('file_name')}")
                result = await db.jobs.delete_one({"_id": ObjectId(job_id)})
                if result.deleted_count:
                    delete_count += 1
        
        logger.info(f"Deleted {delete_count} duplicate job entries")
        
    except Exception as e:
        logger.error(f"Error in delete_duplicate_job_history: {e}")
        raise
    finally:
        # Disconnect from database
        await Database.close()
        logger.info("Disconnected from database")

async def main():
    """Main entry point"""
    logger.info("Starting database cleanup")
    await delete_duplicate_job_history()
    logger.info("Database cleanup complete")

if __name__ == "__main__":
    asyncio.run(main()) 