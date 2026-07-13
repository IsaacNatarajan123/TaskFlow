import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Send } from "lucide-react";
import { T, fontDisplay, cardStyle, btnPrimary, Toast } from "../theme";
import Layout from "../components/Layout";

function getUserId() {
  const token = localStorage.getItem("token");
  if (!token) return null;
  return JSON.parse(atob(token.split(".")[1])).sub;
}

function getMonday(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  return date;
}

function fmt(d) {
  return d.toISOString().split("T")[0];
}

function fmtDisplay(d) {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function LogTime() {
  const [weekStart, setWeekStart] = useState(getMonday(new Date()));
  const [tasks, setTasks] = useState([]);
  const [entries, setEntries] = useState({}); // key: `${taskId}_${date}` -> hours
  const [submission, setSubmission] = useState(null);
  const [toast, setToast] = useState("");
  const [toastType, setToastType] = useState("success");
  const navigate = useNavigate();
  const userId = getUserId();
  const token = localStorage.getItem("token");
  const headers = { authorization: `Bearer ${token}` };

  const weekStartStr = fmt(weekStart);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const showToast = (msg, type = "success") => {
    setToastType(type);
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  useEffect(() => {
    if (!userId) { navigate("/"); return; }
    load();
  }, [weekStartStr]);

  const load = async () => {
    const taskRes = await axios.get("http://localhost:8000/tasks");
    const myTasks = taskRes.data.filter(t => t.created_by === userId && t.status !== "closed");
    setTasks(myTasks);

    const entriesRes = await axios.get(`http://localhost:8000/time-entries?week_start=${weekStartStr}`, { headers });
    const map = {};
    entriesRes.data.forEach(e => { map[`${e.task_id}_${e.date}`] = e; });
    setEntries(map);

    const subRes = await axios.get("http://localhost:8000/submissions/my", { headers });
    const thisWeek = subRes.data.find(s => s.week_start_date === weekStartStr);
    setSubmission(thisWeek || null);
  };

  const isLocked = submission && (submission.status === "submitted" || submission.status === "approved");

  const getHours = (taskId, date) => entries[`${taskId}_${date}`]?.hours ?? "";

  const handleChange = (taskId, date, value) => {
    setEntries(prev => ({ ...prev, [`${taskId}_${date}`]: { ...prev[`${taskId}_${date}`], hours: value } }));
  };

  const handleBlur = async (taskId, date, value) => {
    if (value === "" || isNaN(value)) return;
    const hours = parseFloat(value);
    try {
      const res = await axios.post("http://localhost:8000/time-entries",
        { task_id: taskId, date, hours }, { headers });
      if (res.data.error) {
        showToast(res.data.error, "error");
        load();
        return;
      }
    } catch (err) {
      showToast("Could not save entry", "error");
    }
  };

  const dailyTotal = (date) => {
    return tasks.reduce((sum, t) => sum + (parseFloat(getHours(t._id, date)) || 0), 0);
  };

  const taskTotal = (taskId) => {
    return days.reduce((sum, d) => sum + (parseFloat(getHours(taskId, fmt(d))) || 0), 0);
  };

  const handleSubmitWeek = async () => {
    const res = await axios.post("http://localhost:8000/submissions/submit-week",
      { week_start_date: weekStartStr }, { headers });
    if (res.data.error) {
      showToast(res.data.error, "error");
      return;
    }
    showToast(submission?.status === "returned" ? "Week resubmitted!" : "Week submitted!", "success");
    load();
  };

  const changeWeek = (delta) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + delta * 7);
    setWeekStart(d);
  };

  const statusMeta = {
    submitted: { label: "Submitted", color: T.primary, bg: T.lavender },
    approved: { label: "Approved", color: T.green, bg: "#D1FAE5" },
    returned: { label: "Returned", color: T.coral, bg: "#FEE2E2" },
  };

  return (
    <Layout active="Log Time">
      <div style={{ padding: 32, animation: "fadeIn 0.3s ease" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: T.textPrimary, fontFamily: fontDisplay }}>Log Time</h1>
          {submission && (
            <span style={{
              fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 20,
              color: statusMeta[submission.status]?.color, background: statusMeta[submission.status]?.bg,
            }}>
              {statusMeta[submission.status]?.label}
            </span>
          )}
        </div>

        {submission?.status === "returned" && submission.comments && (
          <div style={{ background: "#FEE2E2", border: "1px solid #FCA5A5", borderRadius: 10, padding: "10px 14px", marginBottom: 16 }}>
            <p style={{ margin: 0, fontSize: 12.5, color: "#991B1B" }}><strong>Manager's comment:</strong> {submission.comments}</p>
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <button onClick={() => changeWeek(-1)} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, width: 32, height: 32, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ChevronLeft size={16} />
          </button>
          <span style={{ fontSize: 13.5, fontWeight: 600, color: T.textSecondary }}>
            {fmtDisplay(days[0])} — {fmtDisplay(days[6])}, {days[6].getFullYear()}
          </span>
          <button onClick={() => changeWeek(1)} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, width: 32, height: 32, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ChevronRight size={16} />
          </button>
        </div>

        {tasks.length === 0 ? (
          <div style={{ ...cardStyle, textAlign: "center", padding: 36 }}>
            <p style={{ color: T.textMuted, fontSize: 13.5, margin: 0 }}>No tasks yet. Create one from My Tasks first.</p>
          </div>
        ) : (
          <div style={{ ...cardStyle, padding: 0, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: T.lavender }}>
                  <th style={{ textAlign: "left", padding: "10px 14px", fontSize: 12, color: T.textSecondary, fontWeight: 700 }}>Task</th>
                  {days.map((d, i) => (
                    <th key={i} style={{ padding: "10px 6px", fontSize: 11.5, color: T.textSecondary, fontWeight: 700, textAlign: "center", width: 60 }}>
                      {DAY_LABELS[i]}<br /><span style={{ fontWeight: 400, color: T.textMuted }}>{d.getDate()}</span>
                    </th>
                  ))}
                  <th style={{ padding: "10px 10px", fontSize: 11.5, color: T.textSecondary, fontWeight: 700, textAlign: "center", width: 50 }}>Tot</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map(t => (
                  <tr key={t._id} style={{ borderTop: `1px solid ${T.border}` }}>
                    <td style={{ padding: "10px 14px", fontSize: 13, color: T.textPrimary, fontWeight: 500 }}>{t.title}</td>
                    {days.map((d, i) => (
                      <td key={i} style={{ padding: "6px", textAlign: "center" }}>
                        <input
                          type="number" min="0" max="24" step="0.5"
                          value={getHours(t._id, fmt(d))}
                          disabled={isLocked}
                          onChange={e => handleChange(t._id, fmt(d), e.target.value)}
                          onBlur={e => handleBlur(t._id, fmt(d), e.target.value)}
                          style={{
                            width: 44, padding: "6px 4px", textAlign: "center", fontSize: 13,
                            border: `1.5px solid ${T.border}`, borderRadius: 6,
                            background: isLocked ? T.bg : "#fff", color: T.textPrimary,
                          }}
                        />
                      </td>
                    ))}
                    <td style={{ padding: "6px 10px", textAlign: "center", fontSize: 13, fontWeight: 700, color: T.primary }}>
                      {taskTotal(t._id) || 0}
                    </td>
                  </tr>
                ))}
                <tr style={{ borderTop: `2px solid ${T.border}`, background: T.bg }}>
                  <td style={{ padding: "10px 14px", fontSize: 12.5, fontWeight: 700, color: T.textSecondary }}>Daily Total</td>
                  {days.map((d, i) => (
                    <td key={i} style={{ padding: "10px 6px", textAlign: "center", fontSize: 12.5, fontWeight: 700, color: dailyTotal(fmt(d)) > 12 ? T.amber : T.textSecondary }}>
                      {dailyTotal(fmt(d)) || 0}
                    </td>
                  ))}
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {!isLocked && tasks.length > 0 && (
          <button onClick={handleSubmitWeek} style={{ ...btnPrimary, width: "auto", padding: "11px 22px", marginTop: 20, display: "flex", alignItems: "center", gap: 8 }}>
            <Send size={15} /> {submission?.status === "returned" ? "Resubmit Week" : "Submit Week"}
          </button>
        )}
      </div>
      <Toast message={toast} type={toastType} onClose={() => setToast("")} />
    </Layout>
  );
}

export default LogTime;