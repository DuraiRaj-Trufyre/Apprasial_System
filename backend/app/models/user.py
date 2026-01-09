from pydantic import BaseModel, EmailStr 
from typing import Optional

class UserPublic(BaseModel):
    id: Optional[str]
    name: str
    email: EmailStr
    role: str
    manager_id: Optional[str]
from typing import Optional

class User(BaseModel):
    id: Optional[str]
    name: str
    email: EmailStr
    role: str
    manager_id: Optional[str]
    password: Optional[str]  # hashed password

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    role: str
    manager_id: Optional[str] = None
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str
