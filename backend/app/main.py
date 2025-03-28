from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import transcode, watermark, info, job_history
from app.services.database import Database
from app.utils.logging_utils import setup_logging

logger = setup_logging(__name__)

app = FastAPI(title="Video Processing API", 
              description="API for video transcoding and watermarking",
              version="1.0.0")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    """Initialize MongoDB connection on startup"""
    try:
        await Database.connect()
        logger.info("Application startup completed")
    except Exception as e:
        logger.error(f"Failed to initialize application: {str(e)}")
        raise

@app.on_event("shutdown")
async def shutdown_event():
    """Close MongoDB connection on shutdown"""
    try:
        await Database.close()
        logger.info("Application shutdown completed")
    except Exception as e:
        logger.error(f"Error during application shutdown: {str(e)}")

# Include routers
app.include_router(transcode.router, tags=["Transcoding"])
app.include_router(watermark.router, tags=["Watermarking"])
app.include_router(info.router, tags=["System Information"])
app.include_router(job_history.router, prefix="/api/job-history", tags=["job-history"])