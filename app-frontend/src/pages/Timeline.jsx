import { useState, useEffect } from "react";
import axios from "axios";
import { ChevronDown, ChevronUp, Calendar } from "lucide-react";
import { T, fontDisplay, cardStyle } from "../theme";
import Layout from "../components/Layout";
import { API_URL } from "../config";

const PRIORITY_COLORS = { Low: "#3B82F6", Medium: "#7C3AED", High: "#F59E0B", Urgent: "#F87171" };

function daysBetween(a, b) {
  return Math.round((new Date(b) - new Date(a)) / (1000 * 60 * 60 * 24));
}

function fmtShort(dateStr) {
  const d = new Date(dateStr);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${d.getDate()} ${months[d.getMonth()]}`;
}

function Timeline() {
  const [view, setView] = useState("personal");
  const [isManager, setIsManager] = useState(false);
  const [scheduled, setScheduled] = useState([]);
  const [unscheduled, setUnscheduled] = useState([]);
  const [showUnscheduled, setShowUnscheduled] = useState(true);
  const [editingDates, setEditingDates] = useState(null);
  const [dateForm, setDateForm] = useState({ start_date: "", deadline: "" });
  const token = localStorage.getItem("token");
  const headers = { authorization: `Bearer ${token}` };

  useEffect(() => {
    checkManagerStatus();
    load("personal");
  }, []);

  const checkManagerStatus = async () => {
    const userId = JSON.parse(atob(token.split(".")[1])).sub;
    const res = await axios.get(`${API_URL}/users`, { headers });
    const hasReports = res.data.some(u => u.manager_id === userId);
    setIsManager(hasReports);
  };

  const load = async (v) => {
    const endpoint = v === "team" ? "team-timeline" : "timeline";
    const res = await axios.get(`${API_URL}/tasks/${endpoint}`, { headers });
    setScheduled(res.data.scheduled || []);
    setUnscheduled(res.data.unscheduled || []);
  };

  const switchView = (v) => {
    setView(v);
    load(v);
  };

  const saveDates = async (taskId) => {
    await axios.patch(`${API_URL}/tasks/${taskId}`, dateForm, { headers });
    setEditingDates(null);
    setDateForm({ start_date: "", deadline: "" });
    load(view);
  };

  // Compute overall date range from scheduled tasks, with a little padding
  let rangeStart = new Date();
  let rangeEnd = new Date();
  rangeEnd.setDate(rangeEnd.getDate() + 14);
  if (scheduled.length > 0) {
    const starts = scheduled.map(t => new Date(t.start_date));
    const ends = scheduled.map(t => new Date(t.deadline));
    rangeStart = new Date(Math.min(...starts));
    rangeEnd = new Date(Math.max(...ends));
    rangeStart.setDate(rangeStart.getDate() - 2);
    rangeEnd.setDate(rangeEnd.getDate() + 2);
  }
  const totalDays = Math.max(daysBetween(rangeStart, rangeEnd), 1);

  const pctFor = (dateStr) => (daysBetween(rangeStart, dateStr) / totalDays) * 100;

  const barStyle = (task) => {
    const offset = daysBetween(rangeStart, task.start_date);
    const duration = Math.max(daysBetween(task.start_date, task.deadline), 1);
    return {
      left: `${(offset / totalDays) * 100}%`,
      width: `${(duration / totalDays) * 100}%`,
    };
  };

  const todayStr = new Date().toISOString().split("T")[0];
  const todayOffset = pctFor(todayStr);

  // Build week markers across the ruler for readability
  const weekMarkers = [];
  let cursor = new Date(rangeStart);
  cursor.setDate(cursor.getDate() - cursor.getDay() + 1); // snap to nearest Monday
  while (cursor <= rangeEnd) {
    weekMarkers.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 7);
  }

  return (
    <Layout active="Timeline">
      <div style={{ padding: 32, animation: "fadeIn 0.3s ease" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: T.textPrimary, fontFamily: fontDisplay }}>Timeline</h1>
          {isManager && (
            <div style={{ display: "flex", gap: 4, background: T.lavender, padding: 4, borderRadius: 10 }}>
              <button onClick={() => switchView("personal")} style={{
                padding: "7px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12.5, fontWeight: 700,
                background: view === "personal" ? "#fff" : "transparent", color: view === "personal" ? T.primary : T.textMuted,
              }}>My Timeline</button>
              <button onClick={() => switchView("team")} style={{
                padding: "7px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12.5, fontWeight: 700,
                background: view === "team" ? "#fff" : "transparent", color: view === "team" ? T.primary : T.textMuted,
              }}>Team Timeline</button>
            </div>
          )}
        </div>
        <p style={{ margin: "4px 0 16px", color: T.textMuted, fontSize: 13.5 }}>
          Each bar shows when a task is scheduled — from its start date to its deadline.
        </p>

        {/* Legend */}
        <div style={{ display: "flex", gap: 16, marginBottom: 20, alignItems: "center", flexWrap: "wrap" }}>
          {Object.entries(PRIORITY_COLORS).map(([label, color]) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: 3, background: color }} />
              <span style={{ fontSize: 11.5, color: T.textSecondary }}>{label} priority</span>
            </div>
          ))}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 2, height: 12, background: T.coral }} />
            <span style={{ fontSize: 11.5, color: T.textSecondary }}>Today</span>
          </div>
        </div>

        {scheduled.length === 0 ? (
          <div style={{ ...cardStyle, textAlign: "center", padding: 36, marginBottom: 20 }}>
            <p style={{ color: T.textMuted, fontSize: 13.5, margin: 0 }}>No scheduled tasks to show yet.</p>
          </div>
        ) : (
          <div style={{ ...cardStyle, padding: "20px 24px 24px", marginBottom: 20, position: "relative", overflow: "hidden" }}>

            {/* Today label row — its own dedicated row, above the ruler, so it never overlaps date text */}
            <div style={{ position: "relative", height: 16, marginBottom: 4 }}>
              {todayOffset >= 0 && todayOffset <= 100 && (
                <div style={{ position: "absolute", left: `${todayOffset}%`, transform: "translateX(-50%)", fontSize: 10, fontWeight: 700, color: T.coral, whiteSpace: "nowrap" }}>
                  ▼ Today
                </div>
              )}
            </div>

            {/* Date ruler */}
            <div style={{ position: "relative", height: 20, marginBottom: 12, borderBottom: `1px solid ${T.border}` }}>
              {weekMarkers.map((d, i) => {
                const pct = pctFor(d.toISOString());
                if (pct < 0 || pct > 100) return null;
                return (
                  <div key={i} style={{ position: "absolute", left: `${pct}%`, top: 0, transform: "translateX(-50%)" }}>
                    <span style={{ fontSize: 10.5, color: T.textMuted, fontWeight: 600, whiteSpace: "nowrap" }}>{fmtShort(d.toISOString())}</span>
                  </div>
                );
              })}
            </div>

            {/* Today marker line — only the vertical line now, spanning through the bars below */}
            {todayOffset >= 0 && todayOffset <= 100 && (
              <div style={{ position: "absolute", top: 40, bottom: 20, left: `${todayOffset}%`, width: 2, background: T.coral, zIndex: 1 }} />
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 18, marginTop: 16 }}>
              {scheduled.map(task => (
                <div key={task._id}>
                  <p style={{ margin: "0 0 4px", fontSize: 12.5, fontWeight: 600, color: T.textPrimary }}>
                    {task.title}{task.owner_name ? ` — ${task.owner_name}` : ""}
                  </p>
                  <div style={{ position: "relative", height: 24, background: T.bg, borderRadius: 6 }}>
                    <div style={{
                      position: "absolute", height: "100%", borderRadius: 6,
                      background: PRIORITY_COLORS[task.priority] || T.primary,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      minWidth: 30,
                      ...barStyle(task),
                    }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
                    <span style={{ fontSize: 10.5, color: T.textMuted }}>{fmtShort(task.start_date)}</span>
                    <span style={{ fontSize: 10.5, color: T.textMuted }}>
                      {daysBetween(task.start_date, task.deadline)} day{daysBetween(task.start_date, task.deadline) === 1 ? "" : "s"}
                    </span>
                    <span style={{ fontSize: 10.5, color: T.textMuted }}>{fmtShort(task.deadline)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ ...cardStyle, padding: 0, overflow: "hidden" }}>
          <div onClick={() => setShowUnscheduled(!showUnscheduled)} style={{ padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}>
            <div>
              <span style={{ fontSize: 13.5, fontWeight: 700, color: T.textPrimary }}>Unscheduled ({unscheduled.length})</span>
              <p style={{ margin: "2px 0 0", fontSize: 11, color: T.textMuted }}>Tasks with no start date or deadline set — some, like recurring meetings, may not need one.</p>
            </div>
            {showUnscheduled ? <ChevronUp size={16} color={T.textMuted} /> : <ChevronDown size={16} color={T.textMuted} />}
          </div>
          {showUnscheduled && (
            <div style={{ borderTop: `1px solid ${T.border}` }}>
              {unscheduled.length === 0 ? (
                <p style={{ padding: "14px 20px", fontSize: 12.5, color: T.textMuted, margin: 0 }}>Nothing here.</p>
              ) : (
                unscheduled.map(task => (
                  <div key={task._id} style={{ padding: "12px 20px", borderTop: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: T.textPrimary }}>{task.title}</span>
                      {task.owner_name && <span style={{ fontSize: 11.5, color: T.textMuted }}> — {task.owner_name}</span>}
                    </div>
                    {editingDates === task._id ? (
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <input type="date" value={dateForm.start_date} onChange={e => setDateForm({ ...dateForm, start_date: e.target.value })} style={{ padding: "5px 8px", borderRadius: 6, border: `1px solid ${T.border}`, fontSize: 11.5 }} />
                        <input type="date" value={dateForm.deadline} onChange={e => setDateForm({ ...dateForm, deadline: e.target.value })} style={{ padding: "5px 8px", borderRadius: 6, border: `1px solid ${T.border}`, fontSize: 11.5 }} />
                        <button onClick={() => saveDates(task._id)} style={{ background: T.primary, color: "#fff", border: "none", borderRadius: 6, padding: "5px 10px", fontSize: 11.5, cursor: "pointer" }}>Save</button>
                      </div>
                    ) : (
                      <button onClick={() => setEditingDates(task._id)} style={{ background: "none", border: `1px solid ${T.border}`, borderRadius: 6, padding: "5px 10px", fontSize: 11.5, cursor: "pointer", color: T.textSecondary, display: "flex", alignItems: "center", gap: 4 }}>
                        <Calendar size={12} /> Add dates
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

export default Timeline;