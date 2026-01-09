from pydantic import BaseModel, Field
from typing import Optional

class EvaluationParameterSchema(BaseModel):
    category: str
    parameter: str
    objective: str
    kpi: str
    weightage: float
    active: Optional[bool] = True

class EvaluationParameterUpdateSchema(BaseModel):
    category: Optional[str]
    parameter: Optional[str]
    objective: Optional[str]
    kpi: Optional[str]
    weightage: Optional[float]
    active: Optional[bool]
