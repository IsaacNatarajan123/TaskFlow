import { useState, useEffect } from "react";
import axios from "axios";
import { Plus, X } from "lucide-react";
import { T, fontDisplay, cardStyle, inputStyle, labelStyle, btnPrimary, Toast } from "../theme";
import Layout from "../components/Layout";
import { API_URL } from "../config";

function ManageClients() {
  const [clients, setClients] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [name, setName] = useState("");
  const [status, setStatus] = useState("active");
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [toast, setToast] = useState("");
  const [toastType, setToastType] = useState("success");
  const token = localStorage.getItem("token");
  const headers = { authorization: `Bearer ${token}` };

  const showToast = (msg, type = "success") => {
    setToastType(type);
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  useEffect(() => { load(); }, []);

  const load = async () => {
    const res = await axios.get(`${API_URL}/clients`, { headers });
    setClients(res.data);
  };

  const openCreate = () => {
    setEditing(null);
    setName("");
    setStatus("active");
    setShowModal(true);
  };

  const openEdit = (c) => {
    setEditing(c);
    setName(c.client_name);
    setStatus(c.status);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!name.trim()) { showToast("Client name is required", "error"); return; }
    try {
      if (editing) {
        await axios.patch(`${API_URL}/clients/${editing._id}`, { client_name: name, status }, { headers });
        showToast("Client updated", "success");
      } else {
        const res = await axios.post(`${API_URL}/clients`, { client_name: name, status }, { headers });
        if (res.data.error) { showToast(res.data.error, "error"); return; }
        showToast("Client created", "success");
      }
      setShowModal(false);
      load();
    } catch {
      showToast("Something went wrong", "error");
    }
  };

  const handleDelete = async (id) => {
    const res = await axios.delete(`${API_URL}/clients/${id}`, { headers });
    setConfirmDeleteId(null);
    if (res.data.error) { showToast(res.data.error, "error"); return; }
    showToast("Client deleted", "error");
    load();
  };

  const handleToggleStatus = async (c) => {
    if (c.status === "active") {
      await axios.patch(`${API_URL}/clients/${c._id}/deactivate`, {}, { headers });
      showToast("Client deactivated", "success");
    } else {
      await axios.patch(`${API_URL}/clients/${c._id}`, { client_name: c.client_name, status: "active" }, { headers });
      showToast("Client activated", "success");
    }
    load();
  };

  return (
    <Layout active="Manage Clients">
      <div style={{ padding: 32, animation: "fadeIn 0.3s ease" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: T.textPrimary, fontFamily: fontDisplay }}>Manage Clients</h1>
            <p style={{ margin: "4px 0 0", color: T.textMuted, fontSize: 13.5 }}>{clients.length} clients</p>
          </div>
          <button onClick={openCreate} style={{ ...btnPrimary, width: "auto", padding: "10px 18px", fontSize: 13, display: "flex", alignItems: "center", gap: 7 }}>
            <Plus size={15} /> Add Client
          </button>
        </div>

        {clients.length === 0 ? (
          <div style={{ ...cardStyle, textAlign: "center", padding: 36 }}>
            <p style={{ color: T.textMuted, fontSize: 13.5, margin: 0 }}>No clients yet.</p>
          </div>
        ) : (
          <div style={{ ...cardStyle, padding: 0, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: T.lavender }}>
                  <th style={{ textAlign: "left", padding: "12px 16px", fontSize: 12, color: T.textSecondary, fontWeight: 700 }}>Client Name</th>
                  <th style={{ textAlign: "left", padding: "12px 16px", fontSize: 12, color: T.textSecondary, fontWeight: 700, width: 120 }}>Status</th>
                  <th style={{ width: 180 }} />
                </tr>
              </thead>
              <tbody>
                {clients.map(c => (
                  <tr key={c._id} style={{ borderTop: `1px solid ${T.border}` }}>
                    <td style={{ padding: "13px 16px", fontSize: 13.5, fontWeight: 600, color: T.textPrimary }}>{c.client_name}</td>
                    <td style={{ padding: "13px 16px" }}>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20,
                        color: c.status === "active" ? T.green : T.textMuted,
                        background: c.status === "active" ? "#D1FAE5" : T.border,
                      }}>{c.status}</span>
                    </td>
                    <td style={{ padding: "13px 16px", textAlign: "right" }}>
                      {confirmDeleteId === c._id ? (
                        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                          <button onClick={() => setConfirmDeleteId(null)} style={{ background: T.border, border: "none", borderRadius: 6, padding: "5px 10px", fontSize: 11.5, cursor: "pointer" }}>Cancel</button>
                          <button onClick={() => handleDelete(c._id)} style={{ background: T.coral, color: "#fff", border: "none", borderRadius: 6, padding: "5px 10px", fontSize: 11.5, cursor: "pointer", fontWeight: 600 }}>Confirm</button>
                        </div>
                      ) : (
                        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                          <button onClick={() => handleToggleStatus(c)} style={{ background: "none", border: `1px solid ${T.border}`, borderRadius: 8, padding: "5px 12px", fontSize: 12, cursor: "pointer", color: T.textSecondary }}>
                            {c.status === "active" ? "Deactivate" : "Activate"}
                          </button>
                          <button onClick={() => openEdit(c)} style={{ background: "none", border: `1px solid ${T.border}`, borderRadius: 8, padding: "5px 12px", fontSize: 12, cursor: "pointer", color: T.textSecondary }}>Edit</button>
                          <button onClick={() => setConfirmDeleteId(c._id)} style={{ background: "none", border: "none", color: T.coral, fontSize: 12, cursor: "pointer" }}>Delete</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div onClick={() => setShowModal(false)} style={{ position: "fixed", inset: 0, background: "rgba(30,27,46,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div onClick={e => e.stopPropagation()} style={{ ...cardStyle, width: 380, animation: "popIn 0.15s ease" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: T.textPrimary, fontFamily: fontDisplay }}>{editing ? "Edit Client" : "Add Client"}</h3>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: T.textMuted }}><X size={18} /></button>
            </div>
            <label style={labelStyle}>Client Name</label>
            <input value={name} onChange={e => setName(e.target.value)} style={{ ...inputStyle, marginBottom: 14 }} />
            {editing && (
              <>
                <label style={labelStyle}>Status</label>
                <select value={status} onChange={e => setStatus(e.target.value)} style={{ ...inputStyle, marginBottom: 20 }}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </>
            )}
            <div style={{ display: "flex", gap: 10, marginTop: editing ? 0 : 20 }}>
              <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: 10, background: T.border, border: "none", borderRadius: 10, cursor: "pointer" }}>Cancel</button>
              <button onClick={handleSave} style={{ ...btnPrimary, flex: 1 }}>Save</button>
            </div>
          </div>
        </div>
      )}
      <Toast message={toast} type={toastType} onClose={() => setToast("")} />
    </Layout>
  );
}

export default ManageClients;