import { useCallback, useEffect, useState } from "react";
import {
  Activity, Shield, ShieldAlert, Wifi, RefreshCw, Radar,
  CircleAlert, CheckCircle2, Play, Server, Clock3, Zap,
  Network, Bell, Search, ChevronRight, Cpu, Database,
  Radio, RotateCcw
} from "lucide-react";
import "./App.css";

const API = "http://127.0.0.1:8001";

async function request(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  return response.json();
}

function Panel({ title, eyebrow, icon: Icon, children, action }) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <div className="panel-title">
          {Icon && <span className="panel-icon"><Icon size={15} /></span>}
          <div>
            {eyebrow && <div className="eyebrow">{eyebrow}</div>}
            <h2>{title}</h2>
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Stat({ label, value, note, icon: Icon, type = "cyan" }) {
  return (
    <article className={`stat-card ${type}`}>
      <div className="stat-top">
        <span>{label}</span>
        <span className="stat-icon"><Icon size={17} /></span>
      </div>
      <div className="stat-value">{value ?? "—"}</div>
      <div className="stat-note"><span className="live-dot" />{note}</div>
      <div className="stat-spark">
        {[24,38,29,48,34,57,42,67,45,72,51,64,44,79,58,86].map((h,i) =>
          <i key={i} style={{height:`${h}%`}} />
        )}
      </div>
    </article>
  );
}

