import os
from datetime import datetime, timezone
from typing import Optional

from bson import ObjectId
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from pymongo import MongoClient, DESCENDING

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI")
DB_NAME = os.getenv("DB_NAME", "textdash")
API_KEY = os.getenv("API_KEY", "")  # if set, required for POSTs (header: X-API-Key)
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*").split(",")
# Reject posts where the learner's name (sender) does not appear in the text
REQUIRE_NAME_IN_TEXT = os.getenv("REQUIRE_NAME_IN_TEXT", "true").lower() == "true"

if not MONGODB_URI:
    raise RuntimeError("Set MONGODB_URI in backend/.env (see .env.example)")

client = MongoClient(MONGODB_URI)
entries = client[DB_NAME]["entries"]
entries.create_index([("created_at", DESCENDING)])

app = FastAPI(title="Text Dashboard API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)


class EntryIn(BaseModel):
    text: str = Field(..., min_length=1, max_length=10000)
    sender: str = Field(..., min_length=2, max_length=100, description="Learner name")


def check_key(x_api_key: Optional[str] = Header(None)):
    if API_KEY and x_api_key != API_KEY:
        raise HTTPException(401, "Invalid or missing X-API-Key header")


def serialize(doc):
    return {
        "id": str(doc["_id"]),
        "text": doc["text"],
        "sender": doc.get("sender") or "anonymous",
        "created_at": doc["created_at"].isoformat(),
    }


def insert(text: str, sender: str):
    sender = sender.strip()
    if REQUIRE_NAME_IN_TEXT:
        low = text.lower()
        tokens = [t for t in sender.lower().split() if len(t) >= 2]
        if not tokens or not all(t in low for t in tokens):
            raise HTTPException(
                422, f"Learner name '{sender}' not found in the text; not stored."
            )
    doc = {
        "text": text,
        "sender": sender,
        "created_at": datetime.now(timezone.utc),
    }
    doc["_id"] = entries.insert_one(doc).inserted_id
    return serialize(doc)


@app.get("/")
def root():
    return {"status": "ok", "docs": "/docs"}


@app.post("/api/entries", status_code=201, dependencies=[Depends(check_key)])
def create_entry(body: EntryIn):
    """JSON: {"text": "hello", "sender": "alice"}"""
    return insert(body.text.strip(), body.sender)


@app.post("/api/text", status_code=201, dependencies=[Depends(check_key)])
async def create_raw(request: Request, sender: str):
    """Raw text body (Content-Type: text/plain). Optional ?sender=name"""
    text = (await request.body()).decode("utf-8", errors="replace").strip()
    if not text:
        raise HTTPException(400, "Empty body")
    return insert(text[:10000], sender)


@app.get("/api/entries")
def list_entries(limit: int = 100, skip: int = 0, q: Optional[str] = None):
    limit = max(1, min(limit, 500))
    query = {"text": {"$regex": q, "$options": "i"}} if q else {}
    docs = entries.find(query).sort("created_at", DESCENDING).skip(skip).limit(limit)
    return {"total": entries.count_documents(query), "items": [serialize(d) for d in docs]}


@app.get("/api/stats")
def stats():
    total = entries.count_documents({})
    senders = list(
        entries.aggregate(
            [
                {"$group": {"_id": {"$ifNull": ["$sender", "anonymous"]}, "count": {"$sum": 1}}},
                {"$sort": {"count": -1}},
                {"$limit": 10},
            ]
        )
    )
    per_day = list(
        entries.aggregate(
            [
                {"$group": {
                    "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}},
                    "count": {"$sum": 1}}},
                {"$sort": {"_id": -1}},
                {"$limit": 14},
            ]
        )
    )
    return {
        "total": total,
        "top_senders": [{"sender": s["_id"], "count": s["count"]} for s in senders],
        "per_day": [{"date": d["_id"], "count": d["count"]} for d in reversed(per_day)],
    }


@app.delete("/api/entries/{entry_id}", dependencies=[Depends(check_key)])
def delete_entry(entry_id: str):
    try:
        oid = ObjectId(entry_id)
    except Exception:
        raise HTTPException(400, "Bad id")
    if entries.delete_one({"_id": oid}).deleted_count == 0:
        raise HTTPException(404, "Not found")
    return {"deleted": entry_id}
