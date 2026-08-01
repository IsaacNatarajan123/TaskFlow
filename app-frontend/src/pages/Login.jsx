import { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import { T, cardStyle, inputStyle, labelStyle, btnPrimary, Logo, Toast } from "../theme";
import { Mail, Lock } from "lucide-react";
import { API_URL } from "../config";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
  e.preventDefault();
  try {
    const res = await axios.post(`${API_URL}/auth/login`, { email, password });
    if (res.data.error) {
      setError(res.data.error);
      setTimeout(() => setError(""), 3000);
      return;
    }
    localStorage.setItem("token", res.data.access_token);
    navigate("/dashboard");
  } catch (err) {
    setError("Invalid credentials");
    setTimeout(() => setError(""), 3000);
  }
};

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #EEF2FF 0%, #FFFFFF 50%, #F3F4F6 100%)", padding: 24, animation: "fadeIn 0.3s ease" }}>
      <div style={{ ...cardStyle, width: 380, boxShadow: "0 12px 48px rgba(0,0,0,0.12)" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}><Logo size={40} /></div>
          <h1 style={{ margin: "0 0 6px", fontSize: 24, fontWeight: 800, letterSpacing: "-0.03em", color: T.textPrimary, fontStyle: "normal" }}>Welcome back</h1>
          <p style={{ margin: 0, color: T.textSecondary, fontSize: 14 }}>Sign in to your TaskFlow workspace</p>
        </div>
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: 18 }}>
            <label style={labelStyle}>Email</label>
            <div style={{ position: "relative" }}>
              <Mail size={16} color={T.textMuted} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
              <input type="email" placeholder="you@gmail.com" value={email} onChange={e => setEmail(e.target.value)} style={{ ...inputStyle, paddingLeft: 36 }} />
              </div>
          </div>
          <div style={{ marginBottom: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <label style={labelStyle}>Password</label>
              <Link to="/forgot-password" style={{ color: T.accentLight, fontSize: 13 }}>Forgot password?</Link>
            </div>
            <div style={{ position: "relative" }}>
              <Lock size={16} color={T.textMuted} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
              <input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} style={{ ...inputStyle, paddingLeft: 36 }} />
              </div>
          </div>
          <button type="submit" style={btnPrimary}>Sign in</button>
        </form>
        <p style={{ textAlign: "center", marginTop: 20, color: T.textSecondary, fontSize: 13 }}>
          No account? <Link to="/signup" style={{ color: T.accentLight }}>Create one free</Link>
        </p>
      </div>
      <Toast message={error} type="error" onClose={() => setError("")} />
    </div>
  );
}

export default Login;