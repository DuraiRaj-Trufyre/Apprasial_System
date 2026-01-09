from fastapi import Body
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status
from typing import Optional
from app.utils.rbac import require_role
from app.schemas.appraisal import AppraisalCreateSchema
from app.models.appraisal import Appraisal
from app.db.mongodb import db
from app.utils.notification import create_notification
from app.utils.email import notify_user_by_email
from fastapi import Request
from bson import ObjectId
import logging

router = APIRouter()

# HR rejection endpoint
from fastapi import Body

@router.post('/hr/reject', status_code=200)
async def hr_reject_appraisal(
    request: Request,
    payload: dict = Body(...),
    user=Depends(require_role("hr"))
):
    from bson import ObjectId
    appraisal_id = payload.get("appraisal_id")
    reason = payload.get("reason", "Rejected by HR")
    hr_comments = payload.get("hr_comments", "")
    if not appraisal_id:
        raise HTTPException(status_code=400, detail="appraisal_id is required")
    # Find appraisal by id
    try:
        obj_id = ObjectId(appraisal_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid appraisal_id")
    appraisal = await db["appraisals"].find_one({"_id": obj_id})
    if not appraisal:
        raise HTTPException(status_code=404, detail="Appraisal not found")
    # Update status and add HR comments
    update_fields = {
        "status": "Rejected by HR - Refill Required",
        "hr_comments": hr_comments,
        "hr_rating": None
    }
    await db["appraisals"].update_one({"_id": obj_id}, {"$set": update_fields})
    # Notify both manager and employee
    from app.utils.notification import create_notification
    from app.utils.email import notify_user_by_email
    message = f"HR rejected appraisal for cycle {appraisal.get('cycle_id')}. Reason: {reason}"
    await create_notification(appraisal["manager_id"], message)
    await create_notification(appraisal["employee_id"], message)
    await notify_user_by_email(appraisal["manager_id"], "Appraisal Rejected by HR", message)
    await notify_user_by_email(appraisal["employee_id"], "Appraisal Rejected by HR", message)
    return {"message": "Appraisal rejected by HR and notifications sent."}

# Manager view endpoint: fetch full appraisal by ID, only if manager is authorized
from fastapi import Path

@router.get('/manager/view/{appraisal_id}')
async def manager_view_appraisal(appraisal_id: str = Path(...), user=Depends(require_role("manager"))):
    from bson import ObjectId
    # Try both string and ObjectId
    appraisal = await db["appraisals"].find_one({"id": appraisal_id})
    obj_id = None
    if not appraisal:
        try:
            obj_id = ObjectId(appraisal_id)
            appraisal = await db["appraisals"].find_one({"_id": obj_id})
        except Exception:
            pass
    if not appraisal:
        raise HTTPException(status_code=404, detail="Appraisal not found.")
    # Only allow if manager is assigned
    if appraisal.get("manager_id") != user["id"]:
        raise HTTPException(status_code=403, detail="You are not authorized to view this appraisal.")
    # Convert _id to string for frontend
    if "_id" in appraisal:
        appraisal["id"] = str(appraisal["_id"])
        del appraisal["_id"]
    return appraisal

# Manager self-appraisal endpoint
from fastapi import Request
from app.schemas.appraisal import AppraisalCreateSchema

@router.post('/manager/self-appraise', status_code=201)
async def manager_self_appraise(request: Request, user=Depends(require_role("manager"))):
    # Read raw body for debugging
    try:
        raw = await request.json()
    except Exception as e:
        logging.error(f"Failed to read JSON body: {e}")
        raise HTTPException(status_code=422, detail="Invalid JSON body.")
    logging.warning(f"Manager self-appraisal raw payload: {raw}")
    # Validate against Pydantic schema to produce clearer errors
    try:
        appraisal = AppraisalCreateSchema(**raw)
    except Exception as e:
        logging.error(f"Validation error for manager self-appraisal: {e}")
        raise HTTPException(status_code=422, detail=str(e))
    logging.warning(f"Manager self-appraisal data: {appraisal.dict()}")
    # Only allow if manager is submitting for themselves
    if appraisal.employee_id != user["id"]:
        raise HTTPException(status_code=403, detail="You can only submit your own appraisal.")
    # Check if already Submitted for this cycle
    existing = await db["appraisals"].find_one({"cycle_id": appraisal.cycle_id, "employee_id": user["id"]})
    if existing:
        raise HTTPException(status_code=400, detail="Appraisal already Submitted for this cycle.")
    appraisal_doc = appraisal.dict()
    appraisal_doc["manager_id"] = user["id"]
    appraisal_doc["status"] = "Manager Approved"
    result = await db["appraisals"].insert_one(appraisal_doc)
    appraisal_doc["id"] = str(result.inserted_id)
    if "_id" in appraisal_doc:
        del appraisal_doc["_id"]
    # Notify HR
    hr_users = db["users"].find({"role": "hr"})
    message = f"Manager {user['id']} Submitted a self-appraisal for cycle {appraisal.cycle_id}."
    async for hr in hr_users:
        await create_notification(str(hr["_id"]), message)
        await notify_user_by_email(str(hr["_id"]), "Manager Self-Appraisal Submitted", message)
    return appraisal_doc

# Pydantic model for HR approval

# Accept flexible dict for HR approve to allow hr_parameters
class HRApproveRequest(BaseModel):
    appraisalId: str
    hr_rating: Optional[int] = None
    hr_comments: Optional[str] = ""
    hr_parameters: Optional[list] = None

# HR approve endpoint

@router.post('/hr/approve', status_code=200)
async def hr_approve(
    request: HRApproveRequest,
    user=Depends(require_role("hr"))
):
    logging.warning("/hr/approve endpoint called")
    logging.warning(f"Request body: {request}")
    from bson import ObjectId
    appraisal_id = request.appraisalId
    obj_id = None
    appraisal = await db["appraisals"].find_one({"id": appraisal_id})
    logging.warning(f"Appraisal by id: {appraisal}")
    if not appraisal:
        try:
            obj_id = ObjectId(appraisal_id)
            appraisal = await db["appraisals"].find_one({"_id": obj_id})
            logging.warning(f"Appraisal by _id: {appraisal}")
        except Exception as e:
            logging.error(f"ObjectId conversion failed: {e}")
    if not appraisal:
        logging.error("Appraisal not found.")
        raise HTTPException(status_code=404, detail="Appraisal not found.")

    update_fields = {"status": "HR Approved"}
    # Per-parameter HR ratings/comments
    hr_parameters = request.hr_parameters
    if hr_parameters and isinstance(hr_parameters, list):
        params = appraisal.get("parameters", [])
        param_index = {p["parameter"]: p for p in params}
        for hp in hr_parameters:
            pname = hp.get("parameter")
            if pname and pname in param_index:
                if "hr_rating" in hp:
                    param_index[pname]["hr_rating"] = hp["hr_rating"]
                if "hr_comments" in hp:
                    param_index[pname]["hr_comments"] = hp["hr_comments"]
        updated_params = list(param_index.values())
        update_fields["parameters"] = updated_params
        # Calculate hr_overall_score
        total_weight = 0.0
        weighted_score = 0.0
        for p in updated_params:
            w = float(p.get("weightage", 0))
            r = p.get("hr_rating")
            if r is not None:
                total_weight += w
                weighted_score += (r / 5.0) * w
        if total_weight > 0:
            hr_overall_score = round((weighted_score / total_weight) * 5, 2)
            update_fields["hr_overall_score"] = hr_overall_score
    # Optionally: store overall HR rating/comments if provided
    if request.hr_rating is not None:
        update_fields["hr_rating"] = request.hr_rating
    if request.hr_comments:
        update_fields["hr_comments"] = request.hr_comments
    update = {"$set": update_fields}
    if obj_id:
        await db["appraisals"].update_one({"_id": obj_id}, update)
    else:
        await db["appraisals"].update_one({"id": appraisal_id}, update)
    response = {"message": "HR approval Submitted."}
    if "_id" in appraisal:
        response["id"] = str(appraisal["_id"])
    logging.warning(f"HR approval response: {response}")
    return response
# Manager approve endpoint (replicates manager_review logic)

@router.get('/manager/pending')
async def manager_pending(user=Depends(require_role("manager"))):
    manager_id = str(user["id"])
    logging.warning(f"Manager Pending Query: manager_id={manager_id}")
    cursor = db["appraisals"].find({
        "manager_id": manager_id,
        "status": {"$in": ["Submitted", "pending"]}
    })
    pending = []
    async for doc in cursor:
        # Convert all ObjectId fields to strings
        if "_id" in doc:
            doc["id"] = str(doc["_id"])
            del doc["_id"]
        for k, v in doc.items():
            if isinstance(v, dict):
                for kk, vv in v.items():
                    if str(type(vv)).endswith("ObjectId')"):
                        v[kk] = str(vv)
            elif str(type(v)).endswith("ObjectId')"):
                doc[k] = str(v)
        # Fetch employee name
        employee_id = doc.get("employee_id")
        employee = await db["users"].find_one({"_id": ObjectId(employee_id)})
        doc["employeeName"] = employee["name"] if employee and "name" in employee else "Unknown"
        logging.warning(f"Found appraisal for manager: {doc}")
        pending.append(doc)
    logging.warning(f"Total pending appraisals for manager {manager_id}: {len(pending)}")
    return {"pending_reviews": pending}

@router.post('/manager/approve', status_code=200)
async def manager_approve(
    payload: dict = Body(...),
    user=Depends(require_role("manager"))
):
    from bson import ObjectId
    # Extract appraisal_id from the payload
    appraisal_id = payload.get("appraisalId") or payload.get("appraisal_id")

    # Validate that appraisal_id is present in the payload
    if not appraisal_id:
        raise HTTPException(
            status_code=400,
            detail="Appraisal ID is required in the payload to identify the appraisal document."
        )

    # Log the extracted appraisal_id for debugging
    logging.warning(f"Extracted appraisal_id: {appraisal_id}")

    obj_id = None
    appraisal = await db["appraisals"].find_one({"id": appraisal_id})
    if not appraisal:
        try:
            obj_id = ObjectId(appraisal_id)
            appraisal = await db["appraisals"].find_one({"_id": obj_id})
        except Exception:
            pass
    if not appraisal:
        raise HTTPException(status_code=404, detail="Appraisal not found.")
    logging.warning(f"Manager Approve Debug: user={user}, appraisal={appraisal}")
    if appraisal["manager_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="You can only approve your reportees' appraisals.")
    # Accept manager's ratings/comments for parameters array if provided
    manager_parameters = payload.get("manager_parameters")
    update_fields = {"status": "Manager Approved"}
    # Optionally: store manager's per-parameter ratings/comments
    manager_overall_score = None
    if manager_parameters and isinstance(manager_parameters, list):
        # Merge manager ratings/comments into parameters array
        params = appraisal.get("parameters", [])
        param_index = {p["parameter"]: p for p in params}
        for mp in manager_parameters:
            pname = mp.get("parameter")
            if pname and pname in param_index:
                # Store manager_rating and manager_comments per parameter
                if "manager_rating" in mp:
                    param_index[pname]["manager_rating"] = mp["manager_rating"]
                if "manager_comments" in mp:
                    param_index[pname]["manager_comments"] = mp["manager_comments"]
        # Save updated parameters array
        updated_params = list(param_index.values())
        update_fields["parameters"] = updated_params
        # Calculate manager_overall_score
        total_weight = 0.0
        weighted_score = 0.0
        for p in updated_params:
            w = float(p.get("weightage", 0))
            r = p.get("manager_rating")
            if r is not None:
                total_weight += w
                weighted_score += (r / 5.0) * w
        if total_weight > 0:
            # Out of 5, not 100
            manager_overall_score = round((weighted_score / total_weight) * 5, 2)
            update_fields["manager_overall_score"] = manager_overall_score
    # Optionally: store overall manager_rating/comments if provided
    if "manager_rating" in payload:
        update_fields["manager_rating"] = payload["manager_rating"]
    if "manager_comments" in payload:
        update_fields["manager_comments"] = payload["manager_comments"]
    if "manager_overall_comment" in payload:
        update_fields["manager_overall_comment"] = payload["manager_overall_comment"]
    logging.warning(f"manager_approve update_fields: {update_fields}")
    update = {"$set": update_fields}
    # Ensure stricter query filter to uniquely identify the appraisal
    query_filter = {"_id": obj_id} if obj_id else {"id": appraisal_id}
    query_filter.update({
        "manager_id": user["id"],
        "cycle_id": appraisal.get("cycle_id"),
        "employee_id": appraisal.get("employee_id")
    })

    # Log the appraisal_id being used for debugging
    logging.warning(f"Using query filter: {query_filter}")

    # Debugging logs to trace the payload and query filter
    logging.warning(f"Received payload: {payload}")
    logging.warning(f"Query filter: {query_filter}")

    # Validate that the appraisal_id exists in the database
    existing_appraisal = await db["appraisals"].find_one(query_filter)
    if not existing_appraisal:
        raise HTTPException(status_code=404, detail="Appraisal not found with the provided appraisal_id.")

    # Update the appraisal document
    await db["appraisals"].update_one(query_filter, update)
    updated_doc = await db["appraisals"].find_one(query_filter)

    # Log the updated document for debugging
    logging.warning(f"Updated appraisal document: {updated_doc}")

    # Notify HR
    from app.utils.notification import create_notification
    from app.utils.email import notify_user_by_email
    hr_users = db["users"].find({"role": "hr"})
    message = f"Manager {user['id']} approved appraisal {appraisal_id}."
    async for hr in hr_users:
        await create_notification(str(hr["_id"]), message)
        await notify_user_by_email(str(hr["_id"]), "Appraisal Approved by Manager", message)
    response = {"message": "Manager approval Submitted."}
    if "_id" in appraisal:
        response["id"] = str(appraisal["_id"])
    return response

@router.post('/manager/reject', status_code=200)
async def manager_reject(
    payload: dict = Body(...),
    user=Depends(require_role("manager"))
):
    from bson import ObjectId
    appraisal_id = payload.get("appraisalId") or payload.get("appraisal_id")
    if not appraisal_id:
        raise HTTPException(status_code=400, detail="Appraisal ID is required in the payload to identify the appraisal document.")
    obj_id = None
    appraisal = await db["appraisals"].find_one({"id": appraisal_id})
    if not appraisal:
        try:
            obj_id = ObjectId(appraisal_id)
            appraisal = await db["appraisals"].find_one({"_id": obj_id})
        except Exception:
            pass
    if not appraisal:
        raise HTTPException(status_code=404, detail="Appraisal not found.")
    if appraisal["manager_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="You can only reject your reportees' appraisals.")
    # Set status to rejected and allow refill
    update_fields = {"status": "Rejected - Refill Required"}
    update = {"$set": update_fields}
    query_filter = {"_id": obj_id} if obj_id else {"id": appraisal_id}
    query_filter.update({
        "manager_id": user["id"],
        "cycle_id": appraisal.get("cycle_id"),
        "employee_id": appraisal.get("employee_id")
    })
    await db["appraisals"].update_one(query_filter, update)
    # Notify employee
    from app.utils.notification import create_notification
    from app.utils.email import notify_user_by_email
    message = f"Manager {user['id']} rejected your appraisal for cycle {appraisal.get('cycle_id')}. Please refill and resubmit."
    await create_notification(appraisal["employee_id"], message)
    await notify_user_by_email(appraisal["employee_id"], "Appraisal Rejected by Manager", message)
    return {"message": "Appraisal rejected and employee notified."}

@router.get('/hr/pending')
async def hr_pending(user=Depends(require_role("hr"))):
    cursor = db["appraisals"].find({"status": "Manager Approved"})
    pending = []
    async for doc in cursor:
        doc["id"] = str(doc["_id"])
        pending.append(doc)
    return {"pending_hr_reviews": pending}

@router.get('/view/{cycle_id}')
async def view_appraisal(cycle_id: str, user=Depends(require_role("employee"))):
    appraisal = await db["appraisals"].find_one({"cycle_id": cycle_id, "employee_id": user["id"]})
    if not appraisal:
        raise HTTPException(status_code=404, detail="Appraisal not found for this cycle.")
    appraisal["id"] = str(appraisal["_id"])
    from fastapi import Request
    from bson import ObjectId
    return appraisal

@router.get('/history')
async def appraisal_history(user=Depends(require_role("employee"))):
    cursor = db["appraisals"].find({"employee_id": user["id"]})
    history = []
    async for doc in cursor:
        # Convert all ObjectId fields to strings
        if "_id" in doc:
            doc["id"] = str(doc["_id"])
            del doc["_id"]
        for k, v in doc.items():
            if isinstance(v, dict):
                for kk, vv in v.items():
                    if str(type(vv)).endswith("ObjectId')"):
                        v[kk] = str(vv)
            elif str(type(v)).endswith("ObjectId')"):
                doc[k] = str(v)
        history.append(doc)
    return {"history": history}

@router.post('/manager-review', status_code=200)
async def manager_review(appraisal_id: str, manager_rating: int, comments: Optional[str] = None, user=Depends(require_role("manager"))):
    # Find appraisal and check manager access
    from bson import ObjectId
    obj_id = None
    appraisal = await db["appraisals"].find_one({"id": appraisal_id})
    if not appraisal:
        try:
            obj_id = ObjectId(appraisal_id)
            appraisal = await db["appraisals"].find_one({"_id": obj_id})
        except Exception:
            pass
    if not appraisal:
        raise HTTPException(status_code=404, detail="Appraisal not found.")
    # Match manager_id in appraisal to manager's user id
    if appraisal["manager_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="You can only review your reportees' appraisals.")
    # Update appraisal with manager rating and comments
    update = {"$set": {"status": "Manager Approved", "manager_rating": manager_rating, "manager_comments": comments}}
    if obj_id:
        await db["appraisals"].update_one({"_id": obj_id}, update)
    else:
        await db["appraisals"].update_one({"id": appraisal_id}, update)
    # Remove _id if present in response
    response = {"message": "Manager review Submitted."}
    if "_id" in appraisal:
        response["id"] = str(appraisal["_id"])
    return response

@router.post('/hr-finalize', status_code=200)
async def hr_finalize(appraisal_id: str, final_score: int, comments: Optional[str] = None, user=Depends(require_role("hr"))):
    from bson import ObjectId
    obj_id = None
    appraisal = await db["appraisals"].find_one({"id": appraisal_id})
    if not appraisal:
        try:
            obj_id = ObjectId(appraisal_id)
            appraisal = await db["appraisals"].find_one({"_id": obj_id})
        except Exception:
            pass
    if not appraisal:
        raise HTTPException(status_code=404, detail="Appraisal not found.")
    # Update appraisal with HR final score and comments
    update = {"$set": {"status": "completed", "final_score": final_score, "hr_comments": comments}}
    if obj_id:
        await db["appraisals"].update_one({"_id": obj_id}, update)
    else:
        await db["appraisals"].update_one({"id": appraisal_id}, update)
    # Notify employee
    message = f"HR finalized your appraisal for cycle {appraisal['cycle_id']}."
    await create_notification(appraisal["employee_id"], message)
    await notify_user_by_email(appraisal["employee_id"], "Appraisal Finalized by HR", message)
@router.post('/submit-self', status_code=201)

async def submit_self_appraisal(request: Request, appraisal: AppraisalCreateSchema, user=Depends(require_role("employee"))):
    from app.config.parameters import DEFAULT_PARAMETERS

    logging.warning(f"Received appraisal data: {appraisal.dict()}")
    # Only allow if user is submitting for themselves
    if appraisal.employee_id != user["id"]:
        raise HTTPException(status_code=403, detail="You can only submit your own appraisal.")
    # Check if already Submitted for this cycle
    existing = await db["appraisals"].find_one({"cycle_id": appraisal.cycle_id, "employee_id": user["id"]})
    if existing:
        raise HTTPException(status_code=400, detail="Appraisal already Submitted for this cycle.")
    # Ensure manager_id is present, fetch from user record if missing
    if not appraisal.manager_id:
        user_collection = db["users"]
        user_doc = await user_collection.find_one({"_id": ObjectId(user["id"])});
        if user_doc and user_doc.get("manager_id"):
            appraisal.manager_id = str(user_doc["manager_id"])
        else:
            raise HTTPException(status_code=400, detail="Manager not assigned to employee.")

    # Merge provided parameters with defaults. If no parameters provided, use DEFAULT_PARAMETERS
    provided_params = appraisal.parameters or []
    merged_params = []
    # Helper: find matching default by parameter name
    def find_default(param_name):
        for p in DEFAULT_PARAMETERS:
            if p["parameter"] == param_name:
                return p
        return None

    # Index defaults by parameter name for quick lookup
    default_index = {p["parameter"]: p for p in DEFAULT_PARAMETERS}

    if provided_params:
        for p in provided_params:
            # p may be a dict or AppraisalParameter model
            item = p if isinstance(p, dict) else p.dict()
            param_name = item.get("parameter")
            default = default_index.get(param_name)
            merged = {}
            if default:
                merged.update(default)
            # Override with provided fields (rating, comments) and preserve weightage
            merged.update({k: v for k, v in item.items() if v is not None})
            # Validate rating if present
            if "rating" in merged and merged["rating"] is not None:
                try:
                    r = int(merged["rating"])
                except Exception:
                    raise HTTPException(status_code=422, detail=f"Invalid rating for {param_name}")
                if r < 1 or r > 5:
                    raise HTTPException(status_code=422, detail=f"Rating for {param_name} must be between 1 and 5")
                merged["rating"] = r
            merged_params.append(merged)
    else:
        # No params provided; create empty ratings from defaults
        for d in DEFAULT_PARAMETERS:
            merged = d.copy()
            merged["rating"] = None
            merged["comments"] = None
            merged_params.append(merged)

    # Compute overall score: weighted sum of (rating / 5) * weightage scaled to 5
    # If some ratings are missing, compute based on available weight sum and normalize
    total_weight_present = 0.0
    weighted_score = 0.0
    for p in merged_params:
        w = float(p.get("weightage", 0))
        r = p.get("rating")
        logging.warning(f"Parameter: {p}, Weightage: {w}, Rating: {r}")
        if r is not None:
            total_weight_present += w
            # rating is 1-5; convert to fraction 0-1
            weighted_score += (r / 5.0) * w

    logging.warning(f"Total Weight Present: {total_weight_present}, Weighted Score: {weighted_score}")

    overall_score = None
    if total_weight_present > 0:
        # Out of 5, not 100
        overall_score = round((weighted_score / total_weight_present) * 5, 2)
        logging.warning(f"Calculated Overall Score: {overall_score}")

    appraisal_doc = appraisal.dict()
    # store merged parameters and overall_score
    appraisal_doc["parameters"] = merged_params
    appraisal_doc["overall_score"] = overall_score
    appraisal_doc["manager_id"] = appraisal.manager_id
    appraisal_doc["status"] = "Submitted"
    # Store overall_comment if present
    if hasattr(appraisal, "overall_comment") and appraisal.overall_comment:
        appraisal_doc["overall_comment"] = appraisal.overall_comment
    result = await db["appraisals"].insert_one(appraisal_doc)
    appraisal_doc["id"] = str(result.inserted_id)
    # Remove _id if present
    if "_id" in appraisal_doc:
        del appraisal_doc["_id"]
    # Notify manager
    message = f"Employee {user['id']} Submitted self appraisal for cycle {appraisal.cycle_id}."
    await create_notification(appraisal.manager_id, message)
    await notify_user_by_email(appraisal.manager_id, "New Appraisal Submission", message)
    return appraisal_doc

@router.get('/hr-only')
def hr_only_route(user=Depends(require_role("hr"))):
    name = user.get("name", "HR")
    return {"message": f"Welcome, {name}"}

@router.get('/all')
async def get_all_appraisals():
    cursor = db["appraisals"].find({})
    appraisals = []
    async for doc in cursor:
        doc["id"] = str(doc["_id"])
        if "_id" in doc:
            del doc["_id"]
        # Add employeeName
        employee_id = doc.get("employee_id")
        employee = await db["users"].find_one({"_id": ObjectId(employee_id)})
        doc["employeeName"] = employee["name"] if employee and "name" in employee else "Unknown"
        appraisals.append(doc)
    return {"appraisals": appraisals}

@router.get('/manager/history')
async def manager_history(manager_id: str):
    """
    Fetch the appraisal history for a specific manager, including employee names.
    """
    from bson import ObjectId
    # Validate manager_id
    try:
        manager_obj_id = ObjectId(manager_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid manager_id format.")

    # Query appraisals for the manager
    cursor = db["appraisals"].find({"manager_id": manager_id})
    history = []
    async for doc in cursor:
        # Convert ObjectId fields to strings
        if "_id" in doc:
            doc["id"] = str(doc["_id"])
            del doc["_id"]
        for k, v in doc.items():
            if isinstance(v, dict):
                for kk, vv in v.items():
                    if str(type(vv)).endswith("ObjectId')"):
                        v[kk] = str(vv)
            elif str(type(v)).endswith("ObjectId')"):
                doc[k] = str(v)
        # Fetch employee name
        employee_id = doc.get("employee_id")
        employee = await db["users"].find_one({"_id": ObjectId(employee_id)})
        doc["employeeName"] = employee["name"] if employee and "name" in employee else "Unknown"
        history.append(doc)

    return {"history": history}

@router.patch('/submit-self', status_code=200)
async def refill_self_appraisal(request: Request, appraisal: AppraisalCreateSchema, user=Depends(require_role("employee"))):
    from bson import ObjectId
    # Only allow if user is submitting for themselves
    if appraisal.employee_id != user["id"]:
        raise HTTPException(status_code=403, detail="You can only submit your own appraisal.")
    # Find the existing appraisal by id or cycle_id+employee_id
    obj_id = None
    existing = None
    if hasattr(appraisal, "id") and appraisal.id:
        try:
            obj_id = ObjectId(appraisal.id)
            existing = await db["appraisals"].find_one({"_id": obj_id})
        except Exception:
            pass
    if not existing:
        existing = await db["appraisals"].find_one({"cycle_id": appraisal.cycle_id, "employee_id": user["id"]})
        if existing:
            obj_id = existing.get("_id")
    if not existing:
        raise HTTPException(status_code=404, detail="Appraisal not found for refill.")
    # Calculate new overall_score from parameters
    params = appraisal.parameters or []
    total_weight = sum(p.weightage for p in params if p.rating is not None)
    overall_score = 0.0
    if total_weight > 0:
        overall_score = sum((p.rating or 0) * p.weightage for p in params if p.rating is not None) / total_weight
        overall_score = round(overall_score, 2)
    # Prepare updated fields
    update_fields = appraisal.dict(exclude_unset=True)
    update_fields["overall_score"] = overall_score
    update_fields["status"] = "Submitted"  # Reset status to allow review again
    # Remove id if present
    update_fields.pop("id", None)
    update = {"$set": update_fields}
    await db["appraisals"].update_one({"_id": obj_id}, update)
    # Notify manager
    from app.utils.notification import create_notification
    from app.utils.email import notify_user_by_email
    message = f"Employee {user['id']} refilled and resubmitted appraisal for cycle {appraisal.cycle_id}."
    await create_notification(existing["manager_id"], message)
    await notify_user_by_email(existing["manager_id"], "Appraisal Refilled & Resubmitted", message)
    return {"message": "Appraisal refilled and resubmitted successfully."}
