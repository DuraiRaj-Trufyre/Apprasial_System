from pydantic import BaseModel, Field
from typing import Optional, List

class AppraisalEntry(BaseModel):
    stage: str  # SELF, MANAGER, HR, FINAL
    question: str
    self_rating: Optional[int]
    manager_rating: Optional[int]
    comments: Optional[str]

class Appraisal(BaseModel):
    id: Optional[str]
    cycle_id: str
    employee_id: str
    manager_id: str
    status: str  # pending, Submitted, manager_reviewed, hr_reviewed, completed
    final_score: Optional[int]
    entries: List[AppraisalEntry] = []
    overall_comment: Optional[str] = None
    manager_overall_comment: Optional[str] = None
