from datetime import datetime, timezone
from random import randint, choice
from threading import Lock

import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sklearn.ensemble import IsolationForest

from backend.app.detection import analyze_flow, detect_port_scans


app = FastAPI(title="NETSENTRY", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

lock = Lock()
flows = []
alerts = []

# Synthetic baseline for demonstration only.
rng = np.random.default_rng(42)

baseline = np.column_stack([
    rng.integers(1, 20, 500),
    rng.integers(40, 1500, 500),
    rng.integers(1, 100, 500),
])

model = IsolationForest(
    n_estimators=100,
    contamination=0.05,
    random_state=42,
)

model.fit(baseline)


class ResponseRequest(BaseModel):
    action: str


def create_flow(scenario="normal"):
    source = f"192.168.1.{randint(2, 254)}"

    if scenario == "port_scan":
        source = "10.0.0.99"
        port = randint(1, 65535)
        packets = randint(1, 5)
        byte_count = randint(40, 300)

    elif scenario == "high_volume":
        packets = randint(1500, 4000)
        byte_count = randint(1_000_000, 5_000_000)
        port = choice([80, 443])

    else:
        packets = randint(1, 80)
        byte_count = randint(100, 50_000)
        port = choice([53, 80, 443, 8080])

    return {
        "id": len(flows) + 1,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "source_ip": source,
        "destination_ip": "192.168.1.10",
        "destination_port": port,
        "packets": packets,
        "bytes": byte_count,
        "scenario": scenario,
    }


def analyze(flow):
    """Analyze one flow using rules and supporting ML evidence."""

    features = [[
        flow["packets"],
        flow["bytes"],
        flow["destination_port"],
    ]]

    ml_anomaly = bool(model.predict(features)[0] == -1)

    result = analyze_flow({
        "packets": flow["packets"],
        "bytes": flow["bytes"],
        "duration": flow.get(
            "duration",
            flow.get("duration_seconds", 0),
        ),
        "dst_port": flow["destination_port"],
        "src_ip": flow.get(
            "src_ip",
            flow.get("source_ip", "unknown"),
        ),
        "failed": flow.get("failed", False),
    })

    reasons = list(result.get("reasons", []))
    suspicious = bool(result.get("is_suspicious", False))
    score = int(result.get("score", 0))

    # ML is supporting evidence, not an independent alert trigger.
    if ml_anomaly and suspicious:
        if "Isolation Forest anomaly" not in reasons:
            reasons.append("Isolation Forest anomaly")

    # Explicit rule checks for high-volume synthetic flows.
    if flow["bytes"] >= 1_000_000:
        suspicious = True
        score = max(score, 65)

        if "Elevated byte volume (1 MB or more)" not in reasons:
            reasons.append("Elevated byte volume (1 MB or more)")

    if flow["packets"] >= 1_000:
        suspicious = True
        score = max(score, 65)

        if "Elevated packet count (1,000 or more)" not in reasons:
            reasons.append("Elevated packet count (1,000 or more)")

    # Normalize the score and severity.
    score = max(0, min(100, score))

    if not suspicious:
        score = min(score, 24)
        severity = "low"
    elif score >= 80:
        severity = "critical"
    elif score >= 60:
        severity = "high"
    elif score >= 35:
        severity = "medium"
    else:
        severity = "low"

    return {
        "is_suspicious": suspicious,
        "score": score,
        "severity": severity,
        "reasons": reasons,
        "features": result.get("features", {}),
        "ml_anomaly": ml_anomaly,
    }


def add_flow(scenario="normal"):
    flow = create_flow(scenario)
    result = analyze(flow)

    flow["status"] = (
        "suspicious" if result["is_suspicious"] else "normal"
    )
    flow["reasons"] = result["reasons"]
    flow["risk_score"] = result["score"]
    flow["severity"] = result["severity"]
    flow["detection"] = result

    with lock:
        flows.append(flow)

        if result["is_suspicious"]:
            alerts.insert(0, {
                "id": max(
                    (alert["id"] for alert in alerts),
                    default=0,
                ) + 1,
                "flow_id": flow["id"],
                "source_ip": flow["source_ip"],
                "severity": result["severity"],
                "score": result["score"],
                "title": (
                    result["reasons"][0]
                    if result["reasons"]
                    else "Suspicious activity"
                ),
                "reasons": result["reasons"],
                "status": "open",
                "timestamp": flow["timestamp"],
            })

        del flows[:-200]
        del alerts[100:]

    return flow


@app.on_event("startup")
def seed_data():
    if not flows:
        for _ in range(20):
            add_flow("normal")


@app.get("/")
def root():
    return {
        "name": "NETSENTRY",
        "status": "running",
    }


@app.get("/api/health")
def health():
    return {
        "status": "healthy",
        "model": "IsolationForest + Rules",
    }


@app.get("/api/overview")
def overview():
    with lock:
        return {
            "total_flows": len(flows),
            "suspicious_flows": sum(
                flow["status"] == "suspicious"
                for flow in flows
            ),
            "open_alerts": sum(
                alert["status"] == "open"
                for alert in alerts
            ),
            "normal_flows": sum(
                flow["status"] == "normal"
                for flow in flows
            ),
        }


@app.get("/api/flows")
def get_flows():
    with lock:
        return list(reversed(flows))


@app.get("/api/alerts")
def get_alerts():
    with lock:
        return list(alerts)


@app.post("/api/demo/reset")
def reset_demo():
    with lock:
        flows.clear()
        alerts.clear()

    for _ in range(20):
        add_flow("normal")

    return {
        "message": "Demo data reset",
    }


@app.post("/api/demo/{scenario}")
def run_demo(scenario: str):
    if scenario not in {"normal", "port_scan", "high_volume"}:
        raise HTTPException(
            status_code=400,
            detail="Choose normal, port_scan, or high_volume",
        )

    if scenario != "port_scan":
        return add_flow(scenario)

    generated_flows = [add_flow("port_scan") for _ in range(12)]

    with lock:
        scan_alerts = detect_port_scans(generated_flows)

        for scan in scan_alerts:
            source = scan["source_ip"]
            reason = scan["reason"]

            related_flows = [
                flow for flow in generated_flows
                if str(flow.get("source_ip", flow.get("src_ip", "unknown"))) == source
            ]

            for flow in related_flows:
                flow["status"] = "suspicious"
                flow["risk_score"] = max(flow.get("risk_score", 0), 55)
                flow["severity"] = scan["severity"]
                flow["reasons"] = list(dict.fromkeys(flow.get("reasons", []) + [reason]))

                detection = flow.get("detection", {})
                detection["is_suspicious"] = True
                detection["score"] = flow["risk_score"]
                detection["severity"] = scan["severity"]
                detection["reasons"] = flow["reasons"]
                flow["detection"] = detection

            already_open = any(
                alert.get("type") == scan["type"]
                and alert.get("source_ip") == source
                and alert.get("status") == "open"
                for alert in alerts
            )

            if not already_open:
                alerts.insert(0, {
                    "id": max((a["id"] for a in alerts), default=0) + 1,
                    "flow_id": related_flows[0]["id"] if related_flows else None,
                    "source_ip": source,
                    "severity": scan["severity"],
                    "score": 55,
                    "title": "Possible port scan detected",
                    "reasons": [reason],
                    "status": "open",
                    "timestamp": generated_flows[0]["timestamp"],
                    "type": scan["type"],
                })

    return {
        "scenario": scenario,
        "generated": len(generated_flows),
        "flows": generated_flows,
        "message": "Port scan simulation completed",
    }
@app.post("/api/alerts/{alert_id}/respond")
def respond(alert_id: int, request: ResponseRequest):
    if request.action not in {
        "acknowledge",
        "simulate_block",
    }:
        raise HTTPException(
            status_code=400,
            detail="Unsupported action",
        )

    with lock:
        alert = next(
            (
                item for item in alerts
                if item["id"] == alert_id
            ),
            None,
        )

        if alert is None:
            raise HTTPException(
                status_code=404,
                detail="Alert not found",
            )

        if request.action == "acknowledge":
            alert["status"] = "acknowledged"
            alert["response_note"] = (
                "Alert acknowledged by operator."
            )
        else:
            alert["status"] = "simulated_block"
            alert["response_note"] = (
                "Demo only: no firewall rules or "
                "network traffic were changed."
            )

        return alert


