import { useState, useEffect } from "react";
import axios from "axios";
import { BarChart3, Users2, Clock3, ChevronDown, ChevronUp, ChevronRight, Download } from "lucide-react";
import { T, fontDisplay, cardStyle, btnPrimary } from "../theme";
import Layout from "../components/Layout";

function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <div style={{ ...cardStyle, flex: 1, display: "flex", alignItems: "center", gap: 14 }}>
      <div style={{
        width: 44, height: 44, borderRadius: 12, flexShrink: 0,
        background: accent ? `${accent}18` : T.lavender,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Icon size={20} color={accent || T.primary} />
      </div>
      <div>
        <p style={{ margin: 0, fontSize: 21, fontWeight: 800, color: T.textPrimary, fontFamily: fontDisplay }}>{value}</p>
        <p style={{ margin: 0, fontSize: 12, color: T.textMuted }}>{label}</p>
      </div>
    </div>
  );
}
const COLORS = ["#7C3AED", "#10B981", "#F59E0B", "#F87171", "#3B82F6", "#EC4899"];

// Groups flat entries by task+employee combo, summing hours, keeping the daily breakdown nested underneath
function groupByTask(details) {
  const groups = {};
  for (const d of details) {
    const key = `${d.task_title}__${d.employee_name}`;
    if (!groups[key]) {
      groups[key] = {
        task_title: d.task_title,
        task_description: d.task_description,
        department_name: d.department_name,
        priority: d.priority,
        employee_name: d.employee_name,
        total_hours: 0,
        days: [],
      };
    }
    groups[key].total_hours += d.hours;
    groups[key].days.push({ date: d.date, hours: d.hours });
  }
  return Object.values(groups);
}

function getMonthStart() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split("T")[0];
}
function getToday() {
  return new Date().toISOString().split("T")[0];
}

