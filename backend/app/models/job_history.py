from pydantic import BaseModel
from datetime import datetime
from typing import Literal, Optional

class JobHistory(BaseModel):
    id: str
    user_id: str
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    file_name: str
    file_size: int
    file_type: str
    status: Literal['completed', 'error']
    timestamp: datetime
    output_format: str
    processing_type: Literal['transcode', 'watermark'] 