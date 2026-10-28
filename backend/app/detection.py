"""
NETSENTRY feature-based detection engine.

Designed for synthetic/demo traffic.
Does not capture live network traffic.
"""

from collections import defaultdict
from typing import Any


def _number(
    flow: dict[str, Any],
    *keys: str,
    default: float = 0,
) -> float:
    """Read a numeric feature, accepting common field-name variations."""
    for key in keys:
        value = flow.get(key)
        if value is not None:
            try:
                return max(0.0, float(value))
            except (TypeError, ValueError):
                pass
    return default


def analyze_flow(flow: dict[str, Any]) -> dict[str, Any]:
    """Assess one flow using explainable feature-based rules."""

    packets = _number(
        flow, "packets", "packet_count", "total_packets"
    )
    byte_count = _number(
        flow, "bytes", "byte_count", "total_bytes"
    )
    duration = _number(
        flow, "duration", "duration_seconds", "flow_duration"
    )
    dst_port = int(
        _number(flow, "dst_port", "destination_port", "dest_port")
    )
    failed = bool(
        flow.get("failed", flow.get("connection_failed", False))
    )

    score = 0
    reasons: list[str] = []

    # High byte volume.
    if byte_count >= 5_000_000:
        score += 35
        reasons.append("Very high byte volume (5 MB or more)")
    elif byte_count >= 1_000_000:
        score += 20
        reasons.append("Elevated byte volume (1 MB or more)")

    # High packet count.
    if packets >= 5_000:
        score += 30
        reasons.append("Very high packet count (5,000 or more)")
    elif packets >= 1_000:
        score += 15
        reasons.append("Elevated packet count (1,000 or more)")

    # High packet rate.
    if duration > 0 and packets / duration >= 1_000:
        score += 20
        reasons.append("Unusually high packet rate")

    # Ports that may warrant review.
    if dst_port in {23, 2323, 3389, 4444, 5555, 6667}:
        score += 10
        reasons.append(
            f"Connection uses a port worth reviewing ({dst_port})"
        )

    if failed:
        score += 15
        reasons.append("Connection marked as failed")

    score = min(score, 100)

    if score >= 70:
        severity = "critical"
    elif score >= 45:
        severity = "high"
    elif score >= 20:
        severity = "medium"
    else:
        severity = "low"

    return {
        "is_suspicious": score >= 20,
        "score": score,
        "severity": severity,
        "reasons": reasons or [
            "No individual-flow rule triggered; multi-flow analysis detected suspicious activity."
        ],
        "features": {
            "packets": packets,
            "bytes": byte_count,
            "duration_seconds": duration,
            "destination_port": dst_port,
            "failed": failed,
        },
    }


def detect_port_scans(
    flows: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """
    Identify sources contacting at least 10 distinct destination
    ports among the supplied flow records.
    """

    ports_by_source: dict[str, set[int]] = defaultdict(set)

    for flow in flows:
        source = str(
            flow.get("src_ip", flow.get("source_ip", "unknown"))
        )
        port = int(
            _number(
                flow,
                "dst_port",
                "destination_port",
                "dest_port",
            )
        )

        if port > 0:
            ports_by_source[source].add(port)

    detected_scans = []

    for source, ports in ports_by_source.items():
        if len(ports) >= 10:
            detected_scans.append({
                "type": "possible_port_scan",
                "source_ip": source,
                "unique_destination_ports": len(ports),
                "severity": (
                    "critical" if len(ports) >= 30
                    else "high" if len(ports) >= 20
                    else "medium"
                ),
                "reason": (
                    f"Source contacted {len(ports)} distinct "
                    "destination ports"
                ),
            })

    return detected_scans