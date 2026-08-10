"""Body measurement models for tracking weight, body fat %, and tape measurements.

Used for logging body measurements over time and viewing progress charts.
"""

from datetime import date, datetime

from pydantic import BaseModel, Field


class BodyMeasurementCreate(BaseModel):
    """Request body for logging a body measurement entry."""

    date: date
    weight_kg: float | None = Field(default=None, ge=0)
    body_fat_pct: float | None = Field(default=None, ge=0, le=100)
    chest_cm: float | None = Field(default=None, ge=0)
    waist_cm: float | None = Field(default=None, ge=0)
    hips_cm: float | None = Field(default=None, ge=0)
    bicep_left_cm: float | None = Field(default=None, ge=0)
    bicep_right_cm: float | None = Field(default=None, ge=0)
    thigh_left_cm: float | None = Field(default=None, ge=0)
    thigh_right_cm: float | None = Field(default=None, ge=0)
    neck_cm: float | None = Field(default=None, ge=0)
    shoulders_cm: float | None = Field(default=None, ge=0)
    forearm_cm: float | None = Field(default=None, ge=0)
    calf_cm: float | None = Field(default=None, ge=0)
    notes: str | None = Field(default=None, max_length=500)


class BodyMeasurementResponse(BaseModel):
    """Full measurement entry with database ID."""

    id: int
    date: date
    weight_kg: float | None
    body_fat_pct: float | None
    chest_cm: float | None
    waist_cm: float | None
    hips_cm: float | None
    bicep_left_cm: float | None
    bicep_right_cm: float | None
    thigh_left_cm: float | None
    thigh_right_cm: float | None
    neck_cm: float | None
    shoulders_cm: float | None
    forearm_cm: float | None
    calf_cm: float | None
    notes: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class MeasurementProgressPoint(BaseModel):
    """Single data point for measurement progress charts."""

    date: date
    value: float


class MeasurementProgressResponse(BaseModel):
    """Time series data for a specific measurement metric."""

    metric: str
    unit: str
    data: list[MeasurementProgressPoint]
