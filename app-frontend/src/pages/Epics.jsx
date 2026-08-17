import { useState, useEffect } from "react";
import axios from "axios";
import { Plus, ChevronDown, ChevronUp, X, Trash2 } from "lucide-react";
import { T, fontDisplay, cardStyle, inputStyle, labelStyle, btnPrimary, Toast } from "../theme";
import Layout from "../components/Layout";
import { API_URL } from "../config";

function getUserId() {
  const token = localStorage.getItem("token");
  if (!token) return null;
  return JSON.parse(atob(token.split(".")[1])).sub;
}

function Epics() {
  const [epics, setEpics] = useState([]);
  const [allTasks, setAllTasks] = useState([]);
  const [userNames, setUserNames] = useState({});
  const [expandedEpic, setExpandedEpic] = useState(null);
  const [storiesByEpic, setStoriesByEpic] = useState({});
  const [expandedStory, setExpandedStory] = useState(null);
  const [showEpicModal, setShowEpicModal] = useState(false);
  const [epicForm, setEpicForm] = useState({ title: "", description: "" });
  const [showStoryModal, setShowStoryModal] = useState(null);
  const [storyForm, setStoryForm] = useState({ title: "", description: "" });
  const [confirmDeleteEpic, setConfirmDeleteEpic] = useState(null);
  const [confirmDeleteStory, setConfirmDeleteStory] = useState(null);
  const [toast, setToast] = useState("");
  const [toastType, setToastType] = useState("success");
  const userId = getUserId();
  const token = localStorage.getItem("token");
  const headers = { authorization: `Bearer ${token}` };

  const showToast = (msg, type = "success") => {
    setToastType(type);
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  useEffect(() => { load(); }, []);

  const load = async () => {
    const [epicsRes, tasksRes, usersRes] = await Promise.all([
      axios.get(`${API_URL}/epics`, { headers }),
      axios.get(`${API_URL}/tasks`, { headers }),
      axios.get(`${API_URL}/users`, { headers }),
    ]);
    setEpics(epicsRes.data);
    setAllTasks(tasksRes.data);
    const nameMap = {};
    usersRes.data.forEach(u => { nameMap[u.user_id] = u.name; });
    setUserNames(nameMap);
  };

  const creatorName = (id) => userNames[id] || "Unknown";

  const toggleEpic = async (epic) => {
    if (expandedEpic === epic._id) {
      setExpandedEpic(null);
      setExpandedStory(null);
      return;
    }
    setExpandedEpic(epic._id);
    setExpandedStory(null);
    if (!storiesByEpic[epic._id]) {
      const res = await axios.get(`${API_URL}/epics/${epic._id}/stories`, { headers });
      setStoriesByEpic(prev => ({ ...prev, [epic._id]: res.data }));
    }
  };

  const handleCreateEpic = async () => {
    if (!epicForm.title.trim()) { showToast("Title is required", "error"); return; }
    await axios.post(`${API_URL}/epics`, epicForm, { headers });
    setShowEpicModal(false);
    setEpicForm({ title: "", description: "" });
    showToast("Epic created", "success");
    load();
  };

  const handleCreateStory = async (epicId) => {
    if (!storyForm.title.trim()) { showToast("Title is required", "error"); return; }
    const res = await axios.post(`${API_URL}/epics/${epicId}/stories`, storyForm, { headers });
    if (res.data.error) { showToast(res.data.error, "error"); return; }
    setShowStoryModal(null);
    setStoryForm({ title: "", description: "" });
    showToast("Story created", "success");
    const storiesRes = await axios.get(`${API_URL}/epics/${epicId}/stories`, { headers });
    setStoriesByEpic(prev => ({ ...prev, [epicId]: storiesRes.data }));
  };

  const handleDeleteEpic = async (epicId) => {
    const res = await axios.delete(`${API_URL}/epics/${epicId}`, { headers });
    setConfirmDeleteEpic(null);
    if (res.data.error) { showToast(res.data.error, "error"); return; }
    showToast("Epic deleted", "error");
    if (expandedEpic === epicId) setExpandedEpic(null);
    load();
  };

  const handleDeleteStory = async (epicId, storyId) => {
    const res = await axios.delete(`${API_URL}/epics/${epicId}/stories/${storyId}`, { headers });
    setConfirmDeleteStory(null);
    if (res.data.error) { showToast(res.data.error, "error"); return; }
    showToast("Story deleted", "success");
    const storiesRes = await axios.get(`${API_URL}/epics/${epicId}/stories`, { headers });
    setStoriesByEpic(prev => ({ ...prev, [epicId]: storiesRes.data }));
  };

  const tasksForStory = (storyId) => allTasks.filter(t => t.story_id === storyId);

  return (
    <Layout active="Epics">
      <div style={{ padding: 32, animation: "fadeIn 0.3s ease" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: T.textPrimary, fontFamily: fontDisplay }}>Epics</h1>
          <button onClick={() => setShowEpicModal(true)} style={{ ...btnPrimary, width: "auto", padding: "10px 18px", fontSize: 13, display: "flex", alignItems: "center", gap: 7 }}>
            <Plus size={15} /> Create Epic
          </button>
        </div>
        <p style={{ margin: "4px 0 24px", color: T.textMuted, fontSize: 13.5 }}>
          Group related work under a bigger goal — break it into Stories, then link tasks to each Story.
        </p>

        {epics.length === 0 ? (
          <div style={{ ...cardStyle, textAlign: "center", padding: 36 }}>
            <p style={{ color: T.textMuted, fontSize: 13.5, margin: 0 }}>No Epics yet. Create one to get started.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {epics.map(epic => {
              const isExpanded = expandedEpic === epic._id;
              const isOwner = epic.created_by === userId;
              const stories = storiesByEpic[epic._id] || [];
              return (
                <div key={epic._id} style={{ ...cardStyle, padding: 0, overflow: "hidden" }}>
                  <div style={{ padding: 18, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div onClick={() => toggleEpic(epic)} style={{ flex: 1, cursor: "pointer" }}>
                      <p style={{ margin: "0 0 4px", fontSize: 14.5, fontWeight: 700, color: T.textPrimary }}>{epic.title}</p>
                      {epic.description && <p style={{ margin: "0 0 2px", fontSize: 12, color: T.textMuted }}>{epic.description}</p>}
                      <p style={{ margin: 0, fontSize: 10.5, color: T.textMuted }}>Created by {creatorName(epic.created_by)}</p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      {confirmDeleteEpic === epic._id ? (
                        <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={() => setConfirmDeleteEpic(null)} style={{ background: T.border, border: "none", borderRadius: 6, padding: "5px 10px", fontSize: 11.5, cursor: "pointer" }}>Cancel</button>
                          <button onClick={() => handleDeleteEpic(epic._id)} style={{ background: T.coral, color: "#fff", border: "none", borderRadius: 6, padding: "5px 10px", fontSize: 11.5, cursor: "pointer", fontWeight: 600 }}>Confirm</button>
                        </div>
                      ) : (
                        <>
                          <span style={{ fontSize: 11.5, color: T.textSecondary }}>{epic.story_count} {epic.story_count === 1 ? "story" : "stories"}</span>
                          {isOwner && (
                            <button onClick={() => setConfirmDeleteEpic(epic._id)} style={{ background: "none", border: "none", color: T.coral, cursor: "pointer", display: "flex" }}>
                              <Trash2 size={15} />
                            </button>
                          )}
                          <div onClick={() => toggleEpic(epic)} style={{ cursor: "pointer" }}>
                            {isExpanded ? <ChevronUp size={16} color={T.textMuted} /> : <ChevronDown size={16} color={T.textMuted} />}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div style={{ borderTop: `1px solid ${T.border}`, background: T.bg, padding: "12px 18px" }}>
                      {isOwner && (
                        <button onClick={() => setShowStoryModal(epic._id)} style={{ background: "none", border: `1px solid ${T.primary}`, color: T.primary, borderRadius: 8, padding: "6px 12px", fontSize: 12, cursor: "pointer", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                          <Plus size={13} /> Add Story
                        </button>
                      )}
                      {stories.length === 0 ? (
                        <p style={{ fontSize: 12.5, color: T.textMuted, margin: 0 }}>No Stories under this Epic yet.</p>
                      ) : (
                        stories.map(story => {
                          const storyExpanded = expandedStory === story._id;
                          const tasks = tasksForStory(story._id);
                          return (
                            <div key={story._id} style={{ background: "#fff", borderRadius: 10, marginBottom: 8, border: `1px solid ${T.border}` }}>
                              <div style={{ padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div onClick={() => setExpandedStory(storyExpanded ? null : story._id)} style={{ flex: 1, cursor: "pointer" }}>
                                  <p style={{ margin: "0 0 2px", fontSize: 12.5, fontWeight: 600, color: T.textPrimary }}>{story.title}</p>
                                  {story.description && <p style={{ margin: "0 0 2px", fontSize: 11, color: T.textMuted }}>{story.description}</p>}
                                  <p style={{ margin: 0, fontSize: 10, color: T.textMuted }}>Created by {creatorName(story.created_by)}</p>
                                </div>
                                {confirmDeleteStory === story._id ? (
                                  <div style={{ display: "flex", gap: 6 }}>
                                    <button onClick={() => setConfirmDeleteStory(null)} style={{ background: T.border, border: "none", borderRadius: 6, padding: "4px 8px", fontSize: 11, cursor: "pointer" }}>Cancel</button>
                                    <button onClick={() => handleDeleteStory(epic._id, story._id)} style={{ background: T.coral, color: "#fff", border: "none", borderRadius: 6, padding: "4px 8px", fontSize: 11, cursor: "pointer", fontWeight: 600 }}>Confirm</button>
                                  </div>
                                ) : (
                                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                    <span style={{ fontSize: 11, color: T.textSecondary }}>{tasks.length} {tasks.length === 1 ? "task" : "tasks"}</span>
                                    {isOwner && (
                                      <button onClick={() => setConfirmDeleteStory(story._id)} style={{ background: "none", border: "none", color: T.coral, cursor: "pointer", display: "flex" }}>
                                        <Trash2 size={13} />
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                              {storyExpanded && (
                                <div style={{ borderTop: `1px solid ${T.border}`, padding: "8px 14px" }}>
                                  {tasks.length === 0 ? (
                                    <p style={{ fontSize: 11.5, color: T.textMuted, margin: 0 }}>No tasks linked yet.</p>
                                  ) : (
                                    tasks.map(t => (
                                      <p key={t._id} style={{ fontSize: 11.5, color: T.textPrimary, margin: "4px 0" }}>• {t.title} — linked by {creatorName(t.created_by)}</p>
                                    ))
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showEpicModal && (
        <div onClick={() => setShowEpicModal(false)} style={{ position: "fixed", inset: 0, background: "rgba(30,27,46,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div onClick={e => e.stopPropagation()} style={{ ...cardStyle, width: 400, animation: "popIn 0.15s ease" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: T.textPrimary, fontFamily: fontDisplay }}>Create Epic</h3>
              <button onClick={() => setShowEpicModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: T.textMuted }}><X size={18} /></button>
            </div>
            <label style={labelStyle}>Title</label>
            <input value={epicForm.title} onChange={e => setEpicForm({ ...epicForm, title: e.target.value })} style={{ ...inputStyle, marginBottom: 14 }} />
            <label style={labelStyle}>Description</label>
            <textarea value={epicForm.description} onChange={e => setEpicForm({ ...epicForm, description: e.target.value })} rows={3} style={{ ...inputStyle, marginBottom: 20, resize: "vertical" }} />
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setShowEpicModal(false)} style={{ flex: 1, padding: 10, background: T.border, border: "none", borderRadius: 10, cursor: "pointer" }}>Cancel</button>
              <button onClick={handleCreateEpic} style={{ ...btnPrimary, flex: 1 }}>Create</button>
            </div>
          </div>
        </div>
      )}

      {showStoryModal && (
        <div onClick={() => setShowStoryModal(null)} style={{ position: "fixed", inset: 0, background: "rgba(30,27,46,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div onClick={e => e.stopPropagation()} style={{ ...cardStyle, width: 400, animation: "popIn 0.15s ease" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: T.textPrimary, fontFamily: fontDisplay }}>Add Story</h3>
              <button onClick={() => setShowStoryModal(null)} style={{ background: "none", border: "none", cursor: "pointer", color: T.textMuted }}><X size={18} /></button>
            </div>
            <label style={labelStyle}>Title</label>
            <input value={storyForm.title} onChange={e => setStoryForm({ ...storyForm, title: e.target.value })} placeholder='As a ..., I want ..., so that ...' style={{ ...inputStyle, marginBottom: 14 }} />
            <label style={labelStyle}>Description</label>
            <textarea value={storyForm.description} onChange={e => setStoryForm({ ...storyForm, description: e.target.value })} rows={3} style={{ ...inputStyle, marginBottom: 20, resize: "vertical" }} />
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setShowStoryModal(null)} style={{ flex: 1, padding: 10, background: T.border, border: "none", borderRadius: 10, cursor: "pointer" }}>Cancel</button>
              <button onClick={() => handleCreateStory(showStoryModal)} style={{ ...btnPrimary, flex: 1 }}>Create</button>
            </div>
          </div>
        </div>
      )}

      <Toast message={toast} type={toastType} onClose={() => setToast("")} />
    </Layout>
  );
}

export default Epics;