from fastapi import FastAPI, APIRouter
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List
import uuid
from datetime import datetime, timezone


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")  # Ignore MongoDB's _id field
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

class Level(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    width: int = 960
    height: int = 540
    spawn: dict = {"x": 50, "y": 480}
    goal: dict = {"x": 860, "y": 460, "w": 40, "h": 60}
    platforms: List[dict] = []
    spikes: List[dict] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    author: str = "player"

class LevelCreate(BaseModel):
    name: str
    width: int = 960
    height: int = 540
    spawn: dict = {"x": 50, "y": 480}
    goal: dict = {"x": 860, "y": 460, "w": 40, "h": 60}
    platforms: List[dict] = []
    spikes: List[dict] = []
    author: str = "player"

class MatchResult(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    level_id: str
    mode: str  # "human_vs_ai" or "ai_vs_ai"
    winner: str  # "human", "ai", "ai1", "ai2"
    time_ms: float
    deaths: int
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MatchResultCreate(BaseModel):
    level_id: str
    mode: str
    winner: str
    time_ms: float
    deaths: int

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Hello World"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)
    
    # Convert to dict and serialize datetime to ISO string for MongoDB
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    
    _ = await db.status_checks.insert_one(doc)
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    # Exclude MongoDB's _id field from the query results
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    
    # Convert ISO string timestamps back to datetime objects
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    
    return status_checks

# Level endpoints
@api_router.post("/levels", response_model=Level)
async def create_level(input: LevelCreate):
    level_dict = input.model_dump()
    level_obj = Level(**level_dict)
    
    doc = level_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    _ = await db.levels.insert_one(doc)
    return level_obj

@api_router.get("/levels", response_model=List[Level])
async def get_levels():
    levels = await db.levels.find({}, {"_id": 0}).to_list(1000)
    
    for level in levels:
        if isinstance(level.get('created_at'), str):
            level['created_at'] = datetime.fromisoformat(level['created_at'])
    
    return levels

@api_router.get("/levels/{level_id}", response_model=Level)
async def get_level(level_id: str):
    level = await db.levels.find_one({"id": level_id}, {"_id": 0})
    
    if not level:
        return {"error": "Level not found"}, 404
    
    if isinstance(level.get('created_at'), str):
        level['created_at'] = datetime.fromisoformat(level['created_at'])
    
    return level

@api_router.delete("/levels/{level_id}")
async def delete_level(level_id: str):
    result = await db.levels.delete_one({"id": level_id})
    
    if result.deleted_count == 0:
        return {"error": "Level not found"}, 404
    
    return {"message": "Level deleted successfully"}

# Match result endpoints
@api_router.post("/matches", response_model=MatchResult)
async def create_match_result(input: MatchResultCreate):
    match_dict = input.model_dump()
    match_obj = MatchResult(**match_dict)
    
    doc = match_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    
    _ = await db.matches.insert_one(doc)
    return match_obj

@api_router.get("/matches", response_model=List[MatchResult])
async def get_matches():
    matches = await db.matches.find({}, {"_id": 0}).to_list(1000)
    
    for match in matches:
        if isinstance(match.get('timestamp'), str):
            match['timestamp'] = datetime.fromisoformat(match['timestamp'])
    
    return matches

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()