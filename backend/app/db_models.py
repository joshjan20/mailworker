from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, JSON, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class EmailRecord(Base):
    __tablename__ = "email_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    raw_text: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )
    edited: Mapped[bool] = mapped_column(Boolean, default=False)
    extraction: Mapped[dict] = mapped_column(JSON, nullable=False)


class DecisionLog(Base):
    """Append-only audit trail. Rows are never updated or deleted — a new row is
    inserted every time an extraction is created or corrected, so the full decision
    history for a record is always reconstructable."""

    __tablename__ = "decision_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email_record_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("email_records.id"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )
    outcome: Mapped[str] = mapped_column(String, nullable=False)
    field_checks: Mapped[list] = mapped_column(JSON, nullable=False)
    reasoning: Mapped[str] = mapped_column(String, nullable=False)
    model_notes: Mapped[str] = mapped_column(String, nullable=True)
    model_confidence_score: Mapped[float] = mapped_column(Float, nullable=False)
    ruleset_version: Mapped[str] = mapped_column(String, nullable=False)
