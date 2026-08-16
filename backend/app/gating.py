"""Deterministic auto-confirm / escalate gate for shipment extractions.

This intentionally does NOT use the model's self-reported confidence_score to make
the decision. That score is captured for context (see DecisionResult.model_notes /
aggregate_model_confidence) but every check here is a plain rule over the extracted
values themselves, so the decision is reproducible and auditable independent of
whatever the model claims about its own output.
"""

from app.schemas import DecisionResult, FieldCheck, ShipmentExtraction

RULESET_VERSION = "v1"

# Illustrative sanity bounds for a single shipment. Not real industry constants —
# just wide enough to catch obviously-broken extractions (zero/negative values,
# unit-confusion, a stray extra digit) without rejecting legitimate large shipments.
MAX_PLAUSIBLE_WEIGHT_KG = 30_000
MAX_PLAUSIBLE_VOLUME_CBM = 120
MAX_PLAUSIBLE_CONTAINERS = 20


def _check_mode(extraction: ShipmentExtraction) -> FieldCheck:
    if extraction.mode == "unknown":
        return FieldCheck(
            field="mode",
            value=extraction.mode,
            status="missing",
            reason="Transport mode was not determined; a binding rate requires knowing FCL/LCL/AIR/etc.",
        )
    return FieldCheck(field="mode", value=extraction.mode, status="ok", reason="Mode identified.")


def _check_route(extraction: ShipmentExtraction) -> FieldCheck:
    origin = extraction.routing.origin
    destination = extraction.routing.destination
    value = f"{origin or '—'} → {destination or '—'}"

    if not origin or not destination:
        return FieldCheck(
            field="routing.origin/destination",
            value=value,
            status="missing",
            reason="Origin and/or destination missing; a rate cannot be confirmed without both.",
        )
    if origin.strip().lower() == destination.strip().lower():
        return FieldCheck(
            field="routing.origin/destination",
            value=value,
            status="implausible",
            reason="Origin and destination are the same place.",
        )
    return FieldCheck(field="routing.origin/destination", value=value, status="ok", reason="Route identified.")


def _check_cargo_sizing(extraction: ShipmentExtraction) -> FieldCheck:
    cargo = extraction.cargo
    weight = cargo.gross_weight_kg
    volume = cargo.volume_cbm
    value = f"weight={weight if weight is not None else '—'}kg, volume={volume if volume is not None else '—'}CBM"

    if weight is None and volume is None:
        return FieldCheck(
            field="cargo.gross_weight_kg/volume_cbm",
            value=value,
            status="missing",
            reason="No weight or volume extracted; a rate cannot be sized.",
        )
    if weight is not None and (weight <= 0 or weight > MAX_PLAUSIBLE_WEIGHT_KG):
        return FieldCheck(
            field="cargo.gross_weight_kg",
            value=str(weight),
            status="implausible",
            reason=f"Weight {weight}kg is outside the plausible range (0, {MAX_PLAUSIBLE_WEIGHT_KG}].",
        )
    if volume is not None and (volume <= 0 or volume > MAX_PLAUSIBLE_VOLUME_CBM):
        return FieldCheck(
            field="cargo.volume_cbm",
            value=str(volume),
            status="implausible",
            reason=f"Volume {volume}CBM is outside the plausible range (0, {MAX_PLAUSIBLE_VOLUME_CBM}].",
        )

    if extraction.mode == "FCL":
        if not cargo.containers:
            return FieldCheck(
                field="cargo.containers",
                value="none",
                status="missing",
                reason="Mode is FCL but no container details were extracted.",
            )
        total_containers = sum(c.quantity or 0 for c in cargo.containers)
        if total_containers <= 0 or total_containers > MAX_PLAUSIBLE_CONTAINERS:
            return FieldCheck(
                field="cargo.containers",
                value=str(total_containers),
                status="implausible",
                reason=f"Container quantity {total_containers} is outside the plausible range (0, {MAX_PLAUSIBLE_CONTAINERS}].",
            )

    return FieldCheck(field="cargo.gross_weight_kg/volume_cbm", value=value, status="ok", reason="Cargo sizing present and plausible.")


def _check_freight_terms(extraction: ShipmentExtraction) -> FieldCheck:
    terms = extraction.commercial.freight_terms
    if not terms:
        return FieldCheck(
            field="commercial.freight_terms",
            value="—",
            status="missing",
            reason="Prepaid/collect not determined; required to confirm a binding rate.",
        )
    return FieldCheck(field="commercial.freight_terms", value=terms, status="ok", reason="Freight terms identified.")


def _check_cargo_ready_date(extraction: ShipmentExtraction) -> FieldCheck:
    date = extraction.dates.cargo_ready_date
    if not date:
        return FieldCheck(
            field="dates.cargo_ready_date",
            value="—",
            status="missing",
            reason="No cargo ready date extracted; space cannot be confirmed without one.",
        )
    return FieldCheck(field="dates.cargo_ready_date", value=date, status="ok", reason="Cargo ready date identified.")


_CHECKS = [
    _check_mode,
    _check_route,
    _check_cargo_sizing,
    _check_freight_terms,
    _check_cargo_ready_date,
]


def evaluate(extraction: ShipmentExtraction) -> DecisionResult:
    field_checks = [check(extraction) for check in _CHECKS]
    failing = [c for c in field_checks if c.status != "ok"]

    if failing:
        outcome = "escalate_to_ops"
        failed_fields = ", ".join(c.field for c in failing)
        reasoning = (
            f"{len(failing)} of {len(field_checks)} critical checks failed: {failed_fields}. "
            "See the checklist below for details."
        )
    else:
        outcome = "auto_confirm"
        reasoning = f"All {len(field_checks)} critical checks passed deterministic validation."

    return DecisionResult(
        outcome=outcome,
        field_checks=field_checks,
        reasoning=reasoning,
        model_notes=extraction.extraction_notes,
        model_confidence_score=extraction.email_meta.confidence_score,
        ruleset_version=RULESET_VERSION,
    )
