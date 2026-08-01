import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Clock3, ListChecks, UserCircle2, Plus } from "lucide-react";
import { T, fontDisplay, cardStyle, btnPrimary } from "../theme";
import { API_URL } from "../config";

function getUserId() {
  const token = localStorage.getItem("token");
  if (!token) return null;
  return JSON.parse(atob(token.split(".")[1])).sub;
}

function getMonday(d = new Date()) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  return date.toISOString().split("T")[0];
}

function deadlineBadge(deadline, status) {
  if (!deadline || status === "closed") return null;
  const today = new Date().toISOString().split("T")[0];
  const daysLeft = Math.ceil((new Date(deadline) - new Date(today)) / (1000 * 60 * 60 * 24));
  if (daysLeft < 0) return { label: "Overdue", color: "#F87171", bg: "#FEE2E2" };
  if (daysLeft === 0) return { label: "Due today", color: "#EA580C", bg: "#FFEDD5" };
  if (daysLeft <= 3) return { label: `${daysLeft} day${daysLeft === 1 ? "" : "s"} left`, color: "#EA580C", bg: "#FFEDD5" };
  return null;
}

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

// Personal dashboard view — used standalone for employees, and as the "My Work" tab for managers.
function MyWork() {
  const [weekHours, setWeekHours] = useState(0);
  const [activeTasks, setActiveTasks] = useState(0);
  const [managerName, setManagerName] = useState("");
  const [recentTasks, setRecentTasks] = useState([]);
  const [clients, setClients] = useState({});
  const [departments, setDepartments] = useState({});
  const navigate = useNavigate();
  const userId = getUserId();
  const token = localStorage.getItem("token");
  const headers = { authorization: `Bearer ${token}` };

  useEffect(() => { load(); }, []);

  const load = async () => {
    const me = await axios.get(`${API_URL}/auth/me`, { headers });
    setManagerName(me.data.manager_name || "Not assigned");

    const weekStart = getMonday();
    const entries = await axios.get(`${API_URL}/time-entries?week_start=${weekStart}`, { headers });
    setWeekHours(entries.data.reduce((sum, e) => sum + e.hours, 0));

    const [tasks, clientsRes, deptsRes] = await Promise.all([
      axios.get(`${API_URL}/tasks`),
      axios.get(`${API_URL}/clients`),
      axios.get(`${API_URL}/departments`),
    ]);
    const myTasks = tasks.data.filter(t => t.created_by === userId);
    setActiveTasks(myTasks.filter(t => t.status !== "closed").length);
    setRecentTasks(myTasks.slice(-5).reverse());

    const clientMap = {}; clientsRes.data.forEach(c => { clientMap[c._id] = c.client_name; });
    const deptMap = {}; deptsRes.data.forEach(d => { deptMap[d._id] = d.department_name; });
    setClients(clientMap);
    setDepartments(deptMap);
  };

  return (
    <>
      <div style={{ display: "flex", gap: 16, marginBottom: 28 }}>
        <StatCard icon={Clock3} label="Hours This Week" value={weekHours} accent={T.primary} />
        <StatCard icon={ListChecks} label="Active Tasks" value={activeTasks} accent={T.amber} />
        <StatCard icon={UserCircle2} label="Reporting To" value={managerName} accent={T.green} />
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: T.textPrimary, fontFamily: fontDisplay }}>Recent Tasks</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => navigate("/my-tasks")} style={{ ...btnPrimary, width: "auto", padding: "9px 16px", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
            <Plus size={15} /> Create Task
          </button>
          <button onClick={() => navigate("/log-time")} style={{ ...btnPrimary, width: "auto", padding: "9px 16px", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
            <Plus size={15} /> Log Time
          </button>
        </div>
      </div>

      {recentTasks.length === 0 ? (
        <div style={{ ...cardStyle, textAlign: "center", padding: 36 }}>
          <p style={{ color: T.textMuted, fontSize: 13.5, margin: 0 }}>No tasks yet — create one from My Tasks to get started.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {recentTasks.map((t, idx) => (
            <div key={t._id} style={{ ...cardStyle, display: "flex", justifyContent: "space-between", alignItems: "center", animation: `fadeIn 0.3s ease ${idx * 0.05}s backwards` }}>
              <div>
                <p style={{ margin: "0 0 4px", fontSize: 13.5, fontWeight: 600, color: T.textPrimary }}>{t.title}</p>
                <p style={{ margin: 0, fontSize: 11.5, color: T.textMuted }}>
                  {clients[t.client_id] || "—"} · {departments[t.department_id] || "—"} · {t.priority} priority
                </p>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {(() => {
                  const badge = deadlineBadge(t.deadline, t.status);
                  return badge ? (
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: badge.color, background: badge.bg, padding: "3px 10px", borderRadius: 20 }}>{badge.label}</span>
                  ) : null;
                })()}
                <span style={{
                  fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 20,
                  color: t.status === "closed" ? T.textMuted : T.primary,
                  background: t.status === "closed" ? T.border : T.lavender,
                  textTransform: "capitalize",
                }}>
                  {t.status.replace("_", " ")}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

export default MyWork;