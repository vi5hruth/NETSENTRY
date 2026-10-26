import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  Shield,
  ShieldAlert,
  Wifi,
  RefreshCw,
  Radar,
  CircleAlert,
  CheckCircle2,
  Play,
  Server,
  Clock3,
  Zap,
} from "lucide-react";

import "./App.css";

// Backend API — make sure FastAPI is running on port 8001.
const API = "http://127.0.0.1:8001";

async function request(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
}

function StatCard({ icon: Icon, label, value, note, color }) {
  return (
    <article className="stat-card">
      <div className="stat-top">
        <span>{label}</span>
        <span className={`stat-icon ${color}`}>
          <Icon size={19} />
        </span>
      </div>

      <div className="stat-value">{value ?? "—"}</div>

      <div className="stat-note">{note}</div>
    </article>
  );
}

export default function App() {
  const [overview, setOverview] = useState(null);
  const [flows, setFlows] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [health, setHealth] = useState("Connecting");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Load dashboard data from the backend.
  const loadData = useCallback(async () => {
    try {
      const [overviewData, flowData, alertData, healthData] =
        await Promise.all([
          request("/api/overview"),
          request("/api/flows"),
          request("/api/alerts"),
          request("/api/health"),
        ]);

      setOverview(overviewData);
      setFlows(Array.isArray(flowData) ? flowData : []);
      setAlerts(Array.isArray(alertData) ? alertData : []);
      setHealth(healthData.status);
      setError("");
    } catch {
      setHealth("Offline");
      setError(
        "Cannot reach backend. Ensure FastAPI is running on port 8001."
      );
    }
  }, []);

  // Refresh the dashboard every four seconds.
  useEffect(() => {
    loadData();

    const timer = setInterval(loadData, 4000);

    return () => clearInterval(timer);
  }, [loadData]);

  // Run a safe, synthetic traffic simulation.
  async function simulate(scenario) {
    setBusy(true);
    setMessage("");
    setError("");

    try {
      const result = await request(`/api/demo/${scenario}`, {
        method: "POST",
      });

      setMessage(
        `${scenario.replace("_", " ").toUpperCase()} simulation complete — ${
          result.status?.toUpperCase() ?? "COMPLETED"
        }`
      );

      await loadData();
    } catch {
      setError("Simulation failed. Check the backend terminal.");
    } finally {
      setBusy(false);
    }
  }

  // Acknowledge an alert or simulate a response.
  async function respond(alertId, action) {
    setError("");
    setMessage("");

    try {
      await request(`/api/alerts/${alertId}/respond`, {
        method: "POST",
        body: JSON.stringify({ action }),
      });

      setMessage(
        action === "simulate_block"
          ? "Response simulated. No real network traffic or firewall rules were changed."
          : "Alert acknowledged."
      );

      await loadData();
    } catch {
      setError("Could not update alert.");
    }
  }

  // Reset the synthetic demonstration data.
  async function resetDemo() {
    const confirmed = window.confirm(
      "Reset all demo flows and alerts?"
    );

    if (!confirmed) return;

    setError("");
    setMessage("");

    try {
      await request("/api/demo/reset", { method: "POST" });

      setMessage("Demo data reset.");

      await loadData();
    } catch {
      setError("Reset failed. Check the backend terminal.");
    }
  }

  const suspicious = overview?.suspicious_flows ?? 0;
  const openAlerts = overview?.open_alerts ?? 0;

  return (
    <div className="app-shell">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <Shield size={25} />
          </div>

          <div>
            <strong>NETSENTRY</strong>
            <small>THREAT INTELLIGENCE</small>
          </div>
        </div>

        <div className="side-label">MONITORING</div>

        <div className="nav-item active">
          <Activity size={18} />
          Overview
        </div>

        <div className="nav-item">
          <Radar size={18} />
          Traffic Analysis
        </div>

        <div className="nav-item">
          <ShieldAlert size={18} />
          Threat Alerts
          <span className="nav-count">{openAlerts}</span>
        </div>

        <div className="side-label">SYSTEM</div>

        <div className="nav-item">
          <Server size={18} />
          Detection Engine
        </div>

        <div className="sidebar-bottom">
          <span
            className={`status-dot ${
              health === "healthy" ? "" : "offline"
            }`}
          />

          <div>
            <strong>Detection engine</strong>
            <small>{health}</small>
          </div>
        </div>
      </aside>

      {/* MAIN DASHBOARD */}
      <main className="main-content">
        {/* HEADER */}
        <header className="topbar">
          <div>
            <div className="eyebrow">
              SECURITY OPERATIONS CENTER / OVERVIEW
            </div>

            <h1>
              Network Security <span>Dashboard</span>
            </h1>

            <p>
              Monitor traffic, investigate anomalies, and review
              simulated threats.
            </p>
          </div>

          <button
            className="button secondary"
            onClick={loadData}
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </header>

        {/* STATUS MESSAGES */}
        {error && (
          <div className="notice error">
            <CircleAlert size={17} />
            {error}
          </div>
        )}

        {message && (
          <div className="notice success">
            <CheckCircle2 size={17} />
            {message}
          </div>
        )}

        {/* SYSTEM STATUS */}
        <section className="system-strip">
          <div>
            <span
              className={`status-dot ${
                health === "healthy" ? "" : "offline"
              }`}
            />
            API STATUS <strong>{health.toUpperCase()}</strong>
          </div>

          <div>
            <Zap size={16} />
            DETECTOR <strong>ISOLATION FOREST + RULES</strong>
          </div>

          <div>
            <Clock3 size={16} />
            REFRESH <strong>4 SECONDS</strong>
          </div>

          <span className="demo-badge">SIMULATION MODE</span>
        </section>

        {/* STATISTICS */}
        <section className="stats-grid">
          <StatCard
            icon={Wifi}
            label="TOTAL FLOWS"
            value={overview?.total_flows}
            note="Recorded demo traffic"
            color="blue"
          />

          <StatCard
            icon={ShieldAlert}
            label="SUSPICIOUS FLOWS"
            value={suspicious}
            note="Flagged by detector"
            color="red"
          />

          <StatCard
            icon={CircleAlert}
            label="OPEN ALERTS"
            value={openAlerts}
            note="Awaiting response"
            color="amber"
          />

          <StatCard
            icon={CheckCircle2}
            label="NORMAL FLOWS"
            value={overview?.normal_flows}
            note="Not flagged"
            color="green"
          />
        </section>

        {/* SIMULATION LAB */}
        <section className="panel simulation-panel">
          <div className="panel-heading">
            <div>
              <div className="eyebrow">
                CONTROLLED TEST ENVIRONMENT
              </div>
              <h2>Threat Simulation Lab</h2>
            </div>

            <span className="demo-badge">SAFE DEMO</span>
          </div>

          <p className="muted">
            Generate synthetic network events to demonstrate
            detection. These actions do not attack real systems.
          </p>

          <div className="simulation-buttons">
            <button
              disabled={busy}
              className="button green-button"
              onClick={() => simulate("normal")}
            >
              <Play size={16} />
              Normal Traffic
            </button>

            <button
              disabled={busy}
              className="button red-button"
              onClick={() => simulate("port_scan")}
            >
              <Radar size={16} />
              Simulate Port Scan
            </button>

            <button
              disabled={busy}
              className="button amber-button"
              onClick={() => simulate("high_volume")}
            >
              <Activity size={16} />
              High-Volume Traffic
            </button>

            <button
              disabled={busy}
              className="button secondary"
              onClick={resetDemo}
            >
              Reset Demo
            </button>
          </div>
        </section>

        {/* SECURITY ALERTS */}
        <section className="panel">
          <div className="panel-heading">
            <div>
              <div className="eyebrow">DETECTION OUTPUT</div>
              <h2>
                Security Alerts{" "}
                <span className="count-pill">{alerts.length}</span>
              </h2>
            </div>
          </div>

          {alerts.length === 0 ? (
            <div className="empty-state">
              <Shield size={25} />
              <p>No alerts yet. Try a simulation above.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>SEVERITY</th>
                    <th>DETECTION</th>
                    <th>SOURCE IP</th>
                    <th>STATUS</th>
                    <th>ACTIONS</th>
                  </tr>
                </thead>

                <tbody>
                  {alerts.slice(0, 12).map((alert) => (
                    <tr key={alert.id}>
                      <td>
                        <span
                          className={`severity ${
                            alert.severity || "low"
                          }`}
                        >
                          {alert.severity || "low"}
                        </span>
                      </td>

                      <td>
                        <strong>{alert.title}</strong>
                        <small className="cell-sub">
                          {(alert.reasons || []).join(" · ")}
                        </small>
                      </td>

                      <td className="ip-cell">
                        {alert.source_ip}
                      </td>

                      <td>
                        <span
                          className={`status-pill ${alert.status}`}
                        >
                          {(alert.status || "unknown").replace(
                            "_",
                            " "
                          )}
                        </span>
                      </td>

                      <td>
                        <div className="row-actions">
                          {alert.status === "open" && (
                            <>
                              <button
                                className="mini-button"
                                onClick={() =>
                                  respond(
                                    alert.id,
                                    "acknowledge"
                                  )
                                }
                              >
                                Acknowledge
                              </button>

                              <button
                                className="mini-button danger-mini"
                                onClick={() =>
                                  respond(
                                    alert.id,
                                    "simulate_block"
                                  )
                                }
                              >
                                Simulate block
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* RECENT TRAFFIC FLOWS */}
        <section className="panel">
          <div className="panel-heading">
            <div>
              <div className="eyebrow">NETWORK TELEMETRY</div>
              <h2>Recent Traffic Flows</h2>
            </div>

            <span className="count-pill">
              {flows.length} records
            </span>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>SOURCE IP</th>
                  <th>DESTINATION</th>
                  <th>PORT</th>
                  <th>PACKETS</th>
                  <th>BYTES</th>
                  <th>RISK SCORE</th>
                  <th>SEVERITY</th>
                  <th>DETECTION</th>
                </tr>
              </thead>

              <tbody>
                {flows.slice(0, 12).map((flow) => {
                  const score = Number(
                    flow.risk_score ??
                    flow.detection?.score ??
                    0
                  );

                  const severity = (
                    flow.severity ??
                    flow.detection?.severity ??
                    "low"
                  ).toLowerCase();

                  const status =
                    flow.status ??
                    (flow.detection?.is_suspicious
                      ? "suspicious"
                      : "normal");

                  return (
                    <tr key={flow.id}>
                      <td className="ip-cell">
                        {flow.source_ip}
                      </td>

                      <td className="ip-cell">
                        {flow.destination_ip}
                      </td>

                      <td>{flow.destination_port}</td>

                      <td>
                        {Number(flow.packets ?? 0).toLocaleString()}
                      </td>

                      <td>
                        {Number(flow.bytes ?? 0).toLocaleString()}
                      </td>

                      <td>
                        <span
                          className={`severity-badge ${severity}`}
                        >
                          {score}/100
                        </span>
                      </td>

                      <td>
                        <span className={`severity ${severity}`}>
                          {severity.toUpperCase()}
                        </span>
                      </td>

                      <td>
                        <span className={`status-pill ${status}`}>
                          {status}
                        </span>
                      </td>
                    </tr>
                  );
                })}

                {flows.length === 0 && (
                  <tr>
                    <td colSpan={8} className="empty-state">
                      No traffic flows yet. Run a simulation above.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* FOOTER */}
        <footer>
          NETSENTRY · Academic prototype · Synthetic traffic only ·
          No real firewall changes
        </footer>
      </main>
    </div>
  );
}