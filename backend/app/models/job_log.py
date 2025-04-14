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

class JobLogBase(BaseModel):
    job_id: str = Field(..., min_length=1)
    timestamp: Optional[datetime] = Field(default_factory=datetime.utcnow)
    action: str = Field(..., min_length=1, max_length=100)
    details: Optional[str] = Field(None)
    status: str = Field(..., min_length=1, max_length=20)
    stage: Optional[str] = Field(None, max_length=50)
    progress: Optional[int] = Field(None, ge=0, le=100)
    
    @validator('timestamp', pre=True)
    def parse_timestamp(cls, v):
        if isinstance(v, str):
            try:
                return datetime.fromisoformat(v.replace('Z', '+00:00'))
            except ValueError:
                return datetime.utcnow()
        return v or datetime.utcnow()

class JobLogCreate(JobLogBase):
    pass

class JobLog(JobLogBase):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str} 