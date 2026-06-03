"""
main.py
-------
FastAPI entry point for the Quant Copilot API.

Endpoints:
    POST /query        → run a natural language financial query
    GET  /health       → health check
"""

import logging
import os

import json
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

from db.mongo import connect_db, close_db
from agent import run_query
from redis_cache import connect_redis, close_redis, get_cached, set_cached

load_dotenv()
logger = logging.getLogger(__name__)

MONGO_URI  = os.getenv("MONGO_URI",   "mongodb://localhost:27017")
REDIS_URL  = os.getenv("REDIS_URL",   "redis://localhost:6379")


# ---------------------------------------------------------------------------
# Lifespan — startup / shutdown
# ---------------------------------------------------------------------------
# FastAPI runs this ONCE on start and ONCE on stop.
# We connect MongoDB here so every request can use it.

@asynccontextmanager
async def lifespan(app: FastAPI):
    # --- Startup ---
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)s | %(message)s"
    )
    logger.info("Starting Quant Copilot API...")
    await connect_db(uri=MONGO_URI, db_name="quant_copilot")
    await connect_redis(url=REDIS_URL)

    yield  # app is running here

    # --- Shutdown ---
    logger.info("Shutting down...")
    await close_db()
    await close_redis()


# ---------------------------------------------------------------------------
# App instance
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Quant Copilot",
    description="AI-powered quantitative research API",
    version="1.0.0",
    lifespan=lifespan,
)


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------
# Pydantic models define what JSON shape Postman must send / will receive.
# FastAPI auto-validates — wrong shape = 422 error with a clear message.

class QueryRequest(BaseModel):
    query: str                  # the natural language question
    

class QueryResponse(BaseModel):
    status: str                 # "ok" or "error"
    answer: str                 # the research report
    provider: str               # "groq" or "ollama"
    query: str                  # echoed back
    timestamp: str              # UTC date


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/health")
async def health():
    """
    Quick check that the server is alive.
    Hit this first in Postman to confirm the API is running.
    """
    return {"status": "ok", "message": "Quant Copilot is running."}


@app.post("/query", response_model=QueryResponse)
async def query_endpoint(request: QueryRequest):
    """
    Main endpoint. Accepts a natural language financial query,
    runs the agent tool loop, returns a structured research report.

    Postman:
        POST http://localhost:8000/query
        Body (raw JSON):
        {
            "query": "What is the Sharpe ratio of AAPL over the last year?"
        }
    """
    if not request.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty.")

    logger.info("[API] /query → %s", request.query)

    # --- Cache check ---
    cached = await get_cached(request.query)
    if cached:
        return QueryResponse(**cached)

    result = await run_query(request.query)

    if result["status"] == "error":
        raise HTTPException(status_code=500, detail=result["answer"])

    await set_cached(request.query, result)
    return QueryResponse(**result)


@app.websocket("/ws/query")
async def websocket_query(websocket: WebSocket):
    """
    WebSocket endpoint — streams live progress as the agent works.

    Connect to: ws://localhost:8000/ws/query

    Send:    { "query": "What is the Sharpe ratio of AAPL?" }

    Receive (in order):
        { "type": "start",     "message": "Processing query..." }
        { "type": "tool_call", "tool": "get_price_data" }
        { "type": "tool_done", "tool": "get_price_data" }
        { "type": "answer",    "data": { full QueryResponse } }
        { "type": "error",     "message": "..." }
    """
    await websocket.accept()
    logger.info("[WS] Client connected")

    try:
        # --- Receive query from client ---
        raw = await websocket.receive_text()
        data = json.loads(raw)
        query = data.get("query", "").strip()

        if not query:
            await websocket.send_json({"type": "error", "message": "Query cannot be empty."})
            return

        await websocket.send_json({"type": "start", "message": "Processing query..."})

        # --- Cache check ---
        cached = await get_cached(query)
        if cached:
            await websocket.send_json({"type": "cache_hit", "message": "Returning cached result."})
            await websocket.send_json({"type": "answer", "data": cached})
            return

        # --- Callback — fires on every tool call/done event ---
        async def progress(event: dict):
            await websocket.send_json(event)

        # --- Run agent with live callbacks ---
        result = await run_query(query, callback=progress)

        if result["status"] == "error":
            await websocket.send_json({"type": "error", "message": result["answer"]})
            return

        await set_cached(query, result)
        await websocket.send_json({"type": "answer", "data": result})

    except WebSocketDisconnect:
        logger.info("[WS] Client disconnected")
    except Exception as e:
        logger.error("[WS] Error: %s", e)
        await websocket.send_json({"type": "error", "message": str(e)})