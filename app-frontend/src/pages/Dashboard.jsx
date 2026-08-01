import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { T, fontDisplay } from "../theme";
import { API_URL } from "../config";
import Layout from "../components/Layout";
import MyWork from "../components/MyWork";
import MyTeam from "../components/MyTeam";

function getUserId() {
  const token = localStorage.getItem("token");
  if (!token) return null;
  return JSON.parse(atob(token.split(".")[1])).sub;
}

function Dashboard() {
  const [tab, setTab] = useState("work");
  const [isManager, setIsManager] = useState(false);
  const navigate = useNavigate();
  const userId = getUserId();

  useEffect(() => {
    if (!userId) { navigate("/"); return; }
    checkManager();
  }, []);

  const checkManager = async () => {
    const res = await axios.get(`${API_URL}/users`);
    const hasReports = res.data.some(u => u.manager_id === userId);
    setIsManager(hasReports);
    if (hasReports) setTab("team");
  };

  return (
    <Layout active="Dashboard">
      <div style={{ padding: 32, animation: "fadeIn 0.3s ease" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: T.textPrimary, fontFamily: fontDisplay, letterSpacing: "-0.02em" }}>
            Dashboard
          </h1>
          {isManager && (
            <div style={{ display: "flex", gap: 4, background: T.lavender, padding: 4, borderRadius: 10 }}>
              <button onClick={() => setTab("team")} style={{
                padding: "7px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12.5, fontWeight: 700,
                background: tab === "team" ? "#fff" : "transparent", color: tab === "team" ? T.primary : T.textMuted,
                boxShadow: tab === "team" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              }}>My Team</button>
              <button onClick={() => setTab("work")} style={{
                padding: "7px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12.5, fontWeight: 700,
                background: tab === "work" ? "#fff" : "transparent", color: tab === "work" ? T.primary : T.textMuted,
                boxShadow: tab === "work" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              }}>My Work</button>
            </div>
          )}
        </div>
        <p style={{ margin: "4px 0 24px", color: T.textMuted, fontSize: 13.5 }}>
          {tab === "team" ? "Your team's submission activity" : "Here's how your week is looking"}
        </p>

        {tab === "team" ? <MyTeam /> : <MyWork />}
      </div>
    </Layout>
  );
}

export default Dashboard;