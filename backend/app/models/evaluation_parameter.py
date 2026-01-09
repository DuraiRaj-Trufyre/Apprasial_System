from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class EvaluationParameter(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    category: str
    parameter: str
    objective: str
    kpi: str
    weightage: float
    active: bool = True
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        orm_mode = True
        allow_population_by_field_name = True
