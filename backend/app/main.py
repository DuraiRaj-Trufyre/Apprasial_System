
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import auth, appraisal, notification, evaluation_parameter
from fastapi.security import HTTPBearer

app = FastAPI()

# Enable CORS for all origins (development)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth")
app.include_router(appraisal.router, prefix="/appraisal")
app.include_router(notification.router, prefix="/notification")
app.include_router(evaluation_parameter.router)

# Add HTTP Bearer to Swagger UI
app.openapi_schema = None
# app.openapi = lambda: app.openapi_schema or app.openapi()
app.dependency_overrides[HTTPBearer] = lambda: None

@app.get("/")
async def root():
    return {"message": "HRMS Appraisal System Backend Running"}

# cd backendsource .venv/bin/activate
# uvicorn app.main:app --reload --port 8000