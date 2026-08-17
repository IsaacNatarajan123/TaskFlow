import { useState, useEffect } from "react";
import axios from "axios";
import { T, fontDisplay } from "../theme";
import { API_URL } from "../config";

function getUserId() {
  const token = localStorage.getItem("token");
  if (!token) return null;
  return JSON.parse(atob(token.split(".")[1])).sub;
}

// Wraps a screen and checks the CURRENT user's real role fresh from the API
// before rendering — never trusts cached/localStorage values, since those
// can be stale after switching accounts (see the Dashboard tab bug).
function ProtectedRoute({ requireManager, requireDirector, children }) {
  const cachedIsManager = localStorage.getItem("cachedIsManager") === "true";
  const cachedIsDirector = localStorage.getItem("cachedIsDirector") === "true";
  const cachedIsCEO = localStorage.getItem("cachedIsCEO") === "true";
  const optimisticAllowed = requireDirector
    ? cachedIsDirector
    : requireManager
      ? (cachedIsManager && !cachedIsCEO)
      : true;

  const [loading, setLoading] = useState(false);
  const [allowed, setAllowed] = useState(optimisticAllowed);
  const userId = getUserId();
  const token = localStorage.getItem("token");
  const headers = { authorization: `Bearer ${token}` };

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    try {
      const [meRes, usersRes] = await Promise.all([
        axios.get(`${API_URL}/auth/me`, { headers }),
        axios.get(`${API_URL}/users`, { headers }),
      ]);
      const designation = meRes.data.designation;
      const isDirector = ["Director", "Sr. Director", "CEO"].includes(designation);
      const isManager = usersRes.data.some(u => u.manager_id === userId);
      const isCEO = designation === "CEO";

      if (requireDirector && !isDirector) {
        setAllowed(false);
      } else if (requireManager && !(isManager && !isCEO)) {
        setAllowed(false);
      } else {
        setAllowed(true);
      }
    } catch {
      setAllowed(false);
    }
    setLoading(false);
  };

  if (!allowed) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8 }}>
        <h1 style={{ fontSize: 48, fontWeight: 800, color: T.textPrimary, fontFamily: fontDisplay, margin: 0 }}>403</h1>
        <p style={{ color: T.textMuted, fontSize: 14, margin: 0 }}>You don't have access to this page.</p>
      </div>
    );
  }

  return children;
}

export default ProtectedRoute;