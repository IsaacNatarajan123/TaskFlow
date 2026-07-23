import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Plus, Search, X } from "lucide-react";
import { T, fontDisplay, cardStyle, inputStyle, labelStyle, btnPrimary, Toast } from "../theme";
import Layout from "../components/Layout";

function getUserId() {
  const token = localStorage.getItem("token");
  if (!token) return null;
  return JSON.parse(atob(token.split(".")[1])).sub;
}

const PRIORITIES = ["Low", "Medium", "High", "Urgent"];
const STATUS_META = {
  open: { label: "Open", color: T.textMuted, bg: T.border },
  in_progress: { label: "In Progress", color: T.amber, bg: "#FEF3C7" },
  closed: { label: "Closed", color: T.green, bg: "#D1FAE5" },
};

function MyTasks() {
  const [tasks, setTasks] = useState([]);
  const [clients, setClients] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [search, setSearch] = useState("");
  const [filterClient, setFilterClient] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [toast, setToast] = useState("");
  const [toastType, setToastType] = useState("success");
  const navigate = useNavigate();
  const userId = getUserId();
  const token = localStorage.getItem("token");
  const headers = { authorization: `Bearer ${token}` };

  const [form, setForm] = useState({
    title: "", description: "", client_id: "", department_id: "",
    priority: "Medium", start_date: "", deadline: "", status: "open",
  });

  const showToast = (msg, type = "success") => {
    setToastType(type);
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  useEffect(() => {
    if (!userId) { navigate("/"); return; }
    loadAll();
  }, []);

  const loadAll = async () => {
    const [taskRes, clientRes, deptRes] = await Promise.all([
      axios.get("http://localhost:8000/tasks"),
      axios.get("http://localhost:8000/clients"),
      axios.get("http://localhost:8000/departments"),
    ]);
    setTasks(taskRes.data.filter(t => t.created_by === userId));
    setClients(clientRes.data);
    setDepartments(deptRes.data);
  };

  const clientName = (id) => clients.find(c => c._id === id)?.client_name || "—";
  const departmentName = (id) => departments.find(d => d._id === id)?.department_name || "—";

  const deadlineBadge = (deadline, status) => {
    if (!deadline || status === "closed") return null;
    const today = new Date().toISOString().split("T")[0];
    const daysLeft = Math.ceil((new Date(deadline) - new Date(today)) / (1000 * 60 * 60 * 24));
    if (daysLeft < 0) return { label: "Overdue", color: T.coral, bg: "#FEE2E2" };
    if (daysLeft === 0) return { label: "Due today", color: "#EA580C", bg: "#FFEDD5" };
    if (daysLeft <= 3) return { label: `${daysLeft} day${daysLeft === 1 ? "" : "s"} left`, color: "#EA580C", bg: "#FFEDD5" };
    return null;
  };

  const openCreate = () => {
    setEditingTask(null);
    setForm({ title: "", description: "", client_id: "", department_id: "", priority: "Medium", start_date: "", deadline: "", status: "open" });
    setShowModal(true);
  };

  const openEdit = (task) => {
    setEditingTask(task);
    setForm({
      title: task.title, description: task.description || "",
      client_id: task.client_id, department_id: task.department_id,
      priority: task.priority, start_date: task.start_date, deadline: task.deadline, status: task.status,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.client_id || !form.department_id) {
      showToast("Please fill all required fields", "error");
      return;
    }
    if (form.start_date && form.deadline && form.deadline < form.start_date) {
      showToast("Deadline cannot be before start date", "error");
      return;
    }
    try {
      if (editingTask) {
        const res = await axios.patch(`http://localhost:8000/tasks/${editingTask._id}`, form, { headers });
        if (res.data.error) { showToast(res.data.error, "error"); return; }
        showToast("Task updated", "success");
      } else {
        const res = await axios.post("http://localhost:8000/tasks", form, { headers });
        if (res.data.error) { showToast(res.data.error, "error"); return; }
        showToast("Task created", "success");
      }
      setShowModal(false);
      loadAll();
    } catch {
      showToast("Something went wrong", "error");
    }
  };

  const handleClose = async (task) => {
    const res = await axios.patch(`http://localhost:8000/tasks/${task._id}`, { status: "closed" }, { headers });
    if (res.data.error) { showToast(res.data.error, "error"); return; }
    showToast("Task closed", "success");
    loadAll();
  };

  const handleDelete = async (taskId) => {
    const res = await axios.delete(`http://localhost:8000/tasks/${taskId}`, { headers });
    setConfirmDeleteId(null);
    if (res.data.error) { showToast(res.data.error, "error"); return; }
    showToast("Task deleted", "success");
    loadAll();
  };

  const filtered = tasks.filter(t => {
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterClient && t.client_id !== filterClient) return false;
    if (filterStatus && t.status !== filterStatus) return false;
    return true;
  });

  return (
    <Layout active="My Tasks">
      <div style={{ padding: 32, animation: "fadeIn 0.3s ease" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: T.textPrimary, fontFamily: fontDisplay }}>My Tasks</h1>
            <p style={{ margin: "4px 0 0", color: T.textMuted, fontSize: 13.5 }}>{filtered.length} tasks</p>
          </div>
          <button onClick={openCreate} style={{ ...btnPrimary, width: "auto", padding: "10px 18px", fontSize: 13, display: "flex", alignItems: "center", gap: 7 }}>
            <Plus size={15} /> Create Task
          </button>
        </div>

        <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
          <div style={{ position: "relative", flex: 1 }}>
            <Search size={15} color={T.textMuted} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tasks..." style={{ ...inputStyle, paddingLeft: 34 }} />
          </div>
          <select value={filterClient} onChange={e => setFilterClient(e.target.value)} style={{ ...inputStyle, width: 160 }}>
            <option value="">All Clients</option>
            {clients.filter(c => c.status === "active").map(c => <option key={c._id} value={c._id}>{c.client_name}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ ...inputStyle, width: 150 }}>
            <option value="">All Status</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="closed">Closed</option>
          </select>
        </div>

        {filtered.length === 0 ? (
          <div style={{ ...cardStyle, textAlign: "center", padding: 36 }}>
            <p style={{ color: T.textMuted, fontSize: 13.5, margin: 0 }}>No tasks found. Create one to get started.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.map((t, idx) => {
              const meta = STATUS_META[t.status] || STATUS_META.open;
              return (
                <div key={t._id} style={{ ...cardStyle, animation: `fadeIn 0.3s ease ${idx * 0.04}s backwards` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ flex: 1, cursor: "pointer" }} onClick={() => openEdit(t)}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        <p style={{ margin: 0, fontSize: 14.5, fontWeight: 700, color: T.textPrimary }}>{t.title}</p>
                        <span style={{ fontSize: 10.5, fontWeight: 700, color: meta.color, background: meta.bg, padding: "2px 8px", borderRadius: 20 }}>{meta.label}</span>
                        {(() => {
                          const badge = deadlineBadge(t.deadline, t.status);
                          return badge ? (
                            <span style={{ fontSize: 10.5, fontWeight: 700, color: badge.color, background: badge.bg, padding: "2px 8px", borderRadius: 20 }}>{badge.label}</span>
                          ) : null;
                        })()}
                      </div>
                      <p style={{ margin: 0, fontSize: 12, color: T.textMuted }}>
                        {clientName(t.client_id)} · {departmentName(t.department_id)} · {t.priority} priority
                      </p>
                      {clients.find(c => c._id === t.client_id)?.status === "inactive" && (
                        <p style={{ margin: "4px 0 0", fontSize: 11, color: T.coral, fontWeight: 600 }}>
                          ⚠ Client "{clientName(t.client_id)}" has been deactivated — no new hours can be logged
                        </p>
                      )}
                      {departments.find(d => d._id === t.department_id)?.status === "inactive" && (
                        <p style={{ margin: "4px 0 0", fontSize: 11, color: T.coral, fontWeight: 600 }}>
                          ⚠ Department "{departmentName(t.department_id)}" has been deactivated — no new hours can be logged
                        </p>
                      )}
                    </div>
                    {confirmDeleteId === t._id ? (
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => setConfirmDeleteId(null)} style={{ background: T.border, border: "none", borderRadius: 6, padding: "5px 10px", fontSize: 11.5, cursor: "pointer" }}>Cancel</button>
                        <button onClick={() => handleDelete(t._id)} style={{ background: T.coral, color: "#fff", border: "none", borderRadius: 6, padding: "5px 10px", fontSize: 11.5, cursor: "pointer", fontWeight: 600 }}>Confirm</button>
                      </div>
                    ) : (
                      <div style={{ display: "flex", gap: 8 }}>
                        {t.status !== "closed" && (
                          <button onClick={() => handleClose(t)} style={{ background: "none", border: `1px solid ${T.border}`, borderRadius: 8, padding: "6px 12px", fontSize: 12, cursor: "pointer", color: T.textSecondary }}>Close</button>
                        )}
                        <button onClick={() => setConfirmDeleteId(t._id)} style={{ background: "none", border: "none", color: T.coral, fontSize: 12, cursor: "pointer" }}>Delete</button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showModal && (
        <div onClick={() => setShowModal(false)} style={{ position: "fixed", inset: 0, background: "rgba(30,27,46,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div onClick={e => e.stopPropagation()} style={{ ...cardStyle, width: 440, animation: "popIn 0.15s ease" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: T.textPrimary, fontFamily: fontDisplay }}>
                {editingTask ? "Edit Task" : "Create Task"}
              </h3>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: T.textMuted }}><X size={18} /></button>
            </div>

            <label style={labelStyle}>Title *</label>
            <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} style={{ ...inputStyle, marginBottom: 14 }} />

            <label style={labelStyle}>Description</label>
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} style={{ ...inputStyle, marginBottom: 14, resize: "vertical" }} />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
              <div>
                <label style={labelStyle}>Client *</label>
                <select value={form.client_id} onChange={e => setForm({ ...form, client_id: e.target.value })} style={inputStyle}>
                  <option value="">Select</option>
                  {clients.filter(c => c.status === "active").map(c => <option key={c._id} value={c._id}>{c.client_name}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Department *</label>
                <select value={form.department_id} onChange={e => setForm({ ...form, department_id: e.target.value })} style={inputStyle}>
                  <option value="">Select</option>
                  {departments.filter(d => d.status === "active").map(d => <option key={d._id} value={d._id}>{d.department_name}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
              <div>
                <label style={labelStyle}>Priority *</label>
                <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} style={inputStyle}>
                  {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              {editingTask && (
                <div>
                  <label style={labelStyle}>Status</label>
                  <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} style={inputStyle}>
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
              <div>
                <label style={labelStyle}>Start Date</label>
                <input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Deadline</label>
                <input type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} style={inputStyle} />
              </div>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: 11, background: T.border, border: "none", borderRadius: 10, cursor: "pointer", color: T.textPrimary }}>Cancel</button>
              <button onClick={handleSave} style={{ ...btnPrimary, flex: 2 }}>Save Task</button>
            </div>
          </div>
        </div>
      )}

      <Toast message={toast} type={toastType} onClose={() => setToast("")} />
    </Layout>
  );
}

export default MyTasks;