import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { ListTodo, Clock3, LayoutGrid, FileCheck2, BarChart3, Users, Tags, LogOut, Calendar } from "lucide-react";
import { T, fontDisplay, fontBody, Avatar } from "../theme";
import { API_URL } from "../config";

function getUserId() {
  const token = localStorage.getItem("token");
  if (!token) return null;
  return JSON.parse(atob(token.split(".")[1])).sub;
}

function Layout({ active, children }) {
  const [userName, setUserName] = useState(localStorage.getItem("cachedName") || "");
  const [isManager, setIsManager] = useState(localStorage.getItem("cachedIsManager") === "true");
  const [isDirector, setIsDirector] = useState(localStorage.getItem("cachedIsDirector") === "true");
  const [isCEO, setIsCEO] = useState(localStorage.getItem("cachedIsCEO") === "true");
  const [designation, setDesignation] = useState(localStorage.getItem("cachedDesignation") || "");
  const navigate = useNavigate();
  const userId = getUserId();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { navigate("/"); return; }
    const headers = { authorization: `Bearer ${token}` };
    axios.get(`${API_URL}/auth/me`, { headers }).then(res => {
      setUserName(res.data.name);
      localStorage.setItem("cachedName", res.data.name);
    });

    // Auto-detect manager status: does anyone else have this user as their manager_id?
    axios.get(`${API_URL}/users`).then(res => {
      const hasDirectReports = res.data.some(u => u.manager_id === userId);
      setIsManager(hasDirectReports);
      localStorage.setItem("cachedIsManager", hasDirectReports);
    });

    // Director/CEO access is designation-based, not reporting-line-based
    axios.get(`${API_URL}/auth/me`, { headers }).then(res => {
      const director = ["Director", "Sr. Director", "CEO"].includes(res.data.designation);
      const ceo = res.data.designation === "CEO";
      setIsDirector(director);
      setIsCEO(ceo);
      setDesignation(res.data.designation || "");
      localStorage.setItem("cachedIsDirector", director);
      localStorage.setItem("cachedIsCEO", ceo);
      localStorage.setItem("cachedDesignation", res.data.designation || "");
    });
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("cachedName");
    localStorage.removeItem("cachedIsManager");
    localStorage.removeItem("cachedIsDirector");
    localStorage.removeItem("cachedIsCEO");
    localStorage.removeItem("cachedDesignation");
    navigate("/");
  };

  const employeeItems = isCEO
    ? [
        { label: "Dashboard", icon: LayoutGrid, route: "/dashboard" },
        { label: "Timeline", icon: Calendar, route: "/timeline" },
      ]
    : [
        { label: "Dashboard", icon: LayoutGrid, route: "/dashboard" },
        { label: "Log Time", icon: Clock3, route: "/log-time" },
        { label: "My Tasks", icon: ListTodo, route: "/my-tasks" },
        { label: "Submissions", icon: FileCheck2, route: "/submissions" },
        { label: "Timeline", icon: Calendar, route: "/timeline" },
      ];
  const managerItems = [
    { label: "Approvals", icon: FileCheck2, route: "/approvals" },
  ];
  const directorItems = [
    { label: "Reports", icon: BarChart3, route: "/reports" },
    { label: "Manage Clients", icon: Users, route: "/manage-clients" },
    { label: "Manage Departments", icon: Tags, route: "/manage-departments" },
  ];

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: T.bg, fontFamily: fontBody }}>
      {/* Signature sidebar: deep violet gradient */}
      <div style={{
        width: 232, flexShrink: 0, padding: "26px 16px",
        background: `linear-gradient(180deg, ${T.inkViolet} 0%, #24094F 100%)`,
        display: "flex", flexDirection: "column", gap: 4,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 32, padding: "0 8px" }}>
          <div style={{
            width: 30, height: 30, borderRadius: 9, background: "rgba(255,255,255,0.15)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontWeight: 800, fontSize: 15, fontFamily: fontDisplay,
          }}>T</div>
          <span style={{ fontWeight: 800, fontSize: 17, color: "#fff", fontFamily: fontDisplay, letterSpacing: "-0.02em" }}>TaskFlow</span>
        </div>

        <p style={{ fontSize: 10.5, fontWeight: 700, color: "rgba(255,255,255,0.55)", letterSpacing: "0.08em", textTransform: "uppercase", margin: "4px 8px 8px" }}>
          Workspace
        </p>
        {employeeItems.map(({ label, icon: Icon, route }) => {
          const isActive = active === label;
          return (
            <div key={label} onClick={() => navigate(route)}
              style={{
                display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 10,
                background: isActive ? "rgba(255,255,255,0.14)" : "transparent",
                color: isActive ? "#fff" : "rgba(255,255,255,0.85)",
                fontSize: 13.5, fontWeight: isActive ? 700 : 600, cursor: "pointer",
                transition: "background 0.15s ease",
              }}>
              <Icon size={16} />
              {label}
            </div>
          );
        })}

        {isManager && !isCEO && (
          <>
            <p style={{ fontSize: 10.5, fontWeight: 700, color: "rgba(255,255,255,0.55)", letterSpacing: "0.08em", textTransform: "uppercase", margin: "18px 8px 8px" }}>
              Review Queue
            </p>
            {managerItems.map(({ label, icon: Icon, route }) => {
              const isActive = active === label;
              return (
                <div key={label} onClick={() => navigate(route)}
                  style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 10,
                    background: isActive ? "rgba(255,255,255,0.14)" : "transparent",
                    color: isActive ? "#fff" : "rgba(255,255,255,0.85)",
                    fontSize: 13.5, fontWeight: isActive ? 700 : 600, cursor: "pointer",
                    transition: "background 0.15s ease",
                  }}>
                  <Icon size={16} />
                  {label}
                </div>
              );
            })}
          </>
        )}

        {isDirector && (
          <>
            <p style={{ fontSize: 10.5, fontWeight: 700, color: "rgba(255,255,255,0.55)", letterSpacing: "0.08em", textTransform: "uppercase", margin: "18px 8px 8px" }}>
              Director
            </p>
            {directorItems.map(({ label, icon: Icon, route }) => {
              const isActive = active === label;
              return (
                <div key={label} onClick={() => navigate(route)}
                  style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 10,
                    background: isActive ? "rgba(255,255,255,0.14)" : "transparent",
                    color: isActive ? "#fff" : "rgba(255,255,255,0.85)",
                    fontSize: 13.5, fontWeight: isActive ? 700 : 600, cursor: "pointer",
                    transition: "background 0.15s ease",
                  }}>
                  <Icon size={16} />
                  {label}
                </div>
              );
            })}
          </>
        )}

        <div style={{ marginTop: "auto", paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.12)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Avatar initials={userName ? userName.slice(0, 2).toUpperCase() : "??"} size={32} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{userName || "Loading..."}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>{designation && ["Director", "Sr. Director", "CEO", "Lead", "Senior Lead"].includes(designation) ? designation : isManager ? "Manager" : "Employee"}</div>
            </div>
            <button onClick={handleLogout} title="Logout" style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer", display: "flex" }}>
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", background: `radial-gradient(circle at top right, ${T.lavender} 0%, ${T.bg} 45%)` }}>{children}</div>
    </div>
  );
}

export default Layout;