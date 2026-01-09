from fastapi import APIRouter, HTTPException, status, Depends
from app.models.user import UserCreate, UserLogin, User, UserPublic
from app.db.mongodb import db
from app.utils.auth import hash_password, verify_password
from pydantic import EmailStr
from fastapi.security import OAuth2PasswordRequestForm, HTTPBearer
import jwt
import os

router = APIRouter()
bearer_scheme = HTTPBearer()

SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key")

# List all users (for admin/superadmin)
@router.get('/users')
async def list_users():
    users = []
    cursor = db["users"].find({})
    async for doc in cursor:
        users.append({
            "id": str(doc["_id"]),
            "name": doc.get("name", ""),
            "email": doc.get("email", ""),
            "role": doc.get("role", ""),
            "manager_id": doc.get("manager_id", None)
        })
    return users

@router.post('/register-superadmin', response_model=UserPublic)
async def register_superadmin(user: UserCreate):
    existing = await db["users"].find_one({"email": user.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    password = str(user.password)
    password = password[:72]
    hashed_pw = hash_password(password)
    user_dict = user.dict()
    user_dict["password"] = hashed_pw
    user_dict["role"] = "superadmin"
    user_dict["manager_id"] = None
    result = await db["users"].insert_one(user_dict)
    user_dict["id"] = str(result.inserted_id)
    return UserPublic(**user_dict)

# Endpoint to list all managers for employee registration dropdown
@router.get('/managers')
async def list_managers():
    cursor = db["users"].find({"role": "manager"})
    managers = []
    async for doc in cursor:
        managers.append({
            "id": str(doc["_id"]),
            "name": doc.get("name", ""),
            "email": doc.get("email", "")
        })
    return {"managers": managers}


# Endpoint to register a superadmin (for initial setup)
@router.post('/register-superadmin', response_model=UserPublic)
async def register_superadmin(user: UserCreate):
    existing = await db["users"].find_one({"email": user.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    password = str(user.password)
    password = password[:72]
    hashed_pw = hash_password(password)
    user_dict = user.dict()
    user_dict["password"] = hashed_pw
    user_dict["role"] = "superadmin"
    user_dict["manager_id"] = None
    result = await db["users"].insert_one(user_dict)
    user_dict["id"] = str(result.inserted_id)
    return UserPublic(**user_dict)

@router.post('/register', response_model=UserPublic)
async def register(user: UserCreate):
    existing = await db["users"].find_one({"email": user.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    password = str(user.password)
    password = password[:72]
    hashed_pw = hash_password(password)
    user_dict = user.dict()
    user_dict["password"] = hashed_pw
    # If role is hr, remove manager_id if present and set to None
    if user_dict.get("role") == "hr":
        user_dict["manager_id"] = None
    result = await db["users"].insert_one(user_dict)
    user_dict["id"] = str(result.inserted_id)
    # Return public user object (no password)
    return UserPublic(**user_dict)

@router.post('/login')
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = await db["users"].find_one({"email": form_data.username})
    if not user or not verify_password(form_data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = jwt.encode({
        "sub": str(user["_id"]),
        "role": user["role"],
        "name": user.get("name", "")
    }, SECRET_KEY, algorithm="HS256")
    return {"access_token": token, "token_type": "bearer"}

# Example protected endpoint for Swagger Bearer token input
@router.get('/me')
async def me(token: str = Depends(bearer_scheme)):
    return {"token_received": token}
