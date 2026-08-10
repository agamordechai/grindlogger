"""Repository for body measurement operations.

Provides CRUD for body measurements and progress analytics.
All queries scoped by user_id.
"""

from __future__ import annotations

import datetime as dt

from sqlmodel import Session, select

from services.api.src.database.db_models import BodyMeasurementTable
from services.shared.models.measurement import (
    BodyMeasurementCreate,
    BodyMeasurementResponse,
    MeasurementProgressPoint,
    MeasurementProgressResponse,
)

# Metric field name -> (db column, display unit)
METRIC_MAP: dict[str, tuple[str, str]] = {
    "weight": ("weight_kg", "kg"),
    "body_fat": ("body_fat_pct", "%"),
    "chest": ("chest_cm", "cm"),
    "waist": ("waist_cm", "cm"),
    "hips": ("hips_cm", "cm"),
    "bicep_left": ("bicep_left_cm", "cm"),
    "bicep_right": ("bicep_right_cm", "cm"),
    "thigh_left": ("thigh_left_cm", "cm"),
    "thigh_right": ("thigh_right_cm", "cm"),
    "neck": ("neck_cm", "cm"),
    "shoulders": ("shoulders_cm", "cm"),
    "forearm": ("forearm_cm", "cm"),
    "calf": ("calf_cm", "cm"),
}


def _to_response(row: BodyMeasurementTable) -> BodyMeasurementResponse:
    return BodyMeasurementResponse(
        id=row.id,
        date=row.measurement_date,
        weight_kg=row.weight_kg,
        body_fat_pct=row.body_fat_pct,
        chest_cm=row.chest_cm,
        waist_cm=row.waist_cm,
        hips_cm=row.hips_cm,
        bicep_left_cm=row.bicep_left_cm,
        bicep_right_cm=row.bicep_right_cm,
        thigh_left_cm=row.thigh_left_cm,
        thigh_right_cm=row.thigh_right_cm,
        neck_cm=row.neck_cm,
        shoulders_cm=row.shoulders_cm,
        forearm_cm=row.forearm_cm,
        calf_cm=row.calf_cm,
        notes=row.notes,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


class BodyMeasurementRepository:
    """Repository for body measurement CRUD and analytics."""

    def __init__(self, session: Session):
        self.session = session

    def create(self, user_id: int, data: BodyMeasurementCreate) -> BodyMeasurementResponse:
        """Create a new body measurement entry."""
        row = BodyMeasurementTable(
            user_id=user_id,
            measurement_date=data.date,
            weight_kg=data.weight_kg,
            body_fat_pct=data.body_fat_pct,
            chest_cm=data.chest_cm,
            waist_cm=data.waist_cm,
            hips_cm=data.hips_cm,
            bicep_left_cm=data.bicep_left_cm,
            bicep_right_cm=data.bicep_right_cm,
            thigh_left_cm=data.thigh_left_cm,
            thigh_right_cm=data.thigh_right_cm,
            neck_cm=data.neck_cm,
            shoulders_cm=data.shoulders_cm,
            forearm_cm=data.forearm_cm,
            calf_cm=data.calf_cm,
            notes=data.notes,
        )
        self.session.add(row)
        self.session.commit()
        self.session.refresh(row)
        return _to_response(row)

    def get(self, measurement_id: int, user_id: int) -> BodyMeasurementResponse | None:
        """Get a single measurement by ID."""
        stmt = select(BodyMeasurementTable).where(
            BodyMeasurementTable.id == measurement_id,
            BodyMeasurementTable.user_id == user_id,
        )
        row = self.session.exec(stmt).first()
        return _to_response(row) if row else None

    def update(self, measurement_id: int, user_id: int, data: BodyMeasurementCreate) -> BodyMeasurementResponse | None:
        """Update an existing measurement entry."""
        stmt = select(BodyMeasurementTable).where(
            BodyMeasurementTable.id == measurement_id,
            BodyMeasurementTable.user_id == user_id,
        )
        row = self.session.exec(stmt).first()
        if not row:
            return None

        row.measurement_date = data.date
        row.weight_kg = data.weight_kg
        row.body_fat_pct = data.body_fat_pct
        row.chest_cm = data.chest_cm
        row.waist_cm = data.waist_cm
        row.hips_cm = data.hips_cm
        row.bicep_left_cm = data.bicep_left_cm
        row.bicep_right_cm = data.bicep_right_cm
        row.thigh_left_cm = data.thigh_left_cm
        row.thigh_right_cm = data.thigh_right_cm
        row.neck_cm = data.neck_cm
        row.shoulders_cm = data.shoulders_cm
        row.forearm_cm = data.forearm_cm
        row.calf_cm = data.calf_cm
        row.notes = data.notes
        row.updated_at = dt.datetime.now(dt.UTC)

        self.session.commit()
        self.session.refresh(row)
        return _to_response(row)

    def delete(self, measurement_id: int, user_id: int) -> bool:
        """Delete a measurement entry."""
        stmt = select(BodyMeasurementTable).where(
            BodyMeasurementTable.id == measurement_id,
            BodyMeasurementTable.user_id == user_id,
        )
        row = self.session.exec(stmt).first()
        if not row:
            return False
        self.session.delete(row)
        self.session.commit()
        return True

    def list_all(self, user_id: int) -> list[BodyMeasurementResponse]:
        """List all measurements for a user, newest first."""
        stmt = (
            select(BodyMeasurementTable)
            .where(BodyMeasurementTable.user_id == user_id)
            .order_by(BodyMeasurementTable.measurement_date.desc())
        )
        rows = self.session.exec(stmt).all()
        return [_to_response(r) for r in rows]

    def get_latest(self, user_id: int) -> BodyMeasurementResponse | None:
        """Get the most recent measurement."""
        stmt = (
            select(BodyMeasurementTable)
            .where(BodyMeasurementTable.user_id == user_id)
            .order_by(BodyMeasurementTable.measurement_date.desc())
            .limit(1)
        )
        row = self.session.exec(stmt).first()
        return _to_response(row) if row else None

    def get_progress(self, user_id: int, metric: str) -> MeasurementProgressResponse:
        """Get time series data for a specific metric."""
        info = METRIC_MAP.get(metric)
        if not info:
            return MeasurementProgressResponse(metric=metric, unit="", data=[])

        column_name, unit = info

        stmt = (
            select(BodyMeasurementTable)
            .where(BodyMeasurementTable.user_id == user_id)
            .order_by(BodyMeasurementTable.measurement_date)
        )
        rows = self.session.exec(stmt).all()

        points: list[MeasurementProgressPoint] = []
        for row in rows:
            value = getattr(row, column_name)
            if value is not None:
                points.append(MeasurementProgressPoint(date=row.measurement_date, value=value))

        return MeasurementProgressResponse(metric=metric, unit=unit, data=points)
