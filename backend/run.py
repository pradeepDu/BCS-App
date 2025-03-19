import uvicorn
from app.utils.logging_utils import setup_logging

logger = setup_logging(__name__)

if __name__ == "__main__":
    logger.info("Starting Video Processing API server")
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)