function Reports() {
  const [rows, setRows] = useState([]);
  const [expandedClient, setExpandedClient] = useState(null);
  const [expandedTask, setExpandedTask] = useState(null);
  const [drilldown, setDrilldown] = useState({});
  const [startDate, setStartDate] = useState(getMonthStart());
  const [endDate, setEndDate] = useState(getToday());
  const token = localStorage.getItem("token");

  useEffect(() => {
    loadReport();
  }, [startDate, endDate]);

  const loadReport = () => {
    setDrilldown({});
    setExpandedClient(null);
    axios.get(`http://localhost:8000/reports/company-wide?start_date=${startDate}&end_date=${endDate}`, { headers: { authorization: `Bearer ${token}` } })
      .then(res => setRows(res.data.sort((a, b) => b.total_hours - a.total_hours)));
  };

  const totalHours = rows.reduce((sum, r) => sum + r.total_hours, 0);
  const activeClients = rows.filter(r => r.total_hours > 0).length;
  const avgHours = activeClients ? Math.round(totalHours / activeClients) : 0;
  const maxHours = Math.max(...rows.map(r => r.total_hours), 1);

  const toggleExpandClient = async (client) => {
    if (expandedClient === client.client_id) {
      setExpandedClient(null);
      setExpandedTask(null);
      return;
    }
    setExpandedClient(client.client_id);
    setExpandedTask(null);
    if (!drilldown[client.client_id]) {
      const res = await axios.get(`http://localhost:8000/reports/client/${client.client_id}?start_date=${startDate}&end_date=${endDate}`, { headers: { authorization: `Bearer ${token}` } });
      setDrilldown(prev => ({ ...prev, [client.client_id]: res.data }));
    }
  };

  const handleExport = async () => {
    const res = await axios.get(`http://localhost:8000/reports/company-wide/export?start_date=${startDate}&end_date=${endDate}`, {
      headers: { authorization: `Bearer ${token}` },
      responseType: "blob",
    });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "report.xlsx");
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <Layout active="Reports">
      <div style={{ padding: 32, animation: "fadeIn 0.3s ease" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: T.textPrimary, fontFamily: fontDisplay }}>Reports</h1>
            <p style={{ margin: "4px 0 24px", color: T.textMuted, fontSize: 13.5 }}>Company-wide overview, built from approved submissions only</p>
          </div>
          <button onClick={handleExport} style={{ ...btnPrimary, width: "auto", padding: "9px 16px", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
            <Download size={15} /> Download Report
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <span style={{ fontSize: 12.5, color: T.textSecondary, fontWeight: 600 }}>From</span>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ padding: "7px 10px", borderRadius: 8, border: `1.5px solid ${T.border}`, fontSize: 12.5 }} />
          <span style={{ fontSize: 12.5, color: T.textSecondary, fontWeight: 600 }}>To</span>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ padding: "7px 10px", borderRadius: 8, border: `1.5px solid ${T.border}`, fontSize: 12.5 }} />
        </div>

        <div style={{ display: "flex", gap: 16, marginBottom: 28 }}>
          <StatCard icon={Clock3} label="Total Approved Hours" value={totalHours} accent={T.primary} />
          <StatCard icon={BarChart3} label="Active Clients" value={activeClients} accent={T.amber} />
          <StatCard icon={Users2} label="Avg Hours / Active Client" value={avgHours} accent={T.green} />
        </div>

        {rows.length === 0 ? (
          <div style={{ ...cardStyle, textAlign: "center", padding: 36 }}>
            <p style={{ color: T.textMuted, fontSize: 13.5, margin: 0 }}>No approved data yet.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {rows.map((r, idx) => {
              const isExpanded = expandedClient === r.client_id;
              const details = drilldown[r.client_id] || [];
              const taskGroups = groupByTask(details);

              return (
                <div key={r.client_id} style={{ ...cardStyle, padding: 0, overflow: "hidden" }}>
                  <div
                    onClick={() => toggleExpandClient(r)}
                    style={{ padding: "14px 16px", display: "flex", alignItems: "center", cursor: "pointer" }}
                  >
                    <div style={{ width: 20, marginRight: 8, color: T.textMuted }}>
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: T.textPrimary, width: 180 }}>{r.client_name}</span>
                    <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: T.textPrimary }}>{r.total_hours}h</span>
                    </div>
                    <span style={{ fontSize: 13, color: T.textSecondary, width: 90, textAlign: "right" }}>{r.employee_count} employees</span>
                  </div>

                  {isExpanded && (
                    <div style={{ borderTop: `1px solid ${T.border}`, background: T.bg }}>
                      {taskGroups.length === 0 ? null : (
                        taskGroups.map((g, gi) => {
                          const taskKey = `${r.client_id}__${g.task_title}__${g.employee_name}`;
                          const isTaskExpanded = expandedTask === taskKey;
                          return (
                            <div key={gi} style={{ borderTop: gi > 0 ? `1px solid ${T.border}` : "none" }}>
                              <div
                                onClick={() => setExpandedTask(isTaskExpanded ? null : taskKey)}
                                style={{ padding: "10px 16px 10px 40px", display: "flex", alignItems: "center", cursor: "pointer" }}
                              >
                                <ChevronRight size={13} style={{ marginRight: 8, color: T.textMuted, transform: isTaskExpanded ? "rotate(90deg)" : "none", transition: "transform 0.15s ease" }} />
                                <div style={{ flex: 1 }}>
                                  <span style={{ fontSize: 12.5, fontWeight: 600, color: T.textPrimary }}>{g.task_title}</span>
                                  <span style={{ fontSize: 11.5, color: T.textMuted }}> — {g.department_name} · {g.priority} · {g.employee_name}</span>
                                </div>
                                <span style={{ fontSize: 12.5, fontWeight: 700, color: T.primary }}>{g.total_hours}h</span>
                              </div>

                              {isTaskExpanded && (
                                <div style={{ padding: "0 16px 10px 64px" }}>
                                  {g.task_description && (
                                    <p style={{ fontSize: 11.5, color: T.textMuted, margin: "0 0 6px", fontStyle: "italic" }}>{g.task_description}</p>
                                  )}
                                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                    {g.days.map((day, di) => (
                                      <span key={di} style={{ fontSize: 11, padding: "3px 9px", background: "#fff", border: `1px solid ${T.border}`, borderRadius: 20, color: T.textSecondary }}>
                                        {(() => {
                                          const d = new Date(day.date);
                                          const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                                          return `${d.getDate()} ${months[d.getMonth()]}`;
                                        })()}: <strong style={{ color: T.textPrimary }}>{day.hours}h</strong>
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}

export default Reports;