"""RPCS-1 Router — task routing to model families."""
TASK_ROUTES = {
    "code": {"description": "Code generation, debugging, refactoring", "recommended_model": "reasoning", "fallback": "fast", "risk": "high-stakes"},
    "creative_writing": {"description": "Creative prose, storytelling, marketing copy", "recommended_model": "creative", "fallback": "balanced", "risk": "casual"},
    "analysis": {"description": "Data analysis, research, summarization", "recommended_model": "reasoning", "fallback": "balanced", "risk": "advice"},
    "chat": {"description": "General conversation, Q&A, assistance", "recommended_model": "balanced", "fallback": "fast", "risk": "casual"},
    "translation": {"description": "Language translation, localization", "recommended_model": "balanced", "fallback": "fast", "risk": "advice"},
    "reasoning": {"description": "Complex reasoning, math, logic puzzles", "recommended_model": "reasoning", "fallback": "balanced", "risk": "advice"},
    "planning": {"description": "Project planning, task decomposition, scheduling", "recommended_model": "reasoning", "fallback": "balanced", "risk": "advice"},
    "emotional": {"description": "Emotional support, empathy, venting", "recommended_model": "creative", "fallback": "balanced", "risk": "casual"},
}


def route(task_type: str, objective: str | None = None, target_audience: str = "plain", allow_multi_model: bool = False) -> dict:
    if task_type not in TASK_ROUTES:
        return {"error": f"Unknown task type '{task_type}'.", "task_type": task_type, "available_types": list(TASK_ROUTES.keys())}
    info = TASK_ROUTES[task_type]
    result = {"task_type": task_type, "description": info["description"],
              "primary_route": info["recommended_model"], "fallback_route": info["fallback"],
              "risk_category": info["risk"], "target_audience": target_audience,
              "strategy": "parallel" if allow_multi_model else "primary_with_fallback"}
    if objective:
        result["objective"] = objective
    return result


def list_routes() -> dict:
    return {"routes": TASK_ROUTES}
