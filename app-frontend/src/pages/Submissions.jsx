import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { FileCheck2, Clock3, XCircle, ChevronDown, ChevronUp } from "lucide-react";
import { T, fontDisplay, cardStyle } from "../theme";
import Layout from "../components/Layout";
import { API_URL } from "../config";

function getUserId() {
  const token = localStorage.getItem("token");
  if (!token) return null;
  return JSON.parse(atob(token.split(".")[1])).sub;
}

function fmtDisplay(dateStr) {
  const d = new Date(dateStr);
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
}

function shortDate(dateStr) {
  const d = new Date(dateStr);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${d.getDate()} ${months[d.getMonth()]}`;
}

function weekEnd(startStr) {
  const d = new Date(startStr);
  d.setDate(d.getDate() + 6);
  return d;
}

const STATUS_META = {
  submitted: { label: "Submitted", color: T.primary, bg: T.lavender, icon: Clock3 },
  approved: { label: "Approved", color: T.green, bg: "#D1FAE5", icon: FileCheck2 },
  returned: { label: "Returned", color: T.coral, bg: "#FEE2E2", icon: XCircle },
};

function groupByTask(entryList, tasks, clients, departments) {
  const groups = {};
  for (const e of entryList) {
    if (!groups[e.task_id]) {
      const t = tasks[e.task_id];
      groups[e.task_id] = {
        task_title: t?.title || "Unknown",
        client_name: clients[t?.client_id] || "—",
        department_name: departments[t?.department_id] || "—",
        total_hours: 0,
        days: [],
      };
    }
    groups[e.task_id].total_hours += e.hours;
    groups[e.task_id].days.push({ date: e.date, hours: e.hours });
  }
  return Object.values(groups);
}

function Submissions() {
  const [subs, setSubs] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [expandedTask, setExpandedTask] = useState(null);
  const [details, setDetails] = useState({});
  const [tasks, setTasks] = useState({});
  const [clients, setClients] = useState({});
  const [departments, setDepartments] = useState({});
  const navigate = useNavigate();
  const userId = getUserId();
  const token = localStorage.getItem("token");
  const headers = { authorization: `Bearer ${token}` };

  useEffect(() => {
    if (!userId) { navigate("/"); return; }
    load();
  }, []);

  const load = async () => {
    const [subsRes, tasksRes, clientsRes, deptsRes] = await Promise.all([
      axios.get(`${API_URL}/submissions/my`, { headers }),
      axios.get(`${API_URL}/tasks`, { headers }),
      axios.get(`${API_URL}/clients`, { headers }),
      axios.get(`${API_URL}/departments`, { headers }),
    ]);
    const sorted = subsRes.data.sort((a, b) => b.week_start_date.localeCompare(a.week_start_date));
    setSubs(sorted);
    const taskMap = {}; tasksRes.data.forEach(t => { taskMap[t._id] = t; });
    const clientMap = {}; clientsRes.data.forEach(c => { clientMap[c._id] = c.client_name; });
    const deptMap = {}; deptsRes.data.forEach(d => { deptMap[d._id] = d.department_name; });
    setTasks(taskMap);
    setClients(clientMap);
    setDepartments(deptMap);
  };

  const toggleExpand = async (sub) => {
    if (expanded === sub._id) {
      setExpanded(null);
      setExpandedTask(null);
      return;
    }
    setExpanded(sub._id);
    setExpandedTask(null);
    if (!details[sub._id]) {
      const res = await axios.get(`${API_URL}/time-entries/by-submission/${sub._id}`, { headers }).catch(() => ({ data: [] }));
      setDetails(prev => ({ ...prev, [sub._id]: Array.isArray(res.data) ? res.data : [] }));
    }
  };

  return (
    <Layout active="Submissions">
      <div style={{ padding: 32, animation: "fadeIn 0.3s ease" }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: T.textPrimary, fontFamily: fontDisplay }}>Submissions</h1>
        <p style={{ margin: "4px 0 24px", color: T.textMuted, fontSize: 13.5 }}>Your weekly submission history</p>

        {subs.length === 0 ? (
          <div style={{ ...cardStyle, textAlign: "center", padding: 36 }}>
            <p style={{ color: T.textMuted, fontSize: 13.5, margin: 0 }}>No submissions yet. Log time and submit a week to see it here.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {subs.map((s, idx) => {
              const meta = STATUS_META[s.status] || STATUS_META.submitted;
              const Icon = meta.icon;
              const isExpanded = expanded === s._id;
              const entryList = details[s._id] || [];
              const taskGroups = groupByTask(entryList, tasks, clients, departments);
              const entryTotal = entryList.reduce((sum, e) => sum + e.hours, 0);

              return (
                <div key={s._id} style={{ ...cardStyle, padding: 0, overflow: "hidden", animation: `fadeIn 0.3s ease ${idx * 0.05}s backwards` }}>
                  <div onClick={() => toggleExpand(s)} style={{ padding: 18, display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 38, height: 38, borderRadius: 10, background: meta.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Icon size={17} color={meta.color} />
                      </div>
                      <div>
                        <p style={{ margin: "0 0 2px", fontSize: 13.5, fontWeight: 700, color: T.textPrimary }}>
                          {fmtDisplay(s.week_start_date)} — {fmtDisplay(weekEnd(s.week_start_date))}
                        </p>
                        <p style={{ margin: 0, fontSize: 11.5, color: T.textMuted }}>
                          {isExpanded ? `${entryTotal}h total` : `Submitted ${new Date(s.submitted_at).toLocaleDateString()}`}
                        </p>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 11.5, fontWeight: 700, color: meta.color, background: meta.bg, padding: "4px 12px", borderRadius: 20 }}>
                        {meta.label}
                      </span>
                      {isExpanded ? <ChevronUp size={16} color={T.textMuted} /> : <ChevronDown size={16} color={T.textMuted} />}
                    </div>
                  </div>

                  {s.status === "returned" && s.comments && (
                    <div style={{ margin: "0 18px 14px", padding: "10px 14px", background: "#FEF2F2", borderRadius: 8, borderLeft: `3px solid ${T.coral}` }}>
                      <p style={{ margin: 0, fontSize: 12.5, color: "#991B1B" }}><strong>Manager's comment:</strong> {s.comments}</p>
                    </div>
                  )}

                  {isExpanded && (
                    <div style={{ borderTop: `1px solid ${T.border}`, background: T.bg }}>
                      {taskGroups.length === 0 ? null : (
                        taskGroups.map((g, gi) => {
                          const taskKey = `${s._id}__${g.task_title}`;
                          const isTaskExpanded = expandedTask === taskKey;
                          return (
                            <div key={gi} style={{ borderTop: gi > 0 ? `1px solid ${T.border}` : "none" }}>
                              <div
                                onClick={() => setExpandedTask(isTaskExpanded ? null : taskKey)}
                                style={{ padding: "10px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}
                              >
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                  {isTaskExpanded ? <ChevronUp size={13} color={T.textMuted} /> : <ChevronDown size={13} color={T.textMuted} />}
                                  <div>
                                    <span style={{ fontSize: 12.5, fontWeight: 600, color: T.textPrimary }}>{g.task_title}</span>
                                    <span style={{ fontSize: 11.5, color: T.textMuted }}> — {g.client_name} · {g.department_name}</span>
                                  </div>
                                </div>
                                <span style={{ fontSize: 12.5, fontWeight: 700, color: T.primary }}>{g.total_hours}h</span>
                              </div>
                              {isTaskExpanded && (
                                <div style={{ padding: "0 18px 10px", display: "flex", flexWrap: "wrap", gap: 6 }}>
                                  {g.days.map((day, di) => (
                                    <span key={di} style={{ fontSize: 11, padding: "3px 9px", background: "#fff", border: `1px solid ${T.border}`, borderRadius: 20, color: T.textSecondary }}>
                                      {shortDate(day.date)}: <strong style={{ color: T.textPrimary }}>{day.hours}h</strong>
                                    </span>
                                  ))}
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

export default Submissions;