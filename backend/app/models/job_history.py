from pydantic import BaseModel, Field, validator
from datetime import datetime
from typing import Optional
from bson import ObjectId

class PyObjectId(str):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v, handler):
        if isinstance(v, ObjectId):
            return str(v)
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return str(v)

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
    frontend_id: Optional[str] = Field(None)  # Allow frontend-generated ID
    timestamp: Optional[datetime] = Field(default_factory=datetime.utcnow)

    @validator('timestamp', pre=True)
    def parse_timestamp(cls, v):
        if isinstance(v, str):
            try:
                return datetime.fromisoformat(v.replace('Z', '+00:00'))
            except ValueError:
                return datetime.utcnow()
        return v or datetime.utcnow()

class JobHistoryCreate(JobHistoryBase):
    pass

class JobHistory(JobHistoryBase):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str} 