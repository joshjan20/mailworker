import json
import uuid
from datetime import datetime, timezone
from typing import Optional

import anthropic
from pydantic import ValidationError

from app.config import ANTHROPIC_API_KEY, EXTRACTION_MODEL
from app.schemas import ShipmentExtraction

_TOOL_NAME = "extract_shipment_details"

_SYSTEM_PROMPT = """You are an extraction engine for a freight forwarding operations \
team. Given the raw text of an inbound email, call the extract_shipment_details tool \
with every field you can confidently determine from the email.

Rules:
- Only populate a field if the email actually supports it. Leave fields null/empty \
rather than guessing or inferring plausible-sounding values.
- Classify `email_meta.intent` carefully. Most emails are NOT booking requests — many \
are status inquiries, document requests, or general correspondence. Do not force \
cargo/routing details out of an email that doesn't contain them.
- Dates should be normalized to ISO 8601 (YYYY-MM-DD) when a specific date is stated.
- `email_meta.confidence_score` is your own calibrated estimate (0.0-1.0) of how \
complete and reliable this extraction is overall. An email with little shipment \
detail should get a low score even if intent classification is easy.
- Extract sender name/company details into the relevant party fields when the email \
signature or headers make them evident.
"""


def _build_tool_schema() -> dict:
    schema = ShipmentExtraction.model_json_schema()
    return {
        "name": _TOOL_NAME,
        "description": "Record structured shipment details extracted from a freight forwarding email.",
        "input_schema": schema,
    }


def extract_shipment_details(
    raw_text: str, sender_email: Optional[str] = None
) -> ShipmentExtraction:
    if not ANTHROPIC_API_KEY:
        raise RuntimeError(
            "ANTHROPIC_API_KEY is not set. Add it to backend/.env before extracting emails."
        )

    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    tool = _build_tool_schema()

    response = client.messages.create(
        model=EXTRACTION_MODEL,
        max_tokens=4096,
        system=_SYSTEM_PROMPT,
        tools=[tool],
        tool_choice={"type": "tool", "name": _TOOL_NAME},
        messages=[{"role": "user", "content": f"Email text:\n\n{raw_text}"}],
    )

    tool_use_block = next(
        (block for block in response.content if block.type == "tool_use"), None
    )
    if tool_use_block is None:
        raise RuntimeError("Model did not return a structured extraction.")

    data = tool_use_block.input
    if isinstance(data, str):
        data = json.loads(data)

    try:
        extraction = ShipmentExtraction(**data)
    except ValidationError as exc:
        raise RuntimeError(f"Extraction failed schema validation: {exc}") from exc

    if not extraction.email_meta.message_id:
        extraction.email_meta.message_id = str(uuid.uuid4())
    if not extraction.email_meta.received_at:
        extraction.email_meta.received_at = datetime.now(timezone.utc)
    if sender_email:
        extraction.email_meta.sender_email = sender_email

    return extraction
