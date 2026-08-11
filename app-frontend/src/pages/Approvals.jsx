import { useState, useEffect } from "react";
import axios from "axios";
import { CheckCircle2, XCircle, ChevronRight, X } from "lucide-react";
import { T, fontDisplay, cardStyle, btnPrimary, Toast } from "../theme";
import Layout from "../components/Layout";
import { API_URL } from "../config";

const STATUS_META = {
  submitted: { label: "Submitted", color: T.primary, bg: T.lavender },
  approved: { label: "Approved", color: T.green, bg: "#D1FAE5" },
  returned: { label: "Returned", color: T.coral, bg: "#FEE2E2" },
};

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function fmtDisplay(dateStr) {
  const d = new Date(dateStr);
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
}

function weekDates(startStr) {
  const start = new Date(startStr);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d.toISOString().split("T")[0];
  });
}

function Approvals() {
  const [subs, setSubs] = useState([]);
  const [filter, setFilter] = useState("submitted");
  const [selected, setSelected] = useState(null);
  const [entries, setEntries] = useState([]);
  const [tasks, setTasks] = useState({});
  const [clients, setClients] = useState({});
  const [departments, setDepartments] = useState({});
  const [comment, setComment] = useState("");
  const [showReturnBox, setShowReturnBox] = useState(false);
  const [toast, setToast] = useState("");
  const [toastType, setToastType] = useState("success");
  const token = localStorage.getItem("token");
  const headers = { authorization: `Bearer ${token}` };

  const showToast = (msg, type = "success") => {
    setToastType(type);
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  useEffect(() => { load(); }, []);

  const load = async () => {
    const res = await axios.get(`${API_URL}/submissions`, { headers });
    setSubs(res.data);
  };

  const openReview = async (sub) => {
    setSelected(sub);
    setShowReturnBox(false);
    setComment("");

    const [tasksRes, clientsRes, deptsRes, entriesRes] = await Promise.all([
      axios.get(`${API_URL}/tasks`, { headers }),
      axios.get(`${API_URL}/clients`, { headers }),
      axios.get(`${API_URL}/departments`, { headers }),
      axios.get(`${API_URL}/time-entries/by-submission/${sub._id}`, { headers }).catch(() => ({ data: [] })),
    ]);

    const taskMap = {}; tasksRes.data.forEach(t => { taskMap[t._id] = t; });
    const clientMap = {}; clientsRes.data.forEach(c => { clientMap[c._id] = c.client_name; });
    const deptMap = {}; deptsRes.data.forEach(d => { deptMap[d._id] = d.department_name; });
    setTasks(taskMap);
    setClients(clientMap);
    setDepartments(deptMap);
    setEntries(Array.isArray(entriesRes.data) ? entriesRes.data : []);
  };

  const handleApprove = async () => {
    const res = await axios.post(`${API_URL}/submissions/${selected._id}/approve`, {}, { headers });
    if (res.data.error) { showToast(res.data.error, "error"); return; }
    showToast("Submission approved", "success");
    setSelected(null);
    load();
  };

  const handleReturn = async () => {
    if (!comment.trim()) { showToast("A comment is required to return a submission", "error"); return; }
    const res = await axios.post(`${API_URL}/submissions/${selected._id}/return`, { comment }, { headers });
    if (res.data.error) { showToast(res.data.error, "error"); return; }
    showToast("Submission returned", "success");
    setSelected(null);
    load();
  };

  const filtered = subs.filter(s => filter === "all" || s.status === filter);
  const totalHours = entries.reduce((sum, e) => sum + e.hours, 0);

  const taskIds = selected ? [...new Set(entries.map(e => e.task_id))] : [];
  const dates = selected ? weekDates(selected.week_start_date) : [];

  const hoursFor = (taskId, date) => entries.find(e => e.task_id === taskId && e.date === date)?.hours || 0;
  const taskTotal = (taskId) => entries.filter(e => e.task_id === taskId).reduce((sum, e) => sum + e.hours, 0);

  return (
    <Layout active="Approvals">
      <div style={{ padding: 32, animation: "fadeIn 0.3s ease" }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: T.textPrimary, fontFamily: fontDisplay }}>Approvals</h1>
        <p style={{ margin: "4px 0 20px", color: T.textMuted, fontSize: 13.5 }}>Review your team's weekly submissions</p>

        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {["submitted", "approved", "returned", "all"].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: "7px 16px", borderRadius: 20, border: `1.5px solid ${filter === f ? T.primary : T.border}`,
              background: filter === f ? T.lavender : "#fff", color: filter === f ? T.primary : T.textSecondary,
              fontSize: 12.5, fontWeight: 600, cursor: "pointer", textTransform: "capitalize",
            }}>{f}</button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div style={{ ...cardStyle, textAlign: "center", padding: 36 }}>
            <p style={{ color: T.textMuted, fontSize: 13.5, margin: 0 }}>No submissions here.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.map((s, idx) => {
              const meta = STATUS_META[s.status] || STATUS_META.submitted;
              return (
                <div key={s._id} onClick={() => openReview(s)} style={{
                  ...cardStyle, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center",
                  animation: `fadeIn 0.3s ease ${idx * 0.05}s backwards`,
                }}>
                  <div>
                    <p style={{ margin: "0 0 4px", fontSize: 13.5, fontWeight: 700, color: T.textPrimary }}>{s.employee_name}</p>
                    <p style={{ margin: 0, fontSize: 11.5, color: T.textMuted }}>Week of {fmtDisplay(s.week_start_date)}</p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: meta.color, background: meta.bg, padding: "3px 10px", borderRadius: 20 }}>{meta.label}</span>
                    <ChevronRight size={16} color={T.textMuted} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selected && (
        <div onClick={() => setSelected(null)} style={{ position: "fixed", inset: 0, background: "rgba(30,27,46,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ ...cardStyle, width: 680, maxHeight: "85vh", overflowY: "auto", animation: "popIn 0.15s ease", position: "relative" }}>
            <button onClick={() => setSelected(null)} style={{ position: "absolute", top: 18, right: 18, background: "none", border: "none", cursor: "pointer", color: T.textMuted }}><X size={18} /></button>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4, paddingRight: 24 }}>
              <div>
                <h3 style={{ margin: "0 0 4px", fontSize: 17, fontWeight: 800, color: T.textPrimary, fontFamily: fontDisplay }}>{selected.employee_name}</h3>
                <p style={{ margin: 0, fontSize: 12.5, color: T.textMuted }}>Week of {fmtDisplay(selected.week_start_date)}</p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: T.primary, fontFamily: fontDisplay }}>{totalHours}h</p>
                <p style={{ margin: 0, fontSize: 11, color: T.textMuted }}>total hours</p>
              </div>
            </div>

            {taskIds.length === 0 ? (
              <p style={{ fontSize: 13, color: T.textMuted, marginTop: 20 }}>No entries found for this week.</p>
            ) : (
              <div style={{ marginTop: 20, marginBottom: 20, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: T.lavender }}>
                      <th style={{ textAlign: "left", padding: "9px 12px", fontSize: 11.5, color: T.textSecondary, fontWeight: 700 }}>Task</th>
                      {DAY_LABELS.map(d => (
                        <th key={d} style={{ padding: "9px 4px", fontSize: 10.5, color: T.textSecondary, fontWeight: 700, textAlign: "center", width: 38 }}>{d}</th>
                      ))}
                      <th style={{ padding: "9px 8px", fontSize: 10.5, color: T.textSecondary, fontWeight: 700, textAlign: "center", width: 42 }}>Tot</th>
                    </tr>
                  </thead>
                  <tbody>
                    {taskIds.map(taskId => {
                      const t = tasks[taskId];
                      return (
                        <tr key={taskId} style={{ borderTop: `1px solid ${T.border}` }}>
                          <td style={{ padding: "10px 12px" }}>
                            <p style={{ margin: "0 0 2px", fontSize: 12.5, fontWeight: 600, color: T.textPrimary }}>{t?.title || "Unknown task"}</p>
                            <p style={{ margin: 0, fontSize: 10.5, color: T.textMuted }}>
                              {clients[t?.client_id] || "—"} · {departments[t?.department_id] || "—"}
                            </p>
                          </td>
                          {dates.map(d => (
                            <td key={d} style={{ padding: "10px 4px", textAlign: "center", fontSize: 12, color: T.textSecondary }}>
                              {hoursFor(taskId, d) || "–"}
                            </td>
                          ))}
                          <td style={{ padding: "10px 8px", textAlign: "center", fontSize: 12.5, fontWeight: 700, color: T.primary }}>
                            {taskTotal(taskId)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {selected.status === "submitted" && !showReturnBox && (
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setShowReturnBox(true)} style={{ flex: 1, padding: 11, background: "#FEE2E2", color: T.coral, border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                  <XCircle size={15} /> Return
                </button>
                <button onClick={handleApprove} style={{ ...btnPrimary, flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                  <CheckCircle2 size={15} /> Approve
                </button>
              </div>
            )}

            {showReturnBox && (
              <div>
                <textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Explain what needs to change (required)..." rows={3}
                  style={{ width: "100%", padding: 10, borderRadius: 10, border: `1.5px solid ${T.border}`, fontSize: 13, marginBottom: 10, resize: "vertical" }} />
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={() => setShowReturnBox(false)} style={{ flex: 1, padding: 10, background: T.border, border: "none", borderRadius: 10, cursor: "pointer" }}>Cancel</button>
                  <button onClick={handleReturn} style={{ flex: 1, padding: 10, background: T.coral, color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 700 }}>Confirm Return</button>
                </div>
              </div>
            )}

            {selected.status !== "submitted" && (
              <p style={{ fontSize: 12, color: T.textMuted, fontStyle: "italic" }}>
                This submission is {selected.status}
                {selected.status === "returned" && selected.comments ? ` — "${selected.comments}"` : ""}.
              </p>
            )}
          </div>
        </div>
      )}

      <Toast message={toast} type={toastType} onClose={() => setToast("")} />
    </Layout>
  );
}

export default Approvals;