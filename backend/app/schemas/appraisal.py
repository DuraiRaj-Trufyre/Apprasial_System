from pydantic import BaseModel, Field
from typing import List, Optional


# Per-question fields (if needed)
class AppraisalEntrySchema(BaseModel):
    question: Optional[str] = None
    self_rating: Optional[int] = None
    comments: Optional[str] = None


# Parameter model with weightage, rating and comments
class AppraisalParameter(BaseModel):
    category: str
    parameter: str
    objective: Optional[str] = None
    kpi: Optional[str] = None
    weightage: float = Field(..., ge=0)
    rating: Optional[int] = Field(None, ge=1, le=5)
    comments: Optional[str] = None


# Whole-appraisal fields
class AppraisalCreateSchema(BaseModel):
    cycle_id: str
    employee_id: str
    manager_id: str
    parameters: Optional[List[AppraisalParameter]] = None
    overall_score: Optional[float] = None
    overall_comment: Optional[str] = None
    manager_overall_comment: Optional[str] = None


class HRApproveRequest(BaseModel):
    appraisalId: str
    hr_parameters: Optional[list] = None

