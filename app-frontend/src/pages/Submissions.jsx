import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { FileCheck2, Clock3, XCircle } from "lucide-react";
import { T, fontDisplay, cardStyle } from "../theme";
import Layout from "../components/Layout";

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

function Submissions() {
  const [subs, setSubs] = useState([]);
  const navigate = useNavigate();
  const userId = getUserId();
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!userId) { navigate("/"); return; }
    axios.get("http://localhost:8000/submissions/my", { headers: { authorization: `Bearer ${token}` } })
      .then(res => {
        const sorted = res.data.sort((a, b) => b.week_start_date.localeCompare(a.week_start_date));
        setSubs(sorted);
      });
  }, []);

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
              return (
                <div key={s._id} style={{ ...cardStyle, animation: `fadeIn 0.3s ease ${idx * 0.05}s backwards` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 38, height: 38, borderRadius: 10, background: meta.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Icon size={17} color={meta.color} />
                      </div>
                      <div>
                        <p style={{ margin: "0 0 2px", fontSize: 13.5, fontWeight: 700, color: T.textPrimary }}>
                          {fmtDisplay(s.week_start_date)} — {fmtDisplay(weekEnd(s.week_start_date))}
                        </p>
                        <p style={{ margin: 0, fontSize: 11.5, color: T.textMuted }}>
                          Submitted {new Date(s.submitted_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: meta.color, background: meta.bg, padding: "4px 12px", borderRadius: 20 }}>
                      {meta.label}
                    </span>
                  </div>
                  {s.status === "returned" && s.comments && (
                    <div style={{ marginTop: 12, padding: "10px 14px", background: "#FEF2F2", borderRadius: 8, borderLeft: `3px solid ${T.coral}` }}>
                      <p style={{ margin: 0, fontSize: 12.5, color: "#991B1B" }}><strong>Manager's comment:</strong> {s.comments}</p>
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