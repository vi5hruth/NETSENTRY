import pytest

from backend.app.detection import analyze_flow, detect_port_scans


def test_high_volume_flow_is_suspicious():
    flow = {
        "packets": 2000,
        "bytes": 2_000_000,
        "dst_port": 80,
    }

    result = analyze_flow(flow)

    assert result["is_suspicious"] is True
    assert result["score"] > 0
    assert result["severity"] in ("medium", "high")
    assert len(result["reasons"]) > 0


def test_normal_flow_is_not_suspicious():
    flow = {
        "packets": 10,
        "bytes": 5000,
        "dst_port": 443,
        "duration": 10,
        "failed": False,
    }

    result = analyze_flow(flow)

    assert result["is_suspicious"] is False


def test_port_scan_detected():
    flows = [
        {
            "source_ip": "10.0.0.99",
            "destination_port": port,
        }
        for port in range(40000, 40012)
    ]

    results = detect_port_scans(flows)

    assert any(
        result["source_ip"] == "10.0.0.99"
        and result["unique_destination_ports"] == 12
        for result in results
    )


def test_small_number_of_ports_does_not_trigger_scan():
    flows = [
        {
            "source_ip": "10.0.0.50",
            "destination_port": port,
        }
        for port in range(80, 85)
    ]

    results = detect_port_scans(flows)

    assert not any(
        result["source_ip"] == "10.0.0.50"
        for result in results
    )