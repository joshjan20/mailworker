from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field


class Intent(str, Enum):
    booking_request = "booking_request"
    quote_request = "quote_request"
    status_inquiry = "status_inquiry"
    document_request = "document_request"
    shipment_amendment = "shipment_amendment"
    general_inquiry = "general_inquiry"
    other = "other"


class Urgency(str, Enum):
    normal = "normal"
    high = "high"


class ShipmentMode(str, Enum):
    FCL = "FCL"
    LCL = "LCL"
    AIR = "AIR"
    RAIL = "RAIL"
    ROAD = "ROAD"
    MULTIMODAL = "MULTIMODAL"
    unknown = "unknown"


class FreightTerms(str, Enum):
    prepaid = "prepaid"
    collect = "collect"


class EmailMeta(BaseModel):
    message_id: Optional[str] = None
    received_at: Optional[datetime] = None
    sender_email: Optional[str] = None
    intent: Intent = Intent.other
    urgency: Urgency = Urgency.normal
    confidence_score: float = Field(default=0.0, ge=0.0, le=1.0)


class References(BaseModel):
    booking_number: Optional[str] = None
    po_number: Optional[str] = None
    shipper_reference: Optional[str] = None
    mbl_number: Optional[str] = None
    hbl_number: Optional[str] = None
    awb_number: Optional[str] = None


class Party(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    contact: Optional[str] = None


class Parties(BaseModel):
    shipper: Party = Field(default_factory=Party)
    consignee: Party = Field(default_factory=Party)
    notify_party: Party = Field(default_factory=Party)
    forwarder: Party = Field(default_factory=Party)


class Routing(BaseModel):
    origin: Optional[str] = None
    destination: Optional[str] = None
    transshipment_points: List[str] = Field(default_factory=list)
    incoterms: Optional[str] = None


class Container(BaseModel):
    type: Optional[str] = None
    quantity: Optional[int] = None
    container_number: Optional[str] = None
    seal_number: Optional[str] = None


class Hazmat(BaseModel):
    is_hazmat: bool = False
    imo_class: Optional[str] = None
    un_number: Optional[str] = None


class TemperatureControlled(BaseModel):
    required: bool = False
    range_c: Optional[str] = None


class Cargo(BaseModel):
    commodity_description: Optional[str] = None
    hs_code: Optional[str] = None
    gross_weight_kg: Optional[float] = None
    net_weight_kg: Optional[float] = None
    volume_cbm: Optional[float] = None
    package_count: Optional[int] = None
    package_type: Optional[str] = None
    containers: List[Container] = Field(default_factory=list)
    hazmat: Hazmat = Field(default_factory=Hazmat)
    temperature_controlled: TemperatureControlled = Field(default_factory=TemperatureControlled)
    oversized_or_breakbulk: bool = False


class Dates(BaseModel):
    cargo_ready_date: Optional[str] = None
    requested_etd: Optional[str] = None
    requested_eta: Optional[str] = None
    cutoff_date: Optional[str] = None
    delivery_deadline: Optional[str] = None


class Commercial(BaseModel):
    requested_carrier: Optional[str] = None
    freight_terms: Optional[FreightTerms] = None
    quoted_rate: Optional[float] = None
    currency: Optional[str] = None


class ShipmentExtraction(BaseModel):
    email_meta: EmailMeta
    references: References = Field(default_factory=References)
    mode: ShipmentMode = ShipmentMode.unknown
    parties: Parties = Field(default_factory=Parties)
    routing: Routing = Field(default_factory=Routing)
    cargo: Cargo = Field(default_factory=Cargo)
    dates: Dates = Field(default_factory=Dates)
    commercial: Commercial = Field(default_factory=Commercial)
    attachments_referenced: List[str] = Field(default_factory=list)
    extraction_notes: Optional[str] = None


class EmailSubmitRequest(BaseModel):
    raw_text: str
    sender_email: Optional[str] = None


class FieldCheckStatus(str, Enum):
    ok = "ok"
    missing = "missing"
    implausible = "implausible"


class DecisionOutcome(str, Enum):
    auto_confirm = "auto_confirm"
    escalate_to_ops = "escalate_to_ops"


class FieldCheck(BaseModel):
    field: str
    value: str
    status: FieldCheckStatus
    reason: str


class DecisionResult(BaseModel):
    outcome: DecisionOutcome
    field_checks: List[FieldCheck]
    reasoning: str
    model_notes: Optional[str] = None
    model_confidence_score: float
    ruleset_version: str


class DecisionLogOut(DecisionResult):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class EmailRecordOut(BaseModel):
    id: int
    raw_text: str
    created_at: datetime
    edited: bool
    extraction: ShipmentExtraction
    latest_decision: Optional[DecisionLogOut] = None

    class Config:
        from_attributes = True


class SampleEmail(BaseModel):
    label: str
    raw_text: str
