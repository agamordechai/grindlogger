"""AI Coach agent supporting Anthropic and OpenAI-compatible providers."""

import json
import logging
from typing import Any

import anthropic
from openai import AsyncOpenAI

from services.ai_coach.src.config import get_settings
from services.ai_coach.src.models import (
    ActionPerformed,
    ChatMessage,
    ExerciseOverloadSuggestion,
    MuscleGroup,
    OverloadSuggestions,
    ProgressAnalysis,
    ReadinessStatus,
    WorkoutContext,
    WorkoutRecommendation,
)
from services.ai_coach.src.workout_client import WorkoutAPIClient

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
6. Perform actions on behalf of the user when asked — add exercises, log workouts, record measurements

Guidelines:
- Be encouraging but honest
- Prioritize safety and proper form
- Consider the user's current workout data when making recommendations
- Provide specific, actionable advice
- Use clear, simple language avoiding excessive jargon
- When suggesting weights, be conservative and emphasize starting light
- Today's date is {today}

Action guidelines:
- When the user asks you to add, create, modify, or log something, USE THE TOOLS immediately.
  Do not just describe what you would do — actually do it.
- You can call multiple tools in one turn (e.g. bulk-add several exercises at once).
- After performing actions, briefly confirm what you did.
- Do NOT ask excessive clarifying questions. If the user's intent is clear, act on it.
  Use reasonable defaults for anything unspecified (e.g. default workout_day "A", today's date for logging).
- Only ask for clarification when genuinely ambiguous (e.g. "add an exercise" with no details).
- Keep responses concise and focused. Avoid repeating back what the user said or listing things they already know.

If workout context is provided, analyze it and tailor your responses accordingly.
"""

# Tool definitions for Claude function calling
COACH_TOOLS = [
    {
        "name": "create_exercise",
        "description": "Add a new exercise to the user's workout plan. Use this when the user asks to add an exercise.",
        "input_schema": {
            "type": "object",
            "properties": {
                "name": {"type": "string", "description": "Exercise name (e.g. 'Bench Press', 'Squat')"},
                "sets": {"type": "integer", "description": "Number of sets (1-100)"},
                "reps": {"type": "integer", "description": "Number of reps per set (1-1000)"},
                "weight": {
                    "type": "number",
                    "description": "Weight in kg (omit or null for bodyweight exercises)",
                },
                "workout_day": {
                    "type": "string",
                    "enum": ["A", "B", "C", "D", "E", "F", "G", "None"],
                    "description": "Workout day letter. Use 'None' for daily exercises.",
                    "default": "A",
                },
                "notes": {
                    "type": "string",
                    "description": "Optional notes or cues for the exercise",
                },
            },
            "required": ["name", "sets", "reps"],
        },
    },
    {
        "name": "edit_exercise",
        "description": (
            "Modify an existing exercise. Use this when the user asks to change sets, reps, weight, name, "
            "or day of an exercise. Requires the exercise ID from the workout context."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "exercise_id": {"type": "integer", "description": "ID of the exercise to edit (from workout context)"},
                "name": {"type": "string", "description": "New exercise name"},
                "sets": {"type": "integer", "description": "New number of sets"},
                "reps": {"type": "integer", "description": "New number of reps"},
                "weight": {"type": "number", "description": "New weight in kg"},
                "workout_day": {
                    "type": "string",
                    "enum": ["A", "B", "C", "D", "E", "F", "G", "None"],
                    "description": "New workout day letter. Use 'None' for daily exercises.",
                },
                "notes": {"type": "string", "description": "New notes"},
            },
            "required": ["exercise_id"],
        },
    },
    {
        "name": "log_workout",
        "description": (
            "Log a completed workout session. Use this when the user says they finished a workout "
            "or wants to log exercises they did today."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "date": {"type": "string", "description": "Workout date in YYYY-MM-DD format"},
                "workout_day": {
                    "type": "string",
                    "enum": ["A", "B", "C", "D", "E", "F", "G"],
                    "description": "Which workout day was performed.",
                },
                "notes": {"type": "string", "description": "Optional session notes"},
                "duration_minutes": {"type": "integer", "description": "Workout duration in minutes"},
                "exercises": {
                    "type": "array",
                    "description": "Exercises performed in this session",
                    "items": {
                        "type": "object",
                        "properties": {
                            "exercise_name": {"type": "string"},
                            "sets_completed": {"type": "integer"},
                            "reps_completed": {"type": "integer"},
                            "weight_used": {"type": "number", "description": "Weight in kg"},
                        },
                        "required": ["exercise_name", "sets_completed", "reps_completed"],
                    },
                },
            },
            "required": ["date", "workout_day", "exercises"],
        },
    },
    {
        "name": "add_measurement",
        "description": (
            "Record a body measurement entry. Use this when the user provides body measurements "
            "like weight, body fat, or tape measurements."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "date": {"type": "string", "description": "Measurement date in YYYY-MM-DD format"},
                "weight_kg": {"type": "number", "description": "Body weight in kg"},
                "body_fat_pct": {"type": "number", "description": "Body fat percentage"},
                "chest_cm": {"type": "number", "description": "Chest circumference in cm"},
                "waist_cm": {"type": "number", "description": "Waist circumference in cm"},
                "hips_cm": {"type": "number", "description": "Hips circumference in cm"},
                "bicep_left_cm": {"type": "number", "description": "Left bicep circumference in cm"},
                "bicep_right_cm": {"type": "number", "description": "Right bicep circumference in cm"},
                "thigh_left_cm": {"type": "number", "description": "Left thigh circumference in cm"},
                "thigh_right_cm": {"type": "number", "description": "Right thigh circumference in cm"},
                "neck_cm": {"type": "number", "description": "Neck circumference in cm"},
                "shoulders_cm": {"type": "number", "description": "Shoulders circumference in cm"},
                "forearm_cm": {"type": "number", "description": "Forearm circumference in cm"},
                "calf_cm": {"type": "number", "description": "Calf circumference in cm"},
                "notes": {"type": "string", "description": "Optional notes"},
            },
            "required": ["date"],
        },
    },
]

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
            ctx += f"    - [ID:{ex.id}] {ex.name}: {ex.sets} sets x {ex.reps} reps{weight_str}\n"

    for day in sorted(split_days):
        day_exercises = [ex for ex in workout_context.exercises if ex.workout_day == day]
        ctx += f"\n  Day {day}:\n"
        for ex in day_exercises:
            weight_str = f" @ {ex.weight}kg" if ex.weight else " (bodyweight)"
            ctx += f"    - [ID:{ex.id}] {ex.name}: {ex.sets} sets x {ex.reps} reps{weight_str}\n"

    return ctx


def _strip_json_fences(text: str) -> str:
    """Strip markdown code fences from JSON responses."""
    text = text.strip()
    if text.startswith("```"):
        # Remove opening fence (```json or ```)
        first_newline = text.index("\n")
        text = text[first_newline + 1 :]
    if text.endswith("```"):
        text = text[:-3]
    return text.strip()


def _build_messages(history: list[ChatMessage], user_prompt: str) -> list[dict[str, Any]]:
    """Build a messages list from conversation history + the current user message."""
    messages: list[dict[str, Any]] = []
    for msg in history:
        messages.append({"role": msg.role, "content": msg.content})
    messages.append({"role": "user", "content": user_prompt})
    return messages


async def _execute_tool(
    tool_name: str,
    tool_input: dict[str, Any],
    workout_client: WorkoutAPIClient,
    auth_header: str | None,
) -> tuple[str, ActionPerformed | None]:
    """Execute a single tool call and return (result_text, action_performed)."""
    try:
        if tool_name == "create_exercise":
            result = await workout_client.create_exercise(tool_input, auth_header)
            action = ActionPerformed(
                action="create_exercise",
                description=f"Added exercise: {tool_input['name']} ({tool_input['sets']}x{tool_input['reps']})",
                details=result,
            )
            return json.dumps(result), action

        elif tool_name == "edit_exercise":
            eid = tool_input["exercise_id"]
            payload = {k: v for k, v in tool_input.items() if k != "exercise_id"}
            result = await workout_client.edit_exercise(eid, payload, auth_header)
            changed = ", ".join(f"{k}={v}" for k, v in payload.items())
            action = ActionPerformed(
                action="edit_exercise",
                description=f"Updated exercise #{eid}: {changed}",
                details=result,
            )
            return json.dumps(result), action

        elif tool_name == "log_workout":
            result = await workout_client.create_session(tool_input, auth_header)
            n = len(tool_input.get("exercises", []))
            action = ActionPerformed(
                action="log_workout",
                description=f"Logged workout on {tool_input['date']} (day {tool_input['workout_day']}, {n} exercises)",
                details=result,
            )
            return json.dumps(result), action

        elif tool_name == "add_measurement":
            result = await workout_client.create_measurement(tool_input, auth_header)
            metrics = [k for k, v in tool_input.items() if v is not None and k not in ("date", "notes")]
            action = ActionPerformed(
                action="add_measurement",
                description=f"Recorded measurements on {tool_input['date']}: {', '.join(metrics)}",
                details=result,
            )
            return json.dumps(result), action

        else:
            return json.dumps({"error": f"Unknown tool: {tool_name}"}), None

    except Exception as e:
        logger.error(f"Tool execution error ({tool_name}): {e}")
        return json.dumps({"error": str(e)}), None


async def _anthropic_chat_with_tools(
    api_key: str,
    model: str,
    system_prompt: str,
    user_prompt: str,
    workout_client: WorkoutAPIClient,
    auth_header: str | None,
    history: list[ChatMessage] | None = None,
) -> tuple[str, list[ActionPerformed]]:
    """Anthropic chat with tool-use loop. Returns (response_text, actions_performed)."""
    client = anthropic.AsyncAnthropic(api_key=api_key)
    messages: list[dict[str, Any]] = _build_messages(history or [], user_prompt)
    actions: list[ActionPerformed] = []

    max_iterations = 25
    for _ in range(max_iterations):
        response = await client.messages.create(
            model=model,
            max_tokens=4096,
            temperature=settings.ai_temperature,
            system=system_prompt,
            messages=messages,
            tools=COACH_TOOLS,
        )

        # If no tool use, extract final text and return
        if response.stop_reason != "tool_use":
            text_parts = [block.text for block in response.content if block.type == "text"]
            return "\n".join(text_parts), actions

        # Process tool calls
        tool_results = []
        for block in response.content:
            if block.type == "tool_use":
                result_text, action = await _execute_tool(block.name, block.input, workout_client, auth_header)
                if action:
                    actions.append(action)
                tool_results.append({"type": "tool_result", "tool_use_id": block.id, "content": result_text})

        # Append assistant response and tool results for next iteration
        messages.append({"role": "assistant", "content": response.content})
        messages.append({"role": "user", "content": tool_results})

    # Fallback if we hit max iterations
    return "I performed several actions but reached the processing limit. Please check your data.", actions


async def _openai_chat_with_tools(
    api_key: str,
    base_url: str,
    model: str,
    system_prompt: str,
    user_prompt: str,
    workout_client: WorkoutAPIClient,
    auth_header: str | None,
    history: list[ChatMessage] | None = None,
) -> tuple[str, list[ActionPerformed]]:
    """OpenAI-compatible chat with tool-use loop. Returns (response_text, actions_performed)."""
    client = AsyncOpenAI(api_key=api_key, base_url=base_url)
    actions: list[ActionPerformed] = []

    openai_tools = []
    for tool in COACH_TOOLS:
        openai_tools.append(
            {
                "type": "function",
                "function": {
                    "name": tool["name"],
                    "description": tool["description"],
                    "parameters": tool["input_schema"],
                },
            }
        )

    messages: list[dict[str, Any]] = [
        {"role": "system", "content": system_prompt},
        *_build_messages(history or [], user_prompt),
    ]

    max_iterations = 25
    for _ in range(max_iterations):
        response = await client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=settings.ai_temperature,
            tools=openai_tools,
        )
        choice = response.choices[0]

        if choice.finish_reason != "tool_calls" or not choice.message.tool_calls:
            return choice.message.content or "", actions

        # Append assistant message with tool calls
        messages.append(choice.message)

        # Execute each tool call
        for tc in choice.message.tool_calls:
            tool_input = json.loads(tc.function.arguments)
            result_text, action = await _execute_tool(tc.function.name, tool_input, workout_client, auth_header)
            if action:
                actions.append(action)
            messages.append(
                {
                    "role": "tool",
                    "tool_call_id": tc.id,
                    "content": result_text,
                }
            )

    return "I performed several actions but reached the processing limit. Please check your data.", actions


async def _anthropic_completion(
    api_key: str,
    model: str,
    system_prompt: str,
    user_prompt: str,
    response_format: type | None = None,
) -> str:
    """Make a completion request using the Anthropic SDK (no tools)."""
    client = anthropic.AsyncAnthropic(api_key=api_key)

    if response_format is not None:
        json_schema = response_format.model_json_schema()
        user_prompt += (
            f"\n\nYou MUST respond with valid JSON matching this schema:\n{json.dumps(json_schema, indent=2)}"
            "\n\nRespond ONLY with the JSON object, no other text."
        )

    message = await client.messages.create(
        model=model,
        max_tokens=4096,
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
    workout_client: WorkoutAPIClient | None = None,
    auth_header: str | None = None,
    history: list[ChatMessage] | None = None,
) -> tuple[str, list[ActionPerformed]]:
    """Chat with the AI coach. Returns (response_text, actions_performed)."""
    if not api_key:
        raise ValueError("API key is required")

    from datetime import date

    system_prompt = COACH_SYSTEM_PROMPT.format(today=date.today().isoformat()) + _format_workout_context(
        workout_context
    )

    try:
        if workout_client and auth_header:
            # Use tool-enabled flow
            if _is_anthropic(api_key, base_url):
                return await _anthropic_chat_with_tools(
                    api_key=api_key,
                    model=model or settings.ai_model,
                    system_prompt=system_prompt,
                    user_prompt=message,
                    workout_client=workout_client,
                    auth_header=auth_header,
                    history=history,
                )
            else:
                return await _openai_chat_with_tools(
                    api_key=api_key,
                    base_url=base_url or settings.ai_base_url,
                    model=model or settings.ai_model,
                    system_prompt=system_prompt,
                    user_prompt=message,
                    workout_client=workout_client,
                    auth_header=auth_header,
                    history=history,
                )
        else:
            # Fallback to simple completion (no tools)
            result = await _chat_completion(
                api_key=api_key,
                base_url=base_url,
                model=model or settings.ai_model,
                system_prompt=system_prompt,
                user_prompt=message,
            )
            return result, []
    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise


async def get_workout_recommendation(
    workout_context: WorkoutContext | None = None,
    focus_area: MuscleGroup | None = None,
    custom_focus_area: str | None = None,
    equipment: list[str] | None = None,
    session_duration: int = 60,
    training_goal: str | None = None,
    training_days_per_week: int | None = None,
    experience_level: str | None = None,
    api_key: str | None = None,
    base_url: str | None = None,
    model: str | None = None,
) -> WorkoutRecommendation:
    """Get a workout recommendation from the AI coach."""
    if not api_key:
        raise ValueError("API key is required")

    focus_label = custom_focus_area or (focus_area.value.replace("_", "/").title() if focus_area else "Full Body")
    equip = equipment or ["barbell", "dumbbells", "cables", "bodyweight"]
    goal_label = (training_goal or "general_fitness").replace("_", " ").title()
    level_label = (experience_level or "intermediate").title()
    days = training_days_per_week or 3

    prompt = f"""Generate a complete, personalized workout routine.

Training Goal: {goal_label}
Experience Level: {level_label}
Training Days Per Week: {days}
Session Duration: {session_duration} minutes per session
Focus Area: {focus_label}
Available Equipment: ONLY {", ".join(equip)}

Create a full {days}-day training program tailored to {goal_label.lower()}.

Requirements:
1. A catchy workout title reflecting the goal and split
2. Brief description explaining the program philosophy and why this split suits the goal
3. Generate exercises across all {days} days — use workout days "A" through "{chr(64 + days)}"
4. Each day should have 4-7 exercises appropriate for the split
5. Estimated session duration in minutes
6. Difficulty level matching {level_label}
7. A split_type label (e.g. "Push/Pull/Legs", "Upper/Lower", "Full Body", "Bro Split", "Arnold Split")
8. 3-5 practical tips specific to {goal_label.lower()} training

STRICT equipment rule:
- ONLY use exercises that can be performed with: {", ".join(equip)}
- Do NOT include exercises requiring equipment NOT in this list
- If "machines" is not listed, do NOT suggest any machine-based exercises
  (no cable machine, no leg press machine, no smith machine, etc.)
- Prefer free-weight and bodyweight alternatives when machines are unavailable

Goal-specific guidelines:
- Hypertrophy: 8-12 reps, moderate weight, 3-4 sets, focus on time under tension
- Strength: 3-6 reps, heavier weight, 4-5 sets, prioritize compound lifts
- Endurance: 15-20 reps, lighter weight, 2-3 sets, shorter rest periods
- Fat Loss: mix of compound movements, supersets, 10-15 reps, higher volume
- General Fitness: balanced approach, 8-12 reps, full-body coverage

Split selection guide for {days} days:
- 2 days: Upper/Lower
- 3 days: Push/Pull/Legs or Full Body x3
- 4 days: Upper/Lower x2 or Push/Pull/Legs + Upper
- 5 days: Push/Pull/Legs + Upper/Lower, or Bro Split
- 6 days: Push/Pull/Legs x2
Choose the split that best matches the focus area "{focus_label}" and {days} training days.

Day assignment rules:
- MUST use workout days "A" through "{chr(64 + days)}" — exactly {days} days, no more, no less
- Distribute muscle groups logically across the {days} days
- Each exercise reps field must be a string like "8" or "8-12"

If workout context is available, base weights on the user's current lifts."""

    from datetime import date as date_cls

    system_prompt = COACH_SYSTEM_PROMPT.format(today=date_cls.today().isoformat()) + _format_workout_context(
        workout_context
    )

    try:
        raw = await _chat_completion(
            api_key=api_key,
            base_url=base_url,
            model=model or settings.ai_model,
            system_prompt=system_prompt,
            user_prompt=prompt,
            response_format=WorkoutRecommendation,
        )
        return WorkoutRecommendation.model_validate_json(_strip_json_fences(raw))
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

    from datetime import date as date_cls

    system_prompt = COACH_SYSTEM_PROMPT.format(today=date_cls.today().isoformat()) + _format_workout_context(
        workout_context
    )

    try:
        raw = await _chat_completion(
            api_key=api_key,
            base_url=base_url,
            model=model or settings.ai_model,
            system_prompt=system_prompt,
            user_prompt=prompt,
            response_format=ProgressAnalysis,
        )
        return ProgressAnalysis.model_validate_json(_strip_json_fences(raw))
    except Exception as e:
        logger.error(f"Analysis error: {e}", exc_info=True)
        raise


async def suggest_overload(
    workout_context: WorkoutContext,
    weight_progress: dict[str, Any],
    volume_progress: dict[str, Any],
    api_key: str | None = None,
    base_url: str | None = None,
    model: str | None = None,
) -> OverloadSuggestions:
    """Analyze workout history and suggest progressive overload adjustments.

    Exercises with no logged history are auto-marked as needs_more_data
    without being sent to the LLM, reducing token usage.
    """
    if not api_key:
        raise ValueError("API key is required")

    settings = get_settings()

    # Split exercises into those with history vs without
    weight_exercises = weight_progress.get("exercises", {})
    all_exercise_names = [ex.name for ex in workout_context.exercises]

    exercises_with_data: list[str] = []
    no_data_suggestions: list[ExerciseOverloadSuggestion] = []

    for name in all_exercise_names:
        points = weight_exercises.get(name, [])
        if len(points) >= 1:
            exercises_with_data.append(name)
        else:
            no_data_suggestions.append(
                ExerciseOverloadSuggestion(
                    exercise_name=name,
                    readiness=ReadinessStatus.NEEDS_MORE_DATA,
                    reasoning="No logged sessions yet. Start logging workouts to get recommendations.",
                )
            )

    # If no exercises have data, skip the LLM call entirely
    if not exercises_with_data:
        return OverloadSuggestions(
            summary="Not enough workout history to analyze. Log some sessions first!",
            suggestions=no_data_suggestions,
            general_tips=["Log at least 3 sessions per exercise to get meaningful overload recommendations."],
        )

    # Truncate to last 20 data points per exercise to limit token usage
    def _truncate(progress: dict[str, Any]) -> dict[str, Any]:
        exercises = progress.get("exercises", {})
        return {
            "metric": progress.get("metric", ""),
            "exercises": {name: points[-20:] for name, points in exercises.items() if name in exercises_with_data},
        }

    weight_data = _truncate(weight_progress)
    volume_data = _truncate(volume_progress)

    prompt = f"""Analyze the following workout history and provide progressive overload recommendations
for each exercise listed below.

## Weight Progress (per exercise, chronological)
{json.dumps(weight_data, indent=2)}

## Volume Progress (per exercise, chronological — value = sets × reps × weight)
{json.dumps(volume_data, indent=2)}

## Instructions
For EACH exercise in the data above, analyze its weight and volume time series and provide
a recommendation:

1. **ready_to_increase** — The user has performed 3+ sessions at the same weight with consistent
   reps. Suggest a specific weight increase:
   - Compound lifts (squat, bench, deadlift, row, press): increase by 2.5–5 kg
   - Isolation lifts (curl, extension, fly, raise): increase by 1–2.5 kg
   - Also suggest volume increases (extra set or reps) if appropriate

2. **maintaining** — The user is progressing steadily and should continue current programming.
   No change needed yet.

3. **needs_more_data** — Fewer than 3 logged sessions for this exercise. Cannot make a reliable
   recommendation yet.

4. **deload_suggested** — Weight or volume has been declining over recent sessions, suggesting
   fatigue or overreaching. Suggest reducing weight by 10-15%.

Be specific with numbers. All weights are in kg. Include the number of sessions at current weight.
Focus on practical, conservative recommendations. Do NOT suggest increases if the user has only
done 1-2 sessions at a weight — they need consistency first.

ONLY include exercises that appear in the progress data above. Do not invent exercises."""

    from datetime import date as date_cls

    system_prompt = COACH_SYSTEM_PROMPT.format(today=date_cls.today().isoformat()) + _format_workout_context(
        workout_context
    )

    try:
        raw = await _chat_completion(
            api_key=api_key,
            base_url=base_url,
            model=model or settings.ai_model,
            system_prompt=system_prompt,
            user_prompt=prompt,
            response_format=OverloadSuggestions,
        )
        result = OverloadSuggestions.model_validate_json(_strip_json_fences(raw))
        # Append no-data exercises at the end
        result.suggestions.extend(no_data_suggestions)
        return result
    except Exception as e:
        logger.error(f"Overload suggestion error: {e}", exc_info=True)
        raise
