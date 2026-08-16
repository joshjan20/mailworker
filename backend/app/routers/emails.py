from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import gating
from app.database import get_db
from app.db_models import DecisionLog, EmailRecord
from app.extraction import extract_shipment_details
from app.sample_emails import SAMPLE_EMAILS
from app.schemas import (
    DecisionLogOut,
    EmailRecordOut,
    EmailSubmitRequest,
    SampleEmail,
    ShipmentExtraction,
)

router = APIRouter(prefix="/api/emails", tags=["emails"])


def _latest_decision(db: Session, email_id: int) -> Optional[DecisionLog]:
    return (
        db.query(DecisionLog)
        .filter(DecisionLog.email_record_id == email_id)
        .order_by(DecisionLog.created_at.desc(), DecisionLog.id.desc())
        .first()
    )


def _log_decision(db: Session, record: EmailRecord, extraction: ShipmentExtraction) -> DecisionLog:
    result = gating.evaluate(extraction)
    log = DecisionLog(
        email_record_id=record.id,
        outcome=result.outcome.value,
        field_checks=[fc.model_dump(mode="json") for fc in result.field_checks],
        reasoning=result.reasoning,
        model_notes=result.model_notes,
        model_confidence_score=result.model_confidence_score,
        ruleset_version=result.ruleset_version,
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


def _to_out(record: EmailRecord, decision: Optional[DecisionLog]) -> EmailRecordOut:
    return EmailRecordOut(
        id=record.id,
        raw_text=record.raw_text,
        created_at=record.created_at,
        edited=record.edited,
        extraction=ShipmentExtraction(**record.extraction),
        latest_decision=DecisionLogOut.model_validate(decision) if decision else None,
    )


@router.get("/samples", response_model=List[SampleEmail])
def list_samples():
    return SAMPLE_EMAILS


@router.post("/extract", response_model=EmailRecordOut)
def extract_email(payload: EmailSubmitRequest, db: Session = Depends(get_db)):
    if not payload.raw_text.strip():
        raise HTTPException(status_code=400, detail="raw_text must not be empty")

    try:
        extraction = extract_shipment_details(payload.raw_text, payload.sender_email)
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    record = EmailRecord(
        raw_text=payload.raw_text,
        extraction=extraction.model_dump(mode="json"),
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    decision = _log_decision(db, record, extraction)
    return _to_out(record, decision)


@router.get("", response_model=List[EmailRecordOut])
def list_emails(db: Session = Depends(get_db)):
    records = db.query(EmailRecord).order_by(EmailRecord.created_at.desc()).all()
    return [_to_out(r, _latest_decision(db, r.id)) for r in records]


@router.get("/{email_id}", response_model=EmailRecordOut)
def get_email(email_id: int, db: Session = Depends(get_db)):
    record = db.get(EmailRecord, email_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Email record not found")
    return _to_out(record, _latest_decision(db, email_id))


@router.get("/{email_id}/decisions", response_model=List[DecisionLogOut])
def list_decisions(email_id: int, db: Session = Depends(get_db)):
    record = db.get(EmailRecord, email_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Email record not found")
    logs = (
        db.query(DecisionLog)
        .filter(DecisionLog.email_record_id == email_id)
        .order_by(DecisionLog.created_at.desc(), DecisionLog.id.desc())
        .all()
    )
    return logs


@router.put("/{email_id}", response_model=EmailRecordOut)
def update_email(
    email_id: int, extraction: ShipmentExtraction, db: Session = Depends(get_db)
):
    record = db.get(EmailRecord, email_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Email record not found")

    record.extraction = extraction.model_dump(mode="json")
    record.edited = True
    db.commit()
    db.refresh(record)

    decision = _log_decision(db, record, extraction)
    return _to_out(record, decision)
