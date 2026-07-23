// ===== Design Tokens =====
export const T = {
  // Core palette
  inkViolet: "#6100E4",
  inkVioletLight: "#9812FF",
  primary: "#9812FF",
  primaryLight: "#B84DFF",
  lavender: "#F3EEFF",        // card tints, hover bg
  amber: "#F59E0B",           // the one warm contrast accent
  green: "#10B981",
  coral: "#F87171",

  // Neutrals
  bg: "#F8F6FC",
  surface: "#FFFFFF",
  border: "#E9E7F0",
  textPrimary: "#1E1B2E",
  textSecondary: "#4B4658",
  textMuted: "#8B8599",

  // Legacy aliases (kept so existing components referencing old names still work)
  accent: "#7C3AED",
  accentLight: "#7C3AED",
  accentMuted: "#F3EEFF",
};

export const fontDisplay = "'Manrope', system-ui, sans-serif";
export const fontBody = "'Inter', system-ui, sans-serif";

// ===== Shared styles =====
export const cardStyle = {
  background: T.surface,
  border: `1px solid ${T.border}`,
  borderRadius: 16,
  padding: 20,
  fontFamily: fontBody,
  boxShadow: "0 1px 2px rgba(30,27,46,0.04)",
};

export const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: `1.5px solid ${T.border}`,
  fontSize: 14,
  fontFamily: fontBody,
  color: T.textPrimary,
  background: T.surface,
  outline: "none",
};

export const labelStyle = {
  display: "block",
  fontSize: 12,
  fontWeight: 600,
  color: T.textSecondary,
  marginBottom: 6,
  fontFamily: fontBody,
};

export const btnPrimary = {
  width: "100%",
  padding: "11px 0",
  background: `linear-gradient(135deg, ${T.primary} 0%, ${T.inkVioletLight} 100%)`,
  color: "#fff",
  border: "none",
  borderRadius: 10,
  fontWeight: 700,
  fontSize: 14,
  fontFamily: fontBody,
  cursor: "pointer",
  boxShadow: "0 4px 12px rgba(124,58,237,0.28)",
};

export function isValidPassword(password) {
  const minLength = password.length >= 8;
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  return minLength && hasSpecial;
}

// ===== Shared components =====
export function Field({ label, ...props }) {
  return (
    <div style={{ marginBottom: 16 }}>
      {label && <label style={labelStyle}>{label}</label>}
      <input style={inputStyle} {...props} />
    </div>
  );
}

export function Sel({ label, children, ...props }) {
  return (
    <div style={{ marginBottom: 16 }}>
      {label && <label style={labelStyle}>{label}</label>}
      <select style={inputStyle} {...props}>{children}</select>
    </div>
  );
}

export function Avatar({ initials, size = 32, color }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: color || `linear-gradient(135deg, ${T.primary}, ${T.inkVioletLight})`,
      display: "flex", alignItems: "center", justifyContent: "center",
      color: "#fff", fontSize: size * 0.38, fontWeight: 700,
      fontFamily: fontBody, flexShrink: 0,
    }}>
      {initials}
    </div>
  );
}

export function Logo({ size = 28 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.28,
      background: `linear-gradient(135deg, ${T.primary} 0%, ${T.inkVioletLight} 100%)`,
      display: "flex", alignItems: "center", justifyContent: "center",
      color: "#fff", fontWeight: 800, fontSize: size * 0.5, fontFamily: fontDisplay,
      boxShadow: "0 3px 10px rgba(124,58,237,0.35)",
    }}>
      T
    </div>
  );
}

export function Toast({ message, type = "error", onClose }) {
  if (!message) return null;
  const color = type === "error" ? T.coral : type === "success" ? T.green : T.amber;
  return (
    <div style={{
      position: "fixed", top: 20, right: 20, background: "#fff", border: `1.5px solid ${color}`,
      borderRadius: 12, padding: "12px 16px", boxShadow: "0 8px 24px rgba(30,27,46,0.14)",
      animation: "slideInRight 0.3s ease", zIndex: 100, display: "flex", alignItems: "center", gap: 10,
      minWidth: 240, fontFamily: fontBody,
    }}>
      <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
      <span style={{ fontSize: 13, color: T.textPrimary, flex: 1 }}>{message}</span>
      <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: T.textMuted, fontSize: 14 }}>✕</button>
    </div>
  );
}