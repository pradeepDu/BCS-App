from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import transcode, watermark, info

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

# Include routers
app.include_router(transcode.router, tags=["Transcoding"])
app.include_router(watermark.router, tags=["Watermarking"])
app.include_router(info.router, tags=["System Information"])