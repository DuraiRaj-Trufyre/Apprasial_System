
from fastapi import APIRouter, HTTPException, Depends
from app.schemas.evaluation_parameter import EvaluationParameterSchema, EvaluationParameterUpdateSchema
from app.models.evaluation_parameter import EvaluationParameter
from app.db.mongodb import db
from bson import ObjectId
from datetime import datetime
from app.utils.rbac import require_role

router = APIRouter()

# Public endpoint to get only active parameters (for employees, managers, HR)
@router.get("/parameters/active", response_model=list[EvaluationParameter])
async def list_active_parameters():
    collection = get_collection()
    params = []
    async for doc in collection.find({"active": True}):
        doc["id"] = str(doc["_id"])
        doc.pop("_id", None)
        params.append(EvaluationParameter(**doc))
    return params

# Super admin only endpoints

def get_collection():
    return db["evaluation_parameters"]

@router.get("/parameters", response_model=list[EvaluationParameter])
async def list_parameters(user=Depends(require_role("superadmin"))):
    collection = get_collection()
    params = []
    async for doc in collection.find({}):
        doc["id"] = str(doc["_id"])
        doc.pop("_id", None)
        params.append(EvaluationParameter(**doc))
    return params

@router.post("/parameters", response_model=EvaluationParameter)
async def create_parameter(param: EvaluationParameterSchema, user=Depends(require_role("superadmin"))):
    collection = get_collection()
    now = datetime.utcnow()
    doc = param.dict()
    doc["created_at"] = now
    doc["updated_at"] = now
    result = await collection.insert_one(doc)
    doc["_id"] = result.inserted_id
    doc["id"] = str(result.inserted_id)
    doc.pop("_id", None)
    return EvaluationParameter(**doc)

@router.put("/parameters/{param_id}", response_model=EvaluationParameter)
async def update_parameter(param_id: str, param: EvaluationParameterUpdateSchema, user=Depends(require_role("superadmin"))):
    collection = get_collection()
    update = {k: v for k, v in param.dict(exclude_unset=True).items()}
    update["updated_at"] = datetime.utcnow()
    result = await collection.update_one({"_id": ObjectId(param_id)}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Parameter not found")
    doc = await collection.find_one({"_id": ObjectId(param_id)})
    doc["id"] = str(doc["_id"])
    return EvaluationParameter(**doc)

@router.delete("/parameters/{param_id}")
async def delete_parameter(param_id: str, user=Depends(require_role("superadmin"))):
    collection = get_collection()
    result = await collection.delete_one({"_id": ObjectId(param_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Parameter not found")
    return {"detail": "Deleted"}
