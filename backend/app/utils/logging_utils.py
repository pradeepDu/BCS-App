import logging
import os
from app.config import LOG_DIR

def setup_logging(name):
    """
    Configure and return a logger instance
    """
    log_file = os.path.join(LOG_DIR, "app.log")
    
    logger = logging.getLogger(name)
    
    # Only configure if handlers aren't already set up
    if not logger.handlers:
        logger.setLevel(logging.INFO)
        
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        
        # File handler
        file_handler = logging.FileHandler(log_file)
        file_handler.setFormatter(formatter)
        
        # Stream handler
        stream_handler = logging.StreamHandler()
        stream_handler.setFormatter(formatter)
        
        # Add handlers
        logger.addHandler(file_handler)
        logger.addHandler(stream_handler)
    
    return logger