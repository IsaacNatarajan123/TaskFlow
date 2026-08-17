import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Users2, FileClock, ListChecks, X } from "lucide-react";
import { T, fontDisplay, cardStyle, Avatar } from "../theme";
import { API_URL } from "../config";

function getUserId() {
  const token = localStorage.getItem("token");
  if (!token) return null;
  return JSON.parse(atob(token.split(".")[1])).sub;
}

function StatCard({ icon: Icon, label, value, accent, onClick }) {
  return (
    <div onClick={onClick} style={{ ...cardStyle, flex: 1, display: "flex", alignItems: "center", gap: 14, cursor: onClick ? "pointer" : "default" }}>
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

const STATUS_META = {
  submitted: { label: "Submitted", color: T.primary, bg: T.lavender },
  approved: { label: "Approved", color: T.green, bg: "#D1FAE5" },
  returned: { label: "Returned", color: T.coral, bg: "#FEE2E2" },
};

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function MyTeam() {
  const [teamSubs, setTeamSubs] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [workload, setWorkload] = useState({ members: [], week_start: null, week_end: null });
  const [showTeamList, setShowTeamList] = useState(false);
  const navigate = useNavigate();
  const userId = getUserId();
  const token = localStorage.getItem("token");
  const headers = { authorization: `Bearer ${token}` };

  useEffect(() => { load(); }, []);

  const load = async () => {
    const [subsRes, usersRes, workloadRes] = await Promise.all([
      axios.get(`${API_URL}/submissions`, { headers }),
      axios.get(`${API_URL}/users`, { headers }),
      axios.get(`${API_URL}/time-entries/team-workload`, { headers }),
    ]);
    setTeamSubs(subsRes.data);
    const directReports = usersRes.data.filter(u => u.manager_id === userId);
    setTeamMembers(directReports);
    setWorkload(workloadRes.data);
  };

  const weekDates = () => {
    if (!workload.week_start) return [];
    const start = new Date(workload.week_start);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return d.toISOString().split("T")[0];
    });
  };

  const pendingCount = teamSubs.filter(s => s.status === "submitted").length;

  return (
    <>
      <div style={{ display: "flex", gap: 16, marginBottom: 28 }}>
        <StatCard icon={Users2} label="Team Members" value={teamMembers.length} accent={T.primary} onClick={() => setShowTeamList(true)} />
        <StatCard icon={FileClock} label="Pending Approvals" value={pendingCount} accent={T.amber} />
        <StatCard icon={ListChecks} label="Total Submissions" value={teamSubs.length} accent={T.green} />
      </div>

      <h2 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 700, color: T.textPrimary, fontFamily: fontDisplay }}>Team Submissions</h2>
      {teamSubs.length === 0 ? (
        <div style={{ ...cardStyle, textAlign: "center", padding: 36 }}>
          <p style={{ color: T.textMuted, fontSize: 13.5, margin: 0 }}>No submissions from your team yet.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {teamSubs.map((s, idx) => {
            const meta = STATUS_META[s.status] || STATUS_META.submitted;
            return (
              <div key={s._id} style={{ ...cardStyle, display: "flex", justifyContent: "space-between", alignItems: "center", animation: `fadeIn 0.3s ease ${idx * 0.05}s backwards` }}>
                <div>
                  <p style={{ margin: "0 0 4px", fontSize: 13.5, fontWeight: 700, color: T.textPrimary }}>{s.employee_name}</p>
                  <p style={{ margin: 0, fontSize: 11.5, color: T.textMuted }}>Week of {s.week_start_date}</p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: meta.color, background: meta.bg, padding: "3px 10px", borderRadius: 20 }}>{meta.label}</span>
                  {s.status === "submitted" && (
                    <button onClick={() => navigate("/approvals")} style={{ background: T.primary, color: "#fff", border: "none", borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                      Review
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {workload.members.length > 0 && (
        <>
          <h2 style={{ margin: "28px 0 14px", fontSize: 15, fontWeight: 700, color: T.textPrimary, fontFamily: fontDisplay }}>Team Workload — This Week</h2>
          <div style={{ ...cardStyle, padding: 0, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: T.lavender }}>
                  <th style={{ textAlign: "left", padding: "10px 14px", fontSize: 12, color: T.textSecondary, fontWeight: 700 }}>Team Member</th>
                  {DAY_LABELS.map(d => (
                    <th key={d} style={{ padding: "10px 6px", fontSize: 11, color: T.textSecondary, fontWeight: 700, textAlign: "center", width: 46 }}>{d}</th>
                  ))}
                  <th style={{ padding: "10px 10px", fontSize: 11, color: T.textSecondary, fontWeight: 700, textAlign: "center", width: 50 }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {workload.members.map(m => (
                  <tr key={m.user_id} style={{ borderTop: `1px solid ${T.border}` }}>
                    <td style={{ padding: "10px 14px", fontSize: 12.5, fontWeight: 600, color: T.textPrimary }}>{m.name}</td>
                    {weekDates().map(d => (
                      <td key={d} style={{ padding: "10px 6px", textAlign: "center", fontSize: 12, color: T.textSecondary }}>
                        {m.by_day[d] || "–"}
                      </td>
                    ))}
                    <td style={{ padding: "10px 10px", textAlign: "center", fontSize: 12.5, fontWeight: 700, color: T.primary }}>
                      {m.total_hours}h
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {showTeamList && (
        <div onClick={() => setShowTeamList(false)} style={{ position: "fixed", inset: 0, background: "rgba(30,27,46,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div onClick={e => e.stopPropagation()} style={{ ...cardStyle, width: 380, maxHeight: "70vh", overflowY: "auto", position: "relative" }}>
            <button onClick={() => setShowTeamList(false)} style={{ position: "absolute", top: 18, right: 18, background: "none", border: "none", cursor: "pointer", color: T.textMuted }}><X size={18} /></button>
            <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 800, color: T.textPrimary, fontFamily: fontDisplay }}>Team Members</h3>
            {teamMembers.length === 0 ? (
              <p style={{ fontSize: 13, color: T.textMuted }}>No direct reports.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {teamMembers.map(m => (
                  <div key={m.user_id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0" }}>
                    <Avatar initials={m.name ? m.name.slice(0, 2).toUpperCase() : "??"} size={32} />
                    <span style={{ fontSize: 13.5, color: T.textPrimary, fontWeight: 600 }}>{m.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default MyTeam;