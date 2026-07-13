import { useState } from "react";
import axios from "axios";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Lock } from "lucide-react";
import { T, cardStyle, inputStyle, labelStyle, btnPrimary, Toast, isValidPassword } from "../theme";

function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token");

  const handleSubmit = async (e) => {
  e.preventDefault();
  if (password !== confirm) {
    setError("Passwords don't match");
    setTimeout(() => setError(""), 3000);
    return;
  }
  if (!isValidPassword(password)) {
    setError("Password must be at least 8 characters and include a special character");
    setTimeout(() => setError(""), 3000);
    return;
  }
  try {
    const res = await axios.post("http://localhost:8000/auth/reset-password", { token, new_password: password });
    if (res.data.error) {
      setError(res.data.error);
      setTimeout(() => setError(""), 3000);
      return;
    }
    setSuccess(true);
    setTimeout(() => navigate("/"), 1500);
  } catch (err) {
    setError("Something went wrong");
    setTimeout(() => setError(""), 3000);
  }
};

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #EEF2FF 0%, #FFFFFF 50%, #F3F4F6 100%)", padding: 24, animation: "fadeIn 0.3s ease" }}>
      <div style={{ ...cardStyle, width: 380, boxShadow: "0 12px 48px rgba(0,0,0,0.12)" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <h1 style={{ margin: "0 0 6px", fontSize: 24, fontWeight: 800, color: T.textPrimary }}>Set new password</h1>
          <p style={{ margin: 0, color: T.textSecondary, fontSize: 14 }}>Choose something strong and unique</p>
        </div>
        {success ? (
          <p style={{ color: T.green, textAlign: "center" }}>Password reset! Redirecting to login...</p>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle}>New password</label>
              <div style={{ position: "relative" }}>
  <Lock size={16} color={T.textMuted} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
  <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 8 characters" style={{ ...inputStyle, paddingLeft: 36 }} />
</div>
            </div>
            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle}>Confirm password</label>
              <div style={{ position: "relative" }}>
  <Lock size={16} color={T.textMuted} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
  <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repeat password" style={{ ...inputStyle, paddingLeft: 36 }} />
</div>
            </div>
            <button type="submit" style={btnPrimary}>Reset password</button>
          </form>
        )}
        <p style={{ textAlign: "center", marginTop: 20, color: T.textSecondary, fontSize: 13 }}>
          <Link to="/" style={{ color: T.accentLight }}>← Back to sign in</Link>
        </p>
      </div>
      <Toast message={error} type="error" onClose={() => setError("")} />
    </div>
  );
}

export default ResetPassword;