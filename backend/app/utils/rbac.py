from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
import jwt
import os

SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

from fastapi import Request
import jwt

async def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        user_id = payload.get("sub")
        role = payload.get("role")
        if user_id is None or role is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = {"id": user_id, "role": role}
        # If manager, fetch manager_id from DB
        if role == "manager":
            from app.db.mongodb import db
            doc = await db["users"].find_one({"_id": user_id})
            if doc and "manager_id" in doc:
                user["manager_id"] = doc["manager_id"]
        return user
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

def require_role(required_role: str):
    def role_checker(user=Depends(get_current_user)):
        if user["role"] != required_role:
            raise HTTPException(status_code=403, detail="Forbidden")
        return user
    return role_checker
