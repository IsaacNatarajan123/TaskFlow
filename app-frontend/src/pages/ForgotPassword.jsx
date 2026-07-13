import { useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { Mail } from "lucide-react";
import { T, cardStyle, inputStyle, labelStyle, btnPrimary, Logo, Toast } from "../theme";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post("http://localhost:8000/auth/forgot-password", { email });
      if (res.data.error) {
        setError(res.data.error);
        setTimeout(() => setError(""), 3000);
        return;
      }
      navigate(`/reset-password?token=${res.data.reset_token}`);
    } catch (err) {
      setError("Something went wrong");
      setTimeout(() => setError(""), 3000);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #EEF2FF 0%, #FFFFFF 50%, #F3F4F6 100%)", padding: 24, animation: "fadeIn 0.3s ease" }}>
      <div style={{ ...cardStyle, width: 380, boxShadow: "0 12px 48px rgba(0,0,0,0.12)" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}><Logo size={40} /></div>
          <h1 style={{ margin: "0 0 6px", fontSize: 24, fontWeight: 800, color: T.textPrimary }}>Forgot password</h1>
          <p style={{ margin: 0, color: T.textSecondary, fontSize: 14 }}>We'll help you reset it</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 18 }}>
            <label style={labelStyle}>Email</label>
            <div style={{ position: "relative" }}>
              <Mail size={16} color={T.textMuted} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" style={{ ...inputStyle, paddingLeft: 36 }} />
            </div>
          </div>
          <button type="submit" style={btnPrimary}>Send reset link</button>
        </form>
        <p style={{ textAlign: "center", marginTop: 20, color: T.textSecondary, fontSize: 13 }}>
          <Link to="/" style={{ color: T.accentLight }}>← Back to sign in</Link>
        </p>
      </div>
      <Toast message={error} type="error" onClose={() => setError("")} />
    </div>
  );
}

export default ForgotPassword;