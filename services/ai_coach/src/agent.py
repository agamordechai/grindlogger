"""AI Coach agent supporting Anthropic and OpenAI-compatible providers."""

import json
import logging
from typing import Any

import anthropic
from openai import AsyncOpenAI

from services.ai_coach.src.config import get_settings
from services.ai_coach.src.models import (
    MuscleGroup,
    ProgressAnalysis,
    WorkoutContext,
    WorkoutRecommendation,
)

logger = logging.getLogger(__name__)

# System prompt for the workout coach
COACH_SYSTEM_PROMPT = """You are an expert fitness coach and personal trainer AI assistant.
Your role is to help users with their workout routines, provide exercise recommendations,
answer fitness-related questions, and analyze their training progress.

Key responsibilities:
1. Provide personalized workout recommendations based on the user's current exercises
2. Suggest complementary exercises for balanced muscle development
3. Offer form tips and safety advice
4. Help users understand proper training volume and progression
5. Motivate and encourage users in their fitness journey

Guidelines:
- Be encouraging but honest
- Prioritize safety and proper form
- Consider the user's current workout data when making recommendations
- Provide specific, actionable advice
- Use clear, simple language avoiding excessive jargon
- When suggesting weights, be conservative and emphasize starting light

If workout context is provided, analyze it and tailor your responses accordingly.
"""

settings = get_settings()


def _is_anthropic(api_key: str, base_url: str | None) -> bool:
    """Check if we should use the Anthropic SDK based on key or URL."""
    if api_key.startswith("sk-ant-"):
        return True
    if base_url and "anthropic" in base_url:
        return True
    if not base_url and "anthropic" in settings.ai_base_url:
        return True
    return False


def _format_workout_context(workout_context: WorkoutContext | None) -> str:
    """Format workout context into a string for the system prompt."""
    if not workout_context or not workout_context.exercises:
        return ""

    ctx = "\n\nCurrent Workout Data:\n"
    ctx += f"- Total Exercises: {workout_context.exercise_count}\n"
    ctx += f"- Total Volume: {workout_context.total_volume:.1f} kg\n"
    muscle_groups = ", ".join(workout_context.muscle_groups_worked) or "Not identified"
    ctx += f"- Muscle Groups Worked: {muscle_groups}\n"

    workout_days = {ex.workout_day for ex in workout_context.exercises}
    daily_exercises = [ex for ex in workout_context.exercises if ex.workout_day == "None"]
    split_days = [day for day in workout_days if day != "None"]

    if daily_exercises:
        ctx += f"- Daily Exercises (done every day): {len(daily_exercises)} exercise(s)\n"

    if len(split_days) == 0 and daily_exercises:
        ctx += "- Workout Split: ALL DAILY (no specific day split)\n"
    elif len(split_days) == 1:
        ctx += f"- Workout Split: FULL BODY (all exercises on Day {split_days[0]})\n"
    elif len(split_days) == 2:
        ctx += f"- Workout Split: A/B SPLIT (Days: {', '.join(sorted(split_days))})\n"
    elif len(split_days) == 3:
        ctx += f"- Workout Split: A/B/C SPLIT (Days: {', '.join(sorted(split_days))})\n"
    elif len(split_days) > 0:
        ctx += f"- Workout Split: {len(split_days)}-DAY SPLIT (Days: {', '.join(sorted(split_days))})\n"

    ctx += "\nExercises grouped by workout day:\n"

    if daily_exercises:
        ctx += "\n  Daily (Every Day):\n"
        for ex in daily_exercises:
            weight_str = f" @ {ex.weight}kg" if ex.weight else " (bodyweight)"
            ctx += f"    - {ex.name}: {ex.sets} sets x {ex.reps} reps{weight_str}\n"

    for day in sorted(split_days):
        day_exercises = [ex for ex in workout_context.exercises if ex.workout_day == day]
        ctx += f"\n  Day {day}:\n"
        for ex in day_exercises:
            weight_str = f" @ {ex.weight}kg" if ex.weight else " (bodyweight)"
            ctx += f"    - {ex.name}: {ex.sets} sets x {ex.reps} reps{weight_str}\n"

    return ctx


async def _anthropic_completion(
    api_key: str,
    model: str,
    system_prompt: str,
    user_prompt: str,
    response_format: type | None = None,
) -> str:
    """Make a completion request using the Anthropic SDK."""
    client = anthropic.AsyncAnthropic(api_key=api_key)

    if response_format is not None:
        json_schema = response_format.model_json_schema()
        user_prompt += (
            f"\n\nYou MUST respond with valid JSON matching this schema:\n{json.dumps(json_schema, indent=2)}"
            "\n\nRespond ONLY with the JSON object, no other text."
        )

    message = await client.messages.create(
        model=model,
        max_tokens=1024,
        temperature=settings.ai_temperature,
        system=system_prompt,
        messages=[{"role": "user", "content": user_prompt}],
    )

    return message.content[0].text


