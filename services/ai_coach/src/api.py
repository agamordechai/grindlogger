"""FastAPI application for the AI Workout Coach service."""

import json
import logging
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from datetime import UTC, datetime

import jwt
import redis.asyncio as redis
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware

from services.ai_coach.src.agent import analyze_progress, chat_with_coach, get_workout_recommendation, suggest_overload
from services.ai_coach.src.config import get_settings
from services.ai_coach.src.models import (
    ChatMessage,
    ChatRequest,
    ChatResponse,
    Conversation,
    ConversationSummary,
    HealthResponse,
    OverloadRequest,
    OverloadSuggestions,
    ProgressAnalysis,
    RecommendationRequest,
    WorkoutRecommendation,
)
from services.ai_coach.src.workout_client import close_workout_client, get_workout_client

# Get settings
settings = get_settings()

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.log_level), format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Redis client
redis_client: redis.Redis | None = None


def _get_auth_header(request: Request) -> str | None:
    """Extract the Authorization header from the incoming request."""
    return request.headers.get("Authorization")


def _resolve_ai_credentials(request: Request) -> tuple[str, str | None, str | None]:
    """Resolve AI provider credentials for this request.

    Priority for API key:
      1. X-AI-Key header (user-provided)
      2. Server AI_API_KEY env var if caller is admin
      3. Raise 403

    Returns:
        Tuple of (api_key, base_url_or_None, model_or_None)
    """
    # API key
    user_key = request.headers.get("X-AI-Key")
    if not user_key:
        # Legacy header support
        user_key = request.headers.get("X-Anthropic-Key")

    if not user_key:
        # Admin fallback to server key
        server_key = settings.ai_api_key
        if server_key:
            auth = request.headers.get("Authorization", "")
            token = auth.removeprefix("Bearer ").strip() if auth.startswith("Bearer ") else ""
            if token:
                try:
                    payload = jwt.decode(token, settings.jwt_secret_key, algorithms=["HS256"])
                    if payload.get("role") == "admin":
                        user_key = server_key
                except jwt.PyJWTError:
                    logger.debug("JWT decode failed during admin check")

    if not user_key:
        raise HTTPException(
            status_code=403,
            detail="AI API key required. Please set your API key in Settings.",
        )

    # Optional overrides from headers
    base_url = request.headers.get("X-AI-Base-URL") or None
    model = request.headers.get("X-AI-Model") or None

    return user_key, base_url, model


def _get_user_id(request: Request) -> str:
    """Extract user ID from JWT token. Raises 401 if missing/invalid."""
    auth = request.headers.get("Authorization", "")
    token = auth.removeprefix("Bearer ").strip() if auth.startswith("Bearer ") else ""
    if not token:
        raise HTTPException(status_code=401, detail="Authentication required")
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=["HS256"])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        return str(user_id)
    except jwt.PyJWTError as err:
        raise HTTPException(status_code=401, detail="Invalid token") from err


def _chat_key(user_id: str, conversation_id: str) -> str:
    """Redis key for a single conversation."""
    return f"chat:{user_id}:{conversation_id}"


