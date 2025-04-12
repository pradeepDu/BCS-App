from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.routers import transcode, watermark, info, job_history, video_processing
from app.utils.logging_utils import setup_logging
from app.database import get_jobs_collection
import logging
import time
from datetime import datetime
import os

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(title="Video Processing API", 
              description="API for video transcoding and watermarking",
              version="1.0.0")

# Configure CORS
origins = ["http://localhost:5173"]  # Frontend URL

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,  # Cache preflight requests for 1 hour
)

@app.middleware("http")
async def handle_cors_error(request: Request, call_next):
    try:
        response = await call_next(request)
        return response
    except Exception as e:
        # Ensure error responses have CORS headers
        error_response = JSONResponse(
            status_code=500,
            content={"detail": str(e)}
        )
        for origin in origins:
            if origin == request.headers.get("origin"):
                error_response.headers["Access-Control-Allow-Origin"] = origin
                error_response.headers["Access-Control-Allow-Credentials"] = "true"
                break
        return error_response

# Include routers
app.include_router(transcode.router, tags=["Transcoding"])
app.include_router(watermark.router, tags=["Watermarking"])
app.include_router(info.router, tags=["System Information"])
app.include_router(job_history.router, prefix="/api/job-history")
app.include_router(video_processing.router, prefix="/api")

@app.get("/")
async def root():
    return {"message": "Welcome to BCS Platform API"}

@app.get("/api/health")
async def health_check():
    try:
        # Test MongoDB connection
        collection = get_jobs_collection()
        # Try to find one document to verify connection
        collection.find_one()
        return {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "database": "connected"
        }
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return {
            "status": "unhealthy",
            "timestamp": datetime.utcnow().isoformat(),
            "database": "disconnected",
            "error": str(e)
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)