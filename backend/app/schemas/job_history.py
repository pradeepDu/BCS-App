from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional
from uuid import UUID

class JobHistoryBase(BaseModel):
    user_id: str = Field(..., min_length=1, max_length=36)
    user_name: Optional[str] = Field(None, max_length=255)
    user_email: Optional[str] = Field(None, max_length=255)
    file_name: str = Field(..., min_length=1, max_length=255)
    file_size: float = Field(..., ge=0)
    file_type: str = Field(..., min_length=1, max_length=50)
    status: str = Field(..., min_length=1, max_length=20)
    output_format: Optional[str] = Field(None, max_length=20)
    processing_type: str = Field(..., min_length=1, max_length=20)

class JobHistoryCreate(JobHistoryBase):
    pass

class JobHistory(JobHistoryBase):
    id: str = Field(..., min_length=1, max_length=36)
    timestamp: datetime

    class Config:
        from_attributes = True 