async def _openai_completion(
    api_key: str,
    base_url: str,
    model: str,
    system_prompt: str,
    user_prompt: str,
    response_format: type | None = None,
) -> str:
    """Make a completion request using the OpenAI-compatible SDK."""
    client = AsyncOpenAI(api_key=api_key, base_url=base_url)

    messages: list[dict[str, Any]] = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]

    kwargs: dict[str, Any] = {
        "model": model,
        "messages": messages,
        "temperature": settings.ai_temperature,
    }

    if response_format is not None:
        json_schema = response_format.model_json_schema()
        kwargs["messages"][0]["content"] += (
            f"\n\nYou MUST respond with valid JSON matching this schema:\n{json.dumps(json_schema, indent=2)}"
        )
        kwargs["response_format"] = {"type": "json_object"}

    response = await client.chat.completions.create(**kwargs)
    return response.choices[0].message.content or ""


async def _chat_completion(
    api_key: str,
    base_url: str | None,
    model: str,
    system_prompt: str,
    user_prompt: str,
    response_format: type | None = None,
) -> str:
    """Route to the appropriate SDK based on provider."""
    if _is_anthropic(api_key, base_url):
        return await _anthropic_completion(
            api_key=api_key,
            model=model,
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            response_format=response_format,
        )
    return await _openai_completion(
        api_key=api_key,
        base_url=base_url or settings.ai_base_url,
        model=model,
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        response_format=response_format,
    )


async def chat_with_coach(
    message: str,
    workout_context: WorkoutContext | None = None,
    api_key: str | None = None,
    base_url: str | None = None,
    model: str | None = None,
) -> str:
    """Chat with the AI coach."""
    if not api_key:
        raise ValueError("API key is required")

    system_prompt = COACH_SYSTEM_PROMPT + _format_workout_context(workout_context)

    try:
        return await _chat_completion(
            api_key=api_key,
            base_url=base_url,
            model=model or settings.ai_model,
            system_prompt=system_prompt,
            user_prompt=message,
        )
    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise


async def get_workout_recommendation(
    workout_context: WorkoutContext | None = None,
    focus_area: MuscleGroup | None = None,
    custom_focus_area: str | None = None,
    equipment: list[str] | None = None,
    session_duration: int = 60,
    api_key: str | None = None,
    base_url: str | None = None,
    model: str | None = None,
) -> WorkoutRecommendation:
    """Get a workout recommendation from the AI coach."""
    if not api_key:
        raise ValueError("API key is required")

    focus_label = custom_focus_area or (focus_area.value.replace("_", "/").title() if focus_area else "Full Body")
    equip = equipment or ["barbell", "dumbbells", "cables", "bodyweight"]

    prompt = f"""Generate a complete workout routine recommendation.

Session Duration: {session_duration} minutes per session
Focus Area: {focus_label}
Available Equipment: {", ".join(equip)}

Please provide:
1. A catchy workout title
2. Brief description of the routine
3. 4-8 exercises, structured as a proper training split if full-body, or a single day if focused
4. Estimated session duration in minutes
5. Difficulty level (Beginner/Intermediate/Advanced)
6. 2-3 general tips
7. A split_type label (e.g. "Push/Pull/Legs", "Upper/Lower", "Full Body", "Single Day - Chest")

IMPORTANT - Workout Day Assignment:
- For a focused session (single muscle group): assign all exercises to workout_day "A"
- For full body or multi-muscle routines: create a proper multi-day split:
  * 2-day split: days "A" and "B"
  * 3-day split: days "A", "B", and "C"
  * Each exercise must have a workout_day field set to "A", "B", or "C"
- Distribute exercises logically across days (e.g. push muscles on Day A, pull on B, legs on C)
- Each exercise reps field must be a string like "8" or "8-12"

If workout context is available, complement existing exercises rather than duplicate them."""

    system_prompt = COACH_SYSTEM_PROMPT + _format_workout_context(workout_context)

    try:
        raw = await _chat_completion(
            api_key=api_key,
            base_url=base_url,
            model=model or settings.ai_model,
            system_prompt=system_prompt,
            user_prompt=prompt,
            response_format=WorkoutRecommendation,
        )
        return WorkoutRecommendation.model_validate_json(raw)
    except Exception as e:
        logger.error(f"Recommendation error: {e}")
        raise


async def analyze_progress(
    workout_context: WorkoutContext,
    api_key: str | None = None,
    base_url: str | None = None,
    model: str | None = None,
) -> ProgressAnalysis:
    """Analyze workout progress and provide insights."""
    if not api_key:
        raise ValueError("API key is required")

    prompt = """Analyze the workout routine provided in the context and give personalized feedback.

IMPORTANT: Base your analysis ONLY on the specific exercises, workout split, and training structure
you see in the workout data. Do NOT provide generic advice.

Provide:
1. A brief summary of the training approach (mention the specific split type and structure you observe)
2. Identified strengths in THIS specific routine (be specific to the exercises and split shown)
3. Areas that need improvement (be specific to what's missing or imbalanced in THIS routine)
4. Specific, actionable recommendations (based on the actual exercises and gaps you see)
5. A muscle balance score (0-100) based on how well-rounded THIS specific routine is

Be encouraging but honest. Focus on practical improvements specific to this person's actual workout."""

    system_prompt = COACH_SYSTEM_PROMPT + _format_workout_context(workout_context)

    try:
        raw = await _chat_completion(
            api_key=api_key,
            base_url=base_url,
            model=model or settings.ai_model,
            system_prompt=system_prompt,
            user_prompt=prompt,
            response_format=ProgressAnalysis,
        )
        return ProgressAnalysis.model_validate_json(raw)
    except Exception as e:
        logger.error(f"Analysis error: {e}", exc_info=True)
        raise
