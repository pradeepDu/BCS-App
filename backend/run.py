import uvicorn
import sys
from app.utils.logging_utils import setup_logging

logger = setup_logging(__name__)

if __name__ == "__main__":
    try:
        logger.info("Starting Video Processing API server")
        logger.info("Server will be available at http://localhost:8000")
        uvicorn.run(
            "app.main:app",
            host="0.0.0.0",
            port=8000,
            reload=True,
            log_level="info",
            access_log=True
        )
    except Exception as e:
        logger.error(f"Failed to start server: {str(e)}")
        sys.exit(1)