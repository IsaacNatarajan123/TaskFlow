from fastapi import FastAPI, Depends, Request
from database import check_connection
from pydantic import BaseModel
from auth import hash_password, verify_password, create_token, get_current_user, generate_reset_token
from database import get_collection
from datetime import datetime, timezone, timedelta
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging
import time
from prometheus_fastapi_instrumentator import Instrumentator
from routers import clients, task_categories, tasks, time_entries, submissions, reports
from bson import ObjectId
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import os

app = FastAPI(title="FastAPI")

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL],
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error on {request.url.path}: {exc}")
    return JSONResponse(
        status_code=500,
        content={"error": "Something went wrong. Please try again."}
    )

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

Instrumentator().instrument(app).expose(app)
app.include_router(clients.router)
app.include_router(task_categories.router)
app.include_router(tasks.router)
app.include_router(time_entries.router)
app.include_router(submissions.router)
app.include_router(reports.router)

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
logger = logging.getLogger("kanban-api")

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    duration = round((time.time() - start) * 1000, 2)
    logger.info(f"{request.method} {request.url.path} - {response.status_code} - {duration}ms")
    return response

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "FastAPI running"}

@app.get("/health")
async def health():
    db_ok = await check_connection()
    return {"database": "connected" if db_ok else "disconnected"}

users_collection = get_collection("users")
password_resets_collection = get_collection("password_resets")

class UserCreate(BaseModel):
    name: str
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

@app.post("/auth/signup")
@limiter.limit("5/minute")
async def signup(request: Request, user: UserCreate):
    existing = await users_collection.find_one({"email": user.email})
    if existing:
        return {"error": "Email already exists"}
    new_user = {
        "name": user.name,
        "email": user.email,
        "password_hash": hash_password(user.password)
    }
    result = await users_collection.insert_one(new_user)
    return {"message": "User created", "id": str(result.inserted_id)}

@app.post("/auth/login")
@limiter.limit("5/minute")
async def login(request: Request, user: UserLogin):
    db_user = await users_collection.find_one({"email": user.email})
    if not db_user or not verify_password(user.password, db_user["password_hash"]):
        return {"error": "Invalid credentials"}
    token = create_token(str(db_user["_id"]))
    return {"access_token": token}

class ForgotPassword(BaseModel):
    email: str

class ResetPassword(BaseModel):
    token: str
    new_password: str

@app.post("/auth/forgot-password")
async def forgot_password(req: ForgotPassword):
    user = await users_collection.find_one({"email": req.email})
    if not user:
        return {"error": "Email not found"}

    token = generate_reset_token()
    expiry = datetime.now(timezone.utc) + timedelta(minutes=15)

    await password_resets_collection.insert_one({
        "user_id": str(user["_id"]),
        "token": token,
        "expires_at": expiry
    })
    return {"reset_token": token}

@app.post("/auth/reset-password")
async def reset_password(req: ResetPassword):
    reset_doc = await password_resets_collection.find_one({"token": req.token})
    if not reset_doc:
        return {"error": "Invalid token"}

    if reset_doc["expires_at"].replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        return {"error": "Token expired"}

    user = await users_collection.find_one({"_id": ObjectId(reset_doc["user_id"])})
    if not user:
        return {"error": "User not found"}

    if verify_password(req.new_password, user["password_hash"]):
        return {"error": "New password must be different from old password"}

    await users_collection.update_one(
        {"_id": ObjectId(reset_doc["user_id"])},
        {"$set": {"password_hash": hash_password(req.new_password)}}
    )
    await password_resets_collection.delete_one({"token": req.token})
    return {"message": "Password reset successful"}

class UpdateName(BaseModel):
    name: str

class ChangePassword(BaseModel):
    old_password: str
    new_password: str

@app.patch("/auth/update-name")
async def update_name(req: UpdateName, current_user: str = Depends(get_current_user)):
    await users_collection.update_one({"_id": ObjectId(current_user)}, {"$set": {"name": req.name}})
    return {"message": "Name updated"}

@app.patch("/auth/change-password")
async def change_password(req: ChangePassword, current_user: str = Depends(get_current_user)):
    user = await users_collection.find_one({"_id": ObjectId(current_user)})
    if not verify_password(req.old_password, user["password_hash"]):
        return {"error": "Current password is incorrect"}
    await users_collection.update_one({"_id": ObjectId(current_user)}, {"$set": {"password_hash": hash_password(req.new_password)}})
    return {"message": "Password changed"}

@app.delete("/auth/delete-account")
async def delete_account(current_user: str = Depends(get_current_user)):
    await users_collection.delete_one({"_id": ObjectId(current_user)})
    return {"message": "Account deleted"}

@app.get("/auth/me")
async def get_me(current_user: str = Depends(get_current_user)):
    user = await users_collection.find_one({"_id": ObjectId(current_user)})
    manager_name = None
    manager_id = user.get("manager_id")
    if manager_id and ObjectId.is_valid(manager_id):
        manager = await users_collection.find_one({"_id": ObjectId(manager_id)})
        manager_name = manager["name"] if manager else None
    return {"name": user["name"], "email": user["email"], "manager_name": manager_name}

@app.get("/users")
async def list_users():
    cursor = users_collection.find()
    result = []
    async for u in cursor:
        result.append({"user_id": str(u["_id"]), "name": u["name"], "manager_id": u.get("manager_id")})
    return result

#Given it temporarily

class SetManager(BaseModel):
    manager_id: str

@app.patch("/users/{user_id}/set-manager")
async def set_manager(user_id: str, req: SetManager):
    await users_collection.update_one({"_id": ObjectId(user_id)}, {"$set": {"manager_id": req.manager_id}})
    return {"message": "Manager set"}