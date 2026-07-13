import { useState, useEffect } from "react";
import axios from "axios";
import { BarChart3, Users2, Clock3 } from "lucide-react";
import { T, fontDisplay, cardStyle } from "../theme";
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

function Reports() {
  const [rows, setRows] = useState([]);
  const token = localStorage.getItem("token");

  useEffect(() => {
    axios.get("http://localhost:8000/reports/company-wide", { headers: { authorization: `Bearer ${token}` } })
      .then(res => setRows(res.data.sort((a, b) => b.total_hours - a.total_hours)));
  }, []);

  const totalHours = rows.reduce((sum, r) => sum + r.total_hours, 0);
  const activeClients = rows.filter(r => r.total_hours > 0).length;
  const avgHours = activeClients ? Math.round(totalHours / activeClients) : 0;
  const maxHours = Math.max(...rows.map(r => r.total_hours), 1);

  return (
    <Layout active="Reports">
      <div style={{ padding: 32, animation: "fadeIn 0.3s ease" }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: T.textPrimary, fontFamily: fontDisplay }}>Reports</h1>
        <p style={{ margin: "4px 0 24px", color: T.textMuted, fontSize: 13.5 }}>Company-wide overview, built from approved submissions only</p>

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
          <div style={{ ...cardStyle, padding: 0, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: T.lavender }}>
                  <th style={{ textAlign: "left", padding: "12px 16px", fontSize: 12, color: T.textSecondary, fontWeight: 700 }}>Client</th>
                  <th style={{ textAlign: "left", padding: "12px 16px", fontSize: 12, color: T.textSecondary, fontWeight: 700, width: 220 }}>Hours</th>
                  <th style={{ textAlign: "right", padding: "12px 16px", fontSize: 12, color: T.textSecondary, fontWeight: 700, width: 130 }}>Employees</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, idx) => (
                  <tr key={r.client_id} style={{ borderTop: `1px solid ${T.border}` }}>
                    <td style={{ padding: "14px 16px", fontSize: 13.5, fontWeight: 600, color: T.textPrimary }}>{r.client_name}</td>
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ flex: 1, height: 8, background: T.border, borderRadius: 4, overflow: "hidden" }}>
                          <div style={{
                            height: "100%", width: `${(r.total_hours / maxHours) * 100}%`,
                            background: COLORS[idx % COLORS.length], borderRadius: 4, transition: "width 0.4s ease",
                          }} />
                        </div>
                        <span style={{ fontSize: 12.5, fontWeight: 700, color: T.textPrimary, width: 44, textAlign: "right" }}>{r.total_hours}h</span>
                      </div>
                    </td>
                    <td style={{ padding: "14px 16px", textAlign: "right", fontSize: 13, color: T.textSecondary }}>{r.employee_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}

export default Reports;