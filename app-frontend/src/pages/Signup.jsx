import { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import { User, Mail, Lock } from "lucide-react";
import { T, cardStyle, inputStyle, labelStyle, btnPrimary, Logo, Toast, isValidPassword } from "../theme";
import { API_URL } from "../config";

function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSignup = async (e) => {
  e.preventDefault();
  if (!isValidPassword(password)) {
    setError("Password must be at least 8 characters and include a special character");
    setTimeout(() => setError(""), 3000);
    return;
  }
  try {
    const res = await axios.post(`${API_URL}/auth/signup`, { name, email, password });
    if (res.data.error) {
      setError(res.data.error);
      setTimeout(() => setError(""), 3000);
      return;
    }
    navigate("/");
  } catch (err) {
    setError("Signup failed — try a different email");
    setTimeout(() => setError(""), 3000);
  }
};

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #EEF2FF 0%, #FFFFFF 50%, #F3F4F6 100%)", padding: 24, animation: "fadeIn 0.3s ease" }}>
      <div style={{ ...cardStyle, width: 380, boxShadow: "0 12px 48px rgba(0,0,0,0.12)" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}><Logo size={40} /></div>
          <h1 style={{ margin: "0 0 6px", fontSize: 24, fontWeight: 800, letterSpacing: "-0.03em", color: T.textPrimary }}>Create your account</h1>
          <p style={{ margin: 0, color: T.textSecondary, fontSize: 14 }}>Start managing projects in minutes</p>
        </div>
        <form onSubmit={handleSignup}>
          <div style={{ marginBottom: 18 }}>
            <label style={labelStyle}>Full name</label>
            <div style={{ position: "relative" }}>
              <User size={16} color={T.textMuted} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Full name" style={{ ...inputStyle, paddingLeft: 36 }} />
              </div>
          </div>
          <div style={{ marginBottom: 18 }}>
            <label style={labelStyle}>Work email</label>
            <div style={{ position: "relative" }}>
  <Mail size={16} color={T.textMuted} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" style={{ ...inputStyle, paddingLeft: 36 }} />
</div>
          </div>
          <div style={{ marginBottom: 18 }}>
            <label style={labelStyle}>Password</label>
            <div style={{ position: "relative" }}>
  <Lock size={16} color={T.textMuted} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
  <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 8 characters" style={{ ...inputStyle, paddingLeft: 36 }} />
</div>
          </div>
          <button type="submit" style={btnPrimary}>Create account</button>
        </form>
        <p style={{ textAlign: "center", marginTop: 20, color: T.textSecondary, fontSize: 13 }}>
          Already have an account? <Link to="/" style={{ color: T.accentLight }}>Sign in</Link>
        </p>
      </div>
      <Toast message={error} type="error" onClose={() => setError("")} />
    </div>
  );
}

export default Signup;