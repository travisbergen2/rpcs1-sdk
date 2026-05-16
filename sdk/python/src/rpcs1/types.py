"""
RPCS-1 Agent Tuner — type definitions.

All types mirror the TypeScript types.ts exactly so that Python and TypeScript
produce structurally identical outputs for the same inputs.
"""
from __future__ import annotations

from typing import Literal, Optional
from pydantic import BaseModel, Field

# ─── Input types ──────────────────────────────────────────────────────────────

EnvironmentEntropy = Literal["stable", "moderate", "dynamic", "chaotic"]
EnvironmentPredictability = Literal[
    "highly_predictable", "somewhat_predictable", "unpredictable"
]
Stakes = Literal["low", "medium", "high", "catastrophic"]
ContextRelevance = Literal["short", "medium", "long"]
CommitmentStyle = Literal["decisive", "balanced", "cautious"]
Platform = Literal["anthropic", "openai", "open_source", "generic"]


class AgentEnvironment(BaseModel):
    """Characterises the environment in which the agent operates."""

    entropy: EnvironmentEntropy = Field(
        ..., description="How often does the environment change?"
    )
    predictability: EnvironmentPredictability = Field(
        ..., description="How predictable are changes when they occur?"
    )
    stakes: Stakes = Field(..., description="Cost of an error — drives conservatism")
    context_relevance: ContextRelevance = Field(
        ..., description="How far back in context does relevant history reach?"
    )
    commitment_style: CommitmentStyle = Field(
        ..., description="Should the agent commit quickly or deliberate carefully?"
    )


class TaskDescriptor(BaseModel):
    """Describes the task the agent is performing."""

    task_summary: str = Field(..., description="Free-text description of what the agent does")
    domain: Optional[str] = Field(
        None,
        description="Optional domain hint: 'customer_support' | 'research' | 'coding' | etc.",
    )
    expected_duration_per_call: Optional[Literal["short", "medium", "long"]] = Field(
        None, description="How long each agent invocation is expected to run"
    )


class RecommendInput(BaseModel):
    task: TaskDescriptor
    environment: AgentEnvironment
    target_platform: Platform


# ─── Output types ─────────────────────────────────────────────────────────────

class ReceiverProfile(BaseModel):
    """Five RPCS-1 receiver primitives, all on [0, 100] scale."""

    TI: float = Field(..., description="Temporal Integration window [0,100]")
    SG: float = Field(..., description="Signal Gain [0,100]")
    FT: float = Field(..., description="Filtering Threshold [0,100]")
    UE: float = Field(..., description="Update Elasticity [0,100]")
    AR: float = Field(..., description="Ambiguity Resolution [0,100]")


ToolUseStrategy = Literal[
    "explicit_confirmation", "cautious_chaining", "aggressive", "fail_fast"
]
RetryStrategy = Literal["aggressive", "moderate", "minimal"]
ContextStrategy = Literal["long_window", "rolling_summary", "frequent_grounding"]


class PlatformParameters(BaseModel):
    """LLM platform parameters derived from the receiver profile."""

    temperature: float
    top_p: Optional[float] = None
    max_tokens: int
    model_recommendation: Optional[str] = None
    system_prompt_additions: Optional[list[str]] = None
    tool_use_strategy: Optional[ToolUseStrategy] = None
    retry_strategy: Optional[RetryStrategy] = None
    context_strategy: Optional[ContextStrategy] = None


PredictedRegime = Literal["stable", "near_oscillation", "near_overload", "near_freeze"]
Confidence = Literal["high", "medium", "low"]


class Recommendation(BaseModel):
    """Full recommendation output from the RPCS-1 engine."""

    receiver_profile: ReceiverProfile
    platform_parameters: PlatformParameters
    predicted_regime: PredictedRegime
    reasoning: str = Field(..., description="Human-readable reasoning citing IMM principles")
    warnings: list[str] = Field(default_factory=list)
    imm_principles_applied: list[str] = Field(default_factory=list)
    confidence: Confidence
