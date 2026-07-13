import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Users2, FileClock, ListChecks } from "lucide-react";
import { T, fontDisplay, cardStyle } from "../theme";

function getUserId() {
  const token = localStorage.getItem("token");
  if (!token) return null;
  return JSON.parse(atob(token.split(".")[1])).sub;
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

const STATUS_META = {
  submitted: { label: "Submitted", color: T.primary, bg: T.lavender },
  approved: { label: "Approved", color: T.green, bg: "#D1FAE5" },
  returned: { label: "Returned", color: T.coral, bg: "#FEE2E2" },
};

// Manager's team overview — shown as the "My Team" tab on the Dashboard.
function MyTeam() {
  const [teamSubs, setTeamSubs] = useState([]);
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const headers = { authorization: `Bearer ${token}` };

  useEffect(() => { load(); }, []);

  const load = async () => {
    const res = await axios.get("http://localhost:8000/submissions", { headers });
    setTeamSubs(res.data);
  };

  const pendingCount = teamSubs.filter(s => s.status === "submitted").length;
  const teamMemberCount = new Set(teamSubs.map(s => s.user_id)).size;

  return (
    <>
      <div style={{ display: "flex", gap: 16, marginBottom: 28 }}>
        <StatCard icon={Users2} label="Team Members" value={teamMemberCount} accent={T.primary} />
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
    </>
  );
}

export default MyTeam;