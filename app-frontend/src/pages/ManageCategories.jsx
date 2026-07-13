import { useState, useEffect } from "react";
import axios from "axios";
import { Plus, X } from "lucide-react";
import { T, fontDisplay, cardStyle, inputStyle, labelStyle, btnPrimary, Toast } from "../theme";
import Layout from "../components/Layout";

function ManageCategories() {
  const [categories, setCategories] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [name, setName] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [toast, setToast] = useState("");
  const [toastType, setToastType] = useState("success");

  const showToast = (msg, type = "success") => {
    setToastType(type);
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  useEffect(() => { load(); }, []);

  const load = async () => {
    const res = await axios.get("http://localhost:8000/task_categories");
    setCategories(res.data);
  };

  const openCreate = () => {
    setEditing(null);
    setName("");
    setShowModal(true);
  };

  const openEdit = (c) => {
    setEditing(c);
    setName(c.category_name);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!name.trim()) { showToast("Category name is required", "error"); return; }
    try {
      if (editing) {
        await axios.patch(`http://localhost:8000/task_categories/${editing._id}`, { category_name: name });
        showToast("Category updated", "success");
      } else {
        const res = await axios.post("http://localhost:8000/task_categories", { category_name: name });
        if (res.data.error) { showToast(res.data.error, "error"); return; }
        showToast("Category created", "success");
      }
      setShowModal(false);
      load();
    } catch {
      showToast("Something went wrong", "error");
    }
  };

  const handleDelete = async (id) => {
    const res = await axios.delete(`http://localhost:8000/task_categories/${id}`);
    setConfirmDeleteId(null);
    if (res.data.error) { showToast(res.data.error, "error"); return; }
    showToast("Category deleted", "success");
    load();
  };

  return (
    <Layout active="Manage Categories">
      <div style={{ padding: 32, animation: "fadeIn 0.3s ease" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: T.textPrimary, fontFamily: fontDisplay }}>Manage Categories</h1>
            <p style={{ margin: "4px 0 0", color: T.textMuted, fontSize: 13.5 }}>{categories.length} categories</p>
          </div>
          <button onClick={openCreate} style={{ ...btnPrimary, width: "auto", padding: "10px 18px", fontSize: 13, display: "flex", alignItems: "center", gap: 7 }}>
            <Plus size={15} /> Add Category
          </button>
        </div>

        {categories.length === 0 ? (
          <div style={{ ...cardStyle, textAlign: "center", padding: 36 }}>
            <p style={{ color: T.textMuted, fontSize: 13.5, margin: 0 }}>No categories yet.</p>
          </div>
        ) : (
          <div style={{ ...cardStyle, padding: 0, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: T.lavender }}>
                  <th style={{ textAlign: "left", padding: "12px 16px", fontSize: 12, color: T.textSecondary, fontWeight: 700 }}>Category Name</th>
                  <th style={{ width: 180 }} />
                </tr>
              </thead>
              <tbody>
                {categories.map(c => (
                  <tr key={c._id} style={{ borderTop: `1px solid ${T.border}` }}>
                    <td style={{ padding: "13px 16px", fontSize: 13.5, fontWeight: 600, color: T.textPrimary }}>{c.category_name}</td>
                    <td style={{ padding: "13px 16px", textAlign: "right" }}>
                      {confirmDeleteId === c._id ? (
                        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                          <button onClick={() => setConfirmDeleteId(null)} style={{ background: T.border, border: "none", borderRadius: 6, padding: "5px 10px", fontSize: 11.5, cursor: "pointer" }}>Cancel</button>
                          <button onClick={() => handleDelete(c._id)} style={{ background: T.coral, color: "#fff", border: "none", borderRadius: 6, padding: "5px 10px", fontSize: 11.5, cursor: "pointer", fontWeight: 600 }}>Confirm</button>
                        </div>
                      ) : (
                        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
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
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: T.textPrimary, fontFamily: fontDisplay }}>{editing ? "Edit Category" : "Add Category"}</h3>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: T.textMuted }}><X size={18} /></button>
            </div>
            <label style={labelStyle}>Category Name</label>
            <input value={name} onChange={e => setName(e.target.value)} style={{ ...inputStyle, marginBottom: 20 }} />
            <div style={{ display: "flex", gap: 10 }}>
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

export default ManageCategories;