def _chat_index_key(user_id: str) -> str:
    """Redis key for the user's conversation index (sorted set)."""
    return f"chat_index:{user_id}"


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan handler."""
    global redis_client

    # Startup
    logger.info("Starting AI Workout Coach service")
    logger.info(f"Default AI Model: {settings.ai_model}")
    logger.info(f"Default AI Base URL: {settings.ai_base_url}")
    logger.info(f"Workout API URL: {settings.workout_api_url}")

    # Initialize Redis connection
    try:
        redis_client = redis.from_url(settings.redis_url, decode_responses=True)
        await redis_client.ping()
        logger.info("Redis connection established")
    except Exception as e:
        logger.warning(f"Redis connection failed: {e}. Caching disabled.")
        redis_client = None

    yield

    # Shutdown
    logger.info("Shutting down AI Workout Coach service")
    await close_workout_client()
    if redis_client:
        await redis_client.aclose()


# Initialize FastAPI app
app = FastAPI(
    title="AI Workout Coach",
    description="AI-powered workout coaching service using OpenAI-compatible API",
    version="0.2.0",
    docs_url="/docs",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """Health check endpoint."""
    workout_client = get_workout_client()
    workout_api_healthy = await workout_client.health_check()

    redis_healthy = False
    if redis_client:
        try:
            await redis_client.ping()
            redis_healthy = True
        except Exception:
            pass

    return HealthResponse(
        status="healthy",
        service="ai-coach",
        ai_model=settings.ai_model,
        workout_api_connected=workout_api_healthy,
        redis_connected=redis_healthy,
    )


@app.post("/chat", response_model=ChatResponse)
async def chat(request: Request, chat_request: ChatRequest) -> ChatResponse:
    """Chat with the AI workout coach."""
    api_key, base_url, model = _resolve_ai_credentials(request)
    auth_header = _get_auth_header(request)
    workout_client = get_workout_client()
    workout_context = None

    if chat_request.include_workout_context:
        try:
            workout_context = await workout_client.get_workout_context(auth_header=auth_header)
        except Exception as e:
            logger.warning(f"Failed to fetch workout context: {e}")

    try:
        response_text, actions_performed = await chat_with_coach(
            chat_request.message,
            workout_context,
            api_key=api_key,
            base_url=base_url,
            model=model,
            workout_client=workout_client,
            auth_header=auth_header,
            history=chat_request.history or None,
        )
        return ChatResponse(
            response=response_text,
            context_used=workout_context is not None and len(workout_context.exercises) > 0,
            actions_performed=actions_performed,
        )
    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail="Failed to get response from AI coach. Please try again.") from e


@app.post("/recommend", response_model=WorkoutRecommendation)
async def recommend_workout(request: Request, rec_request: RecommendationRequest) -> WorkoutRecommendation:
    """Get AI-generated workout recommendations."""
    api_key, base_url, model = _resolve_ai_credentials(request)
    auth_header = _get_auth_header(request)

    # Fetch current workout context
    try:
        workout_client = get_workout_client()
        workout_context = await workout_client.get_workout_context(auth_header=auth_header)
    except Exception as e:
        logger.warning(f"Failed to fetch workout context: {e}")
        workout_context = None

    try:
        recommendation = await get_workout_recommendation(
            workout_context=workout_context,
            focus_area=rec_request.focus_area,
            custom_focus_area=rec_request.custom_focus_area,
            equipment=rec_request.equipment_available,
            session_duration=rec_request.session_duration_minutes,
            training_goal=rec_request.training_goal,
            training_days_per_week=rec_request.training_days_per_week,
            experience_level=rec_request.experience_level,
            api_key=api_key,
            base_url=base_url,
            model=model,
        )
        return recommendation
    except Exception as e:
        logger.error(f"Recommendation error: {e}")
        raise HTTPException(
            status_code=500, detail="Failed to generate workout recommendation. Please try again."
        ) from e


@app.get("/analyze", response_model=ProgressAnalysis)
async def analyze_workout(request: Request) -> ProgressAnalysis:
    """Analyze your current workout routine."""
    api_key, base_url, model = _resolve_ai_credentials(request)
    auth_header = _get_auth_header(request)

    try:
        workout_client = get_workout_client()
        workout_context = await workout_client.get_workout_context(auth_header=auth_header)
    except Exception as e:
        logger.error(f"Failed to fetch workout context: {e}")
        raise HTTPException(status_code=503, detail="Unable to connect to workout API. Please try again.") from e

    if not workout_context.exercises:
        raise HTTPException(status_code=400, detail="No exercises found. Add some exercises to get analysis.")

    try:
        analysis = await analyze_progress(
            workout_context,
            api_key=api_key,
            base_url=base_url,
            model=model,
        )
        return analysis
    except Exception as e:
        logger.error(f"Analysis error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to analyze workout: {str(e)}") from e


@app.post("/overload", response_model=OverloadSuggestions)
async def overload_suggestions(request: Request, body: OverloadRequest | None = None) -> OverloadSuggestions:
    """Get progressive overload suggestions based on workout history."""
    api_key, base_url, model = _resolve_ai_credentials(request)
    auth_header = _get_auth_header(request)

    exercise_names = body.exercise_names if body else None

    try:
        workout_client = get_workout_client()
        ctx, weight_progress, volume_progress = await workout_client.get_overload_data(
            auth_header=auth_header,
            exercise_names=exercise_names,
        )
    except Exception as e:
        logger.error(f"Failed to fetch overload data: {e}")
        raise HTTPException(status_code=503, detail="Unable to connect to workout API. Please try again.") from e

    if not ctx.exercises:
        raise HTTPException(status_code=400, detail="No exercises found. Add exercises to get overload suggestions.")

    try:
        result = await suggest_overload(
            ctx,
            weight_progress,
            volume_progress,
            api_key=api_key,
            base_url=base_url,
            model=model,
        )
        return result
    except Exception as e:
        logger.error(f"Overload suggestion error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to generate overload suggestions: {str(e)}") from e


@app.get("/exercises")
async def get_current_exercises(request: Request):
    """Proxy endpoint to fetch current exercises from the workout API."""
    auth_header = _get_auth_header(request)

    try:
        workout_client = get_workout_client()
        exercises = await workout_client.get_exercises(auth_header=auth_header)
        return exercises
    except Exception as e:
        logger.error(f"Failed to fetch exercises: {e}")
        raise HTTPException(status_code=503, detail="Unable to connect to workout API.") from e


# ============ Chat History Endpoints ============


def _require_redis() -> redis.Redis:
    """Return the Redis client or raise 503."""
    if redis_client is None:
        raise HTTPException(status_code=503, detail="Chat history unavailable (Redis not connected)")
    return redis_client


@app.get("/conversations", response_model=list[ConversationSummary])
async def list_conversations(request: Request) -> list[ConversationSummary]:
    """List all conversations for the authenticated user, newest first."""
    r = _require_redis()
    user_id = _get_user_id(request)

    # Get conversation IDs from sorted set (scored by timestamp), newest first
    conv_ids = await r.zrevrange(_chat_index_key(user_id), 0, -1)
    summaries: list[ConversationSummary] = []

    for conv_id in conv_ids:
        raw = await r.get(_chat_key(user_id, conv_id))
        if not raw:
            # Stale index entry — clean up
            await r.zrem(_chat_index_key(user_id), conv_id)
            continue
        data = json.loads(raw)
        summaries.append(
            ConversationSummary(
                id=data["id"],
                title=data.get("title", "New Chat"),
                message_count=len(data.get("messages", [])),
                updated_at=data.get("updated_at", data.get("created_at", "")),
            )
        )

    return summaries


@app.get("/conversations/{conversation_id}", response_model=Conversation)
async def get_conversation(conversation_id: str, request: Request) -> Conversation:
    """Fetch a single conversation by ID."""
    r = _require_redis()
    user_id = _get_user_id(request)

    raw = await r.get(_chat_key(user_id, conversation_id))
    if not raw:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return Conversation(**json.loads(raw))


@app.put("/conversations/{conversation_id}")
async def save_conversation(conversation_id: str, request: Request) -> Conversation:
    """Create or update a conversation. The frontend sends the full message list."""
    r = _require_redis()
    user_id = _get_user_id(request)
    body = await request.json()
    messages = body.get("messages", [])

    now = datetime.now(UTC).isoformat()

    # Check if conversation already exists
    existing_raw = await r.get(_chat_key(user_id, conversation_id))
    if existing_raw:
        existing = json.loads(existing_raw)
        created_at = existing.get("created_at", now)
    else:
        created_at = now
        # Enforce max conversations limit — evict oldest if needed
        count = await r.zcard(_chat_index_key(user_id))
        if count >= settings.chat_max_conversations:
            oldest = await r.zrange(_chat_index_key(user_id), 0, 0)
            if oldest:
                await r.delete(_chat_key(user_id, oldest[0]))
                await r.zrem(_chat_index_key(user_id), oldest[0])

    # Auto-title from first user message
    title = "New Chat"
    for msg in messages:
        if msg.get("role") == "user":
            title = msg["content"][:60]
            if len(msg["content"]) > 60:
                title += "..."
            break

    # Trim messages to max limit
    trimmed_messages = messages[-settings.chat_max_messages :]

    conversation = Conversation(
        id=conversation_id,
        title=title,
        messages=[ChatMessage(**m) for m in trimmed_messages],
        created_at=created_at,
        updated_at=now,
    )

    # Store conversation with TTL
    await r.set(
        _chat_key(user_id, conversation_id),
        conversation.model_dump_json(),
        ex=settings.chat_history_ttl,
    )
    # Update index sorted set (score = timestamp for ordering)
    await r.zadd(
        _chat_index_key(user_id),
        {conversation_id: datetime.now(UTC).timestamp()},
    )
    await r.expire(_chat_index_key(user_id), settings.chat_history_ttl)

    return conversation


@app.delete("/conversations/{conversation_id}")
async def delete_conversation(conversation_id: str, request: Request) -> dict:
    """Delete a conversation."""
    r = _require_redis()
    user_id = _get_user_id(request)

    await r.delete(_chat_key(user_id, conversation_id))
    await r.zrem(_chat_index_key(user_id), conversation_id)
    return {"deleted": True}