function NetworkMap({ flows }) {
  const suspiciousFlows = flows.filter(f => {
    const status = String(f.status || "").toLowerCase();
    return status.includes("suspicious") ||
      status.includes("anomaly") ||
      f.detection?.is_suspicious === true ||
      f.is_suspicious === true;
  });

  const nodes = [
    {id:"internet",x:48,y:44,label:"INTERNET",kind:"cloud"},
    {id:"gateway",x:245,y:115,label:"GATEWAY",kind:"router"},
    {id:"firewall",x:425,y:115,label:"FIREWALL",kind:"firewall"},
    {id:"core",x:335,y:245,label:"CORE SWITCH",kind:"router"},
    {id:"web",x:105,y:180,label:"WEB-01",kind:"server"},
    {id:"app",x:105,y:290,label:"APP-01",kind:"server"},
    {id:"db",x:545,y:220,label:"DB-01",kind:"database"},
    {id:"vpn",x:545,y:325,label:"VPN NODE",kind:"router"},
    {id:"work1",x:220,y:375,label:"ENDPOINT-01",kind:"endpoint"},
    {id:"work2",x:335,y:405,label:"ENDPOINT-02",kind:"endpoint"},
    {id:"work3",x:445,y:375,label:"ENDPOINT-03",kind:"endpoint"},
  ];

  const edges = [
    ["internet","gateway"],["gateway","firewall"],
    ["firewall","core"],["gateway","web"],["gateway","app"],
    ["web","core"],["app","core"],["core","db"],["core","vpn"],
    ["core","work1"],["core","work2"],["core","work3"],["vpn","work3"],
  ];

  const threatsPresent = suspiciousFlows.length > 0;
  const highlighted = new Set(["gateway","firewall","core","work3"]);

  return (
    <div className={`network-map ${threatsPresent ? "has-threats" : ""}`}>
      <div className="map-legend">
        <span><i className="legend-dot green" /> Healthy</span>
        <span><i className="legend-dot cyan" /> Network</span>
        <span><i className="legend-dot red" /> Threat activity</span>
      </div>

      <svg viewBox="0 0 610 455" role="img"
        aria-label="Illustrative network topology with suspicious activity indicators">
        <defs>
          <pattern id="net-grid" width="25" height="25" patternUnits="userSpaceOnUse">
            <path d="M25 0H0V25" fill="none" stroke="#20334a" strokeWidth=".55" />
          </pattern>
          <filter id="net-glow">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect width="610" height="455" fill="url(#net-grid)" opacity=".7" />

        {edges.map(([a,b],i) => {
          const from = nodes.find(n => n.id === a);
          const to = nodes.find(n => n.id === b);
          const isThreat = threatsPresent &&
            (highlighted.has(a) || highlighted.has(b));

          return (
            <g key={`${a}-${b}`}>
              <line x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                stroke={isThreat ? "#743346" : "#31546a"}
                strokeWidth={isThreat ? 2 : 1.5} />
              <line x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                stroke={isThreat ? "#ff526f" : "#53e5d1"}
                strokeWidth={isThreat ? 2 : .8}
                strokeDasharray={isThreat ? "7 7" : "4 11"}
                opacity={isThreat ? 1 : .7}
                className={isThreat ? "threat-path" : ""}>
                <animate attributeName="stroke-dashoffset"
                  from="30" to="0" dur={`${2 + i % 3}s`}
                  repeatCount="indefinite" />
              </line>
            </g>
          );
        })}

        {threatsPresent && [...highlighted].map(id => {
          const node = nodes.find(n => n.id === id);
          return (
            <g key={`pulse-${id}`} className="threat-overlay">
              <circle cx={node.x} cy={node.y} r="23"
                fill="none" stroke="#ff526f" strokeWidth="2"
                className="threat-pulse" />
              <circle cx={node.x+17} cy={node.y-17} r="7"
                fill="#ff526f" stroke="#391925" strokeWidth="2" />
              <text x={node.x+17} y={node.y-14} textAnchor="middle"
                fontSize="9" fontWeight="800" fill="#fff">!</text>
            </g>
          );
        })}

        {nodes.map(node => {
          const alertNode = threatsPresent && highlighted.has(node.id);
          const color = alertNode ? "#ff7188" :
            node.kind === "firewall" ? "#ffb85c" : "#58e6d2";

          return (
            <g key={node.id} transform={`translate(${node.x},${node.y})`}>
              <circle r="23" fill={color} opacity=".07" />
              <circle r="16" fill="#101e30" stroke={color} strokeWidth="1.5" />

              {node.kind === "cloud" ? (
                <path d="M-10 3 A7 7 0 0 1-7 -7 A9 9 0 0 1 9 -3 A6 6 0 0 1 9 7 H-8 A5 5 0 0 1-10 3Z"
                  fill="none" stroke={color} strokeWidth="1.7" />
              ) : node.kind === "router" ? (
                <g stroke={color} strokeWidth="1.5" fill="none">
                  <path d="M-8 0H8M0-8V8M-5-5L5 5M5-5L-5 5" />
                </g>
              ) : node.kind === "firewall" ? (
                <g stroke={color} strokeWidth="1.5" fill="none">
                  <path d="M-7-9H7V9H-7Z M-7-3H7M-7 3H7M0-9V-3M-4-3V3M3 3V9" />
                </g>
              ) : node.kind === "database" ? (
                <g stroke={color} strokeWidth="1.5" fill="none">
                  <ellipse rx="8" ry="4" cy="-6" />
                  <path d="M-8-6V7C-8 12 8 12 8 7V-6 M-8 0C-8 5 8 5 8 0" />
                </g>
              ) : (
                <g stroke={color} strokeWidth="1.5" fill="none">
                  <rect x="-7" y="-9" width="14" height="18" rx="2" />
                  <path d="M-3-4H3M-3 0H3M-3 4H1" />
                </g>
              )}

              <text y="34" textAnchor="middle" fill="#b7c8dd"
                fontSize="9" fontWeight="600" letterSpacing=".6">
                {node.label}
              </text>
            </g>
          );
        })}

        <text x="20" y="438" fill="#526981" fontSize="9">
          SIMULATED TOPOLOGY · THREAT INDICATORS FROM DETECTION FEED
        </text>
      </svg>

      <div className="map-footer">
        <span><i className="legend-dot green" /> {nodes.length} illustrative nodes</span>
        <span>{edges.length} illustrative connections</span>
        <span className={threatsPresent ? "text-red" : "text-green"}>
          {suspiciousFlows.length} suspicious flows detected
        </span>
      </div>

      <div className="threat-feed">
        <div className="threat-feed-header">
          <div>
            <span className="eyebrow">LIVE DETECTION FEED</span>
            <h3>Suspicious Network Activity</h3>
          </div>
          <span className={`threat-feed-count ${threatsPresent ? "active" : ""}`}>
            {suspiciousFlows.length} EVENTS
          </span>
        </div>

        {suspiciousFlows.length === 0 ? (
          <div className="threat-feed-empty">
            <CheckCircle2 size={16} />
            <span>No suspicious flows currently detected.</span>
          </div>
        ) : (
          <div className="threat-feed-list">
            {suspiciousFlows.slice(0,5).map((flow,index) => {
              const reasons = flow.detection?.reasons || flow.reasons || [];
              return (
                <div role="button" tabIndex={0} className="threat-feed-row threat-feed-row-button" onClick={() => setSelectedFlow(flow)} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedFlow(flow); } }}
                  key={flow.id ?? `${flow.source_ip}-${index}`}>
                  <span className="threat-feed-alert"><ShieldAlert size={15} /></span>
                  <div className="threat-feed-details">
                    <strong>
                      {flow.source_ip || "Unknown source"}
                      <span className="feed-arrow"> → </span>
                      {flow.destination_ip || "Unknown destination"}
                    </strong>
                    <small>
                      {Array.isArray(reasons) && reasons.length
                        ? reasons.join(" · ")
                        : flow.detection?.reason || "Flagged by detection engine"}
                    </small>
                  </div>
                  <span className="severity high">SUSPICIOUS</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [overview,setOverview] = useState(null);
  const [flows,setFlows] = useState([]);
  const [alerts,setAlerts] = useState([]);
  const [health,setHealth] = useState("Connecting");
  const [busy,setBusy] = useState(false);
  const [message,setMessage] = useState("");
  const [error,setError] = useState("");
  const [query,setQuery] = useState("");
  const [lastUpdated,setLastUpdated] = useState(new Date());
  const [selectedFlow,setSelectedFlow] = useState(null);

  const loadData = useCallback(async () => {
    try {
      const [o,f,a,h] = await Promise.all([
        request("/api/overview"),
        request("/api/flows"),
        request("/api/alerts"),
        request("/api/health"),
      ]);
      setOverview(o);
      setFlows(Array.isArray(f) ? f : []);
      setAlerts(Array.isArray(a) ? a : []);
      setHealth(h.status);
      setError("");
      setLastUpdated(new Date());
    } catch {
      setHealth("Offline");
      setError("Cannot reach backend. Start FastAPI on port 8001.");
    }
  },[]);

  useEffect(() => {
    loadData();
    const timer = setInterval(loadData,4000);
    return () => clearInterval(timer);
  },[loadData]);

  async function simulate(scenario) {
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const result = await request(`/api/demo/${scenario}`,{method:"POST"});
      setMessage(`${scenario.replace("_"," ").toUpperCase()} simulation complete — ${result.status?.toUpperCase() ?? "COMPLETED"}`);
      await loadData();
    } catch {
      setError("Simulation failed. Check the backend terminal.");
    } finally {
      setBusy(false);
    }
  }

  async function respond(id,action) {
    try {
      await request(`/api/alerts/${id}/respond`,{
        method:"POST",
        body:JSON.stringify({action}),
      });
      setMessage(action === "simulate_block"
        ? "Response simulated. No actual firewall rules were changed."
        : "Alert acknowledged.");
      await loadData();
    } catch {
      setError("Could not update alert.");
    }
  }

  async function resetDemo() {
    if (!window.confirm("Reset all demo flows and alerts?")) return;
    try {
      await request("/api/demo/reset",{method:"POST"});
      setMessage("Demo data reset.");
      await loadData();
    } catch {
      setError("Reset failed.");
    }
  }

  const suspicious = overview?.suspicious_flows ??
    flows.filter(f => String(f.status || "").toLowerCase().includes("suspicious") ||
      f.detection?.is_suspicious || f.is_suspicious).length;

  const openAlerts = overview?.open_alerts ??
    alerts.filter(a => a.status === "open").length;

  const totalFlows = overview?.total_flows ?? flows.length;
  const normalFlows = Math.max(0,totalFlows-suspicious);

  const filteredFlows = flows.filter(f =>
    `${f.source_ip} ${f.destination_ip} ${f.destination_port} ${f.status}`
      .toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><Shield size={24} /></div>
          <div><strong>NETSENTRY</strong><small>SECURITY INTELLIGENCE</small></div>
        </div>

        <div className="side-label">OPERATIONS</div>
        <div className="nav-item active"><Activity size={17}/> Command Center <span className="nav-count">01</span></div>
        <div className="nav-item"><Network size={17}/> Network Topology</div>
        <div className="nav-item"><ShieldAlert size={17}/> Threat Intelligence <span className="nav-count">{openAlerts}</span></div>
        <div className="nav-item"><Radio size={17}/> Traffic Analysis</div>

        <div className="side-label">INFRASTRUCTURE</div>
        <div className="nav-item"><Server size={17}/> Assets & Endpoints</div>
        <div className="nav-item"><Cpu size={17}/> Detection Engine</div>
        <div className="nav-item"><Database size={17}/> Event Telemetry</div>

        <div className="sidebar-bottom">
          <div className="engine-status">
            <span className={`status-dot ${health === "healthy" ? "" : "offline"}`} />
            <div><strong>API CONNECTION</strong><small>{health.toUpperCase()}</small></div>
          </div>
          <div className="sidebar-version">NETSENTRY <span>v1.0 · DEMO</span></div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <div className="eyebrow">SECURITY OPERATIONS CENTER <ChevronRight size={11}/> OVERVIEW</div>
            <h1>Command <span>Center</span></h1>
            <p>Network visibility, threat detection and incident monitoring.</p>
          </div>
          <div className="top-actions">
            <div className="updated-label"><span className="live-dot"/> AUTO REFRESH <strong>4s</strong></div>
            <button className="button secondary" onClick={loadData}><RefreshCw size={14}/> Refresh</button>
          </div>
        </header>

        <div className="system-strip">
          <div><span className={`status-dot ${health === "healthy" ? "" : "offline"}`}/> PLATFORM <strong>{health.toUpperCase()}</strong></div>
          <div><Zap size={14}/> DETECTION <strong>ISOLATION FOREST + RULES</strong></div>
          <div><Clock3 size={14}/> LAST UPDATE <strong>{lastUpdated.toLocaleTimeString()}</strong></div>
          <span className="demo-badge"><span/> SIMULATION ENVIRONMENT</span>
        </div>

        {error && <div className="notice error"><CircleAlert size={16}/>{error}</div>}
        {message && <div className="notice success"><CheckCircle2 size={16}/>{message}</div>}

        <section className="stats-grid">
          <Stat label="TOTAL TRAFFIC FLOWS" value={totalFlows} note="Records in telemetry feed" icon={Activity}/>
          <Stat label="SUSPICIOUS FLOWS" value={suspicious} note="Flagged by detector" icon={ShieldAlert} type="red"/>
          <Stat label="OPEN INCIDENTS" value={openAlerts} note="Require analyst review" icon={Bell} type="amber"/>
          <Stat label="NORMAL FLOWS" value={normalFlows} note="Not flagged as suspicious" icon={Shield} type="green"/>
        </section>

        <section className="primary-grid">
          <Panel title="Network Topology" eyebrow="INFRASTRUCTURE VISIBILITY" icon={Network}
            action={<span className="count-pill">ILLUSTRATIVE MAP</span>}>
            <NetworkMap flows={flows}/>
          </Panel>

          <div className="right-stack">
            <Panel title="Threat Overview" eyebrow="DETECTION SUMMARY" icon={Radar}>
              <div className="threat-score">
                <div className="score-ring"><div>
                  <strong>{totalFlows ? Math.round(suspicious/totalFlows*100) : 0}%</strong>
                  <small>FLAGGED</small>
                </div></div>
                <div className="score-details">
                  <div><span className="legend-dot red"/> Suspicious <strong>{suspicious}</strong></div>
                  <div><span className="legend-dot green"/> Normal <strong>{normalFlows}</strong></div>
                  <div><span className="legend-dot amber"/> Open alerts <strong>{openAlerts}</strong></div>
                </div>
              </div>
              <div className="mini-metric">
                <div><span>Flow records</span><strong>{totalFlows.toLocaleString()}</strong></div>
                <div className="metric-track"><i style={{width:`${totalFlows ? Math.min(100,suspicious/totalFlows*100) : 0}%`}}/></div>
              </div>
              <div className="mini-metric">
                <div><span>Detection pipeline</span><strong className={health === "healthy" ? "text-green" : "text-red"}>{health === "healthy" ? "ONLINE" : health.toUpperCase()}</strong></div>
                <div className="pipeline"><span/><span/><span/><span/></div>
              </div>
            </Panel>

            <Panel title="Simulation Lab" eyebrow="CONTROLLED TEST SCENARIOS" icon={Zap}>
              <p className="panel-description">Generate synthetic events to test detection and alert workflows.</p>
              <div className="simulation-actions">
                <button className="scenario-button" disabled={busy} onClick={() => simulate("normal")}><Play size={13}/> Normal Traffic</button>
                <button className="scenario-button warning" disabled={busy} onClick={() => simulate("port_scan")}><Radar size={13}/> Port Scan</button>
                <button className="scenario-button danger" disabled={busy} onClick={() => simulate("high_volume")}><Activity size={13}/> High Volume</button>
                <button className="scenario-button reset" disabled={busy} onClick={resetDemo}><RotateCcw size={13}/> Reset Demo</button>
              </div>
              {busy && <div className="working"><span className="live-dot"/> Processing simulation…</div>}
            </Panel>
          </div>
        </section>

        <Panel title="Incident Queue" eyebrow="SECURITY EVENTS" icon={ShieldAlert}
          action={<span className="count-pill">{openAlerts} OPEN</span>}>
          {alerts.length === 0 ? (
            <div className="empty-state"><Shield size={23}/><p>No alerts in the feed. Run a simulation to generate test events.</p></div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>SEVERITY</th><th>DETECTION EVENT</th><th>SOURCE ADDRESS</th><th>STATUS</th><th>RESPONSE</th></tr></thead>
                <tbody>
                  {alerts.slice(0,8).map(alert => (
                    <tr key={alert.id}>
                      <td><span className={`severity ${String(alert.severity || "low").toLowerCase()}`}>{String(alert.severity || "low").toUpperCase()}</span></td>
                      <td><strong>{alert.title || "Suspicious activity"}</strong><small className="cell-sub">{(alert.reasons || []).join(" · ")}</small></td>
                      <td className="ip-cell">{alert.source_ip || "—"}</td>
                      <td><span className={`status-pill ${alert.status}`}>{String(alert.status || "unknown").replace("_"," ")}</span></td>
                      <td><div className="row-actions">
                        {alert.status === "open" && <>
                          <button className="mini-button" onClick={() => respond(alert.id,"acknowledge")}>Acknowledge</button>
                          <button className="mini-button danger-mini" onClick={() => respond(alert.id,"simulate_block")}>Simulate Block</button>
                        </>}
                      </div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel title="Network Telemetry" eyebrow="FLOW EXPLORER" icon={Radio}
          action={<label className="search-box"><Search size={14}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Filter IP, port, status..."/></label>}>
          <div className="table-wrap">
            <table>
              <thead><tr><th>SOURCE ADDRESS</th><th>DESTINATION</th><th>PORT</th><th>PACKETS</th><th>BYTES</th><th>RISK SCORE</th><th>SEVERITY</th><th>STATUS</th></tr></thead>
              <tbody>
                {filteredFlows.slice(0,10).map((flow,i) => {
                  const score = Number(flow.risk_score ?? flow.detection?.score ?? 0);
                  const severity = String(flow.severity ?? flow.detection?.severity ?? "low").toLowerCase();
                  const status = flow.status ?? (flow.detection?.is_suspicious ? "suspicious" : "normal");
                  return (
                    <tr key={flow.id ?? i} className="flow-row-clickable" onClick={() => setSelectedFlow(flow)} title="Click to investigate this flow">
                      <td className="ip-cell">{flow.source_ip || "—"}</td>
                      <td className="ip-cell">{flow.destination_ip || "—"}</td>
                      <td>{flow.destination_port ?? "—"}</td>
                      <td>{Number(flow.packets ?? 0).toLocaleString()}</td>
                      <td>{Number(flow.bytes ?? 0).toLocaleString()}</td>
                      <td><span className={`severity-badge ${severity}`}>{score}/100</span></td>
                      <td><span className={`severity ${severity}`}>{severity.toUpperCase()}</span></td>
                      <td><span className={`status-pill ${status}`}>{status}</span></td>
                    </tr>
                  );
                })}
                {filteredFlows.length === 0 && <tr><td colSpan={8} className="empty-state">No matching flows found.</td></tr>}
              </tbody>
            </table>
          </div>
        </Panel>

        {selectedFlow && (
          <section className="panel investigation-panel" aria-label="Threat investigation">
            <div className="panel-heading">
              <div className="panel-title">
                <span className="panel-icon"><ShieldAlert size={16}/></span>
                <div>
                  <div className="eyebrow">FLOW ANALYSIS</div>
                  <h2>THREAT INVESTIGATION</h2>
                </div>
              </div>
              <button className="button secondary" onClick={() => setSelectedFlow(null)}>
                Close ?
              </button>
            </div>

            <div className="investigation-banner">
              <ShieldAlert size={20}/>
              <div>
                <strong>{String(selectedFlow.status || "unknown").toUpperCase()}</strong>
                <p>{selectedFlow.source_ip || "Unknown source"} ? {selectedFlow.destination_ip || "Unknown destination"}</p>
              </div>
              <span className={`severity ${String(selectedFlow.severity ?? selectedFlow.detection?.severity ?? "low").toLowerCase()}`}>
                {String(selectedFlow.severity ?? selectedFlow.detection?.severity ?? "LOW").toUpperCase()}
              </span>
            </div>

            <div className="investigation-grid">
              <div><small>SOURCE IP</small><strong>{selectedFlow.source_ip || "?"}</strong></div>
              <div><small>DESTINATION IP</small><strong>{selectedFlow.destination_ip || "?"}</strong></div>
              <div><small>DESTINATION PORT</small><strong>{selectedFlow.destination_port ?? "?"}</strong></div>
              <div><small>RISK SCORE</small><strong>{Number(selectedFlow.risk_score ?? selectedFlow.detection?.score ?? 0)}/100</strong></div>
              <div><small>PACKETS</small><strong>{Number(selectedFlow.packets ?? 0).toLocaleString()}</strong></div>
              <div><small>BYTES</small><strong>{Number(selectedFlow.bytes ?? 0).toLocaleString()}</strong></div>
            </div>

            <div className="investigation-reason">
              <span className="eyebrow">DETECTION EVIDENCE</span>
              <p>{[
                ...(Array.isArray(selectedFlow.detection?.reasons) ? selectedFlow.detection.reasons : []),
                ...(Array.isArray(selectedFlow.reasons) ? selectedFlow.reasons : [])
              ].filter(Boolean).filter((v,i,a) => a.indexOf(v) === i).join(" ? ")
                || selectedFlow.detection?.reason
                || "No specific detection reason was supplied for this flow."}</p>
              <small>Review this evidence before taking action. This dashboard uses simulated traffic.</small>
            </div>
          </section>
        )}

        <footer>
          <span>NETSENTRY <b>SECURITY INTELLIGENCE</b></span>
          <span>ACADEMIC PROTOTYPE · SYNTHETIC TRAFFIC ONLY · NO REAL FIREWALL CHANGES</span>
        </footer>
      </main>
    </div>
  );
}
