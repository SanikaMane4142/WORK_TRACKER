import React, { useEffect, useMemo, useState } from "react";
import {
  addProject,
  addProjectNote,
  deleteProject,
  deleteProjectNote,
  fetchProjectNotes,
  fetchProjects,
  updateProjectNote,
} from "../services/supabaseClient";

const toDateKey = (value) => new Date(value).toISOString().split("T")[0];

const ProjectNotes = () => {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [notes, setNotes] = useState([]);
  const [projectName, setProjectName] = useState("");
  const [noteForm, setNoteForm] = useState({
    title: "",
    content: "",
    changedFiles: "",
    important: false,
  });
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [filterToday, setFilterToday] = useState(false);
  const [filterImportant, setFilterImportant] = useState(false);
  const [error, setError] = useState("");

  const loadProjects = async () => {
    const { data, error: loadError } = await fetchProjects();
    if (loadError) {
      setError("Unable to load projects.");
      return;
    }
    setProjects(data || []);
    if (!selectedProject && data?.length) {
      setSelectedProject(data[0]);
    }
  };

  const loadNotes = async (projectId) => {
    if (!projectId) return;
    const { data, error: loadError } = await fetchProjectNotes(projectId);
    if (loadError) {
      setError("Unable to load project notes.");
      return;
    }
    setNotes(data || []);
  };

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    loadNotes(selectedProject?.id);
  }, [selectedProject?.id]);

  const handleAddProject = async (event) => {
    event.preventDefault();
    setError("");
    if (!projectName.trim()) {
      setError("Project name is required.");
      return;
    }
    const { data, error: saveError } = await addProject({
      name: projectName.trim(),
    });
    if (saveError) {
      setError("Could not create project.");
      return;
    }
    setProjectName("");
    if (data) {
      setSelectedProject(data);
      loadNotes(data.id);
    }
    loadProjects();
  };

  const handleDeleteProject = async (projectId) => {
    await deleteProject(projectId);
    if (selectedProject?.id === projectId) {
      setSelectedProject(null);
    }
    loadProjects();
  };

  const handleNoteChange = (field) => (event) => {
    const value = field === "important" ? event.target.checked : event.target.value;
    setNoteForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddNote = async (event) => {
    event.preventDefault();
    setError("");
    if (!selectedProject?.id) {
      setError("Select a project first.");
      return;
    }
    if (!noteForm.content.trim()) {
      setError("Note content is required.");
      return;
    }
    const payload = {
      project_id: selectedProject.id,
      title: noteForm.title.trim() || "Project note",
      content: noteForm.content.trim(),
      changed_files: noteForm.changedFiles.trim(),
      important: noteForm.important,
    };
    const { error: saveError } = editingNoteId
      ? await updateProjectNote(editingNoteId, payload)
      : await addProjectNote(payload);
    if (saveError) {
      setError("Could not save project note.");
      return;
    }
    setNoteForm({ title: "", content: "", changedFiles: "", important: false });
    setEditingNoteId(null);
    loadNotes(selectedProject.id);
  };

  const filteredNotes = useMemo(() => {
    const todayKey = toDateKey(new Date());
    return notes.filter((note) => {
      if (filterImportant && !note.important) return false;
      if (filterToday && toDateKey(note.created_at) !== todayKey) return false;
      return true;
    });
  }, [notes, filterImportant, filterToday]);

  return (
    <section className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <aside className="card p-5 space-y-4">
        <div>
          <h2 className="section-title">Projects</h2>
          <p className="text-sm text-white/60">Open a project to see its notes.</p>
        </div>
        <form onSubmit={handleAddProject} className="grid gap-3">
          <input
            className="rounded-2xl bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-ocean"
            placeholder="New project name"
            value={projectName}
            onChange={(event) => setProjectName(event.target.value)}
          />
          <button className="rounded-2xl bg-mint px-4 py-2 text-xs font-semibold text-ink shadow-glow transition hover:brightness-110">
            Add project
          </button>
        </form>
        <div className="space-y-2">
          {projects.length === 0 && (
            <p className="text-sm text-white/60">No projects yet.</p>
          )}
          {projects.map((project) => (
            <button
              key={project.id}
              onClick={() => setSelectedProject(project)}
              className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm transition ${
                selectedProject?.id === project.id
                  ? "bg-white text-ink"
                  : "bg-white/10 text-white hover:bg-white/20"
              }`}
            >
              <span className="font-medium">{project.name}</span>
              <span
                className="text-xs text-white/60"
                onClick={(event) => {
                  event.stopPropagation();
                  handleDeleteProject(project.id);
                }}
              >
                Delete
              </span>
            </button>
          ))}
        </div>
      </aside>

      <div className="card p-6 md:p-8 space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="section-title">
              {selectedProject?.name || "Project Notes"}
            </h2>
            <p className="text-sm text-white/60">
              Track important notes and files changed for this project.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className={`rounded-full px-4 py-2 text-xs transition ${
                filterToday ? "bg-white text-ink" : "bg-white/10 text-white"
              }`}
              onClick={() => setFilterToday((prev) => !prev)}
            >
              {filterToday ? "Today only" : "All days"}
            </button>
            <button
              className={`rounded-full px-4 py-2 text-xs transition ${
                filterImportant ? "bg-white text-ink" : "bg-white/10 text-white"
              }`}
              onClick={() => setFilterImportant((prev) => !prev)}
            >
              {filterImportant ? "Important only" : "All notes"}
            </button>
          </div>
        </div>

        <form onSubmit={handleAddNote} className="grid gap-3">
          <input
            className="rounded-2xl bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-ocean"
            placeholder="Note title"
            value={noteForm.title}
            onChange={handleNoteChange("title")}
          />
          <textarea
            rows="4"
            className="rounded-2xl bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-ocean"
            placeholder="Important notes for this project..."
            value={noteForm.content}
            onChange={handleNoteChange("content")}
          />
          <textarea
            rows="2"
            className="rounded-2xl bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-ocean"
            placeholder="Files/folders changed today (optional)"
            value={noteForm.changedFiles}
            onChange={handleNoteChange("changedFiles")}
          />
          <label className="flex items-center gap-2 rounded-2xl bg-white/5 px-4 py-3 text-sm text-white/70">
            <input
              type="checkbox"
              checked={noteForm.important}
              onChange={handleNoteChange("important")}
              className="h-4 w-4 rounded border-white/30 bg-white/10"
            />
            Mark as important
          </label>
          <button className="w-fit rounded-2xl bg-mint px-5 py-3 text-sm font-semibold text-ink shadow-glow transition hover:brightness-110">
            {editingNoteId ? "Update project note" : "Add project note"}
          </button>
          {editingNoteId && (
            <button
              type="button"
              onClick={handleCancelEdit}
              className="w-fit rounded-2xl border border-white/20 px-5 py-3 text-sm text-white transition hover:border-white/60"
            >
              Cancel edit
            </button>
          )}
        </form>

        {error && <p className="text-sm text-rose-300">{error}</p>}

        <div className="space-y-3">
          {filteredNotes.length === 0 && (
            <p className="text-sm text-white/60">No project notes yet.</p>
          )}
          {filteredNotes.map((note) => (
            <div
              key={note.id}
              className="rounded-2xl border border-white/10 bg-white/5 p-4"
            >
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="font-display text-lg">
                    {note.title || "Project note"}
                  </h3>
                  <p className="text-xs text-white/40">
                    {new Date(note.created_at).toLocaleString("en-US")}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleEditNote(note)}
                    className="w-fit rounded-full border border-white/20 px-4 py-2 text-xs text-white transition hover:border-white/60"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() =>
                      deleteProjectNote(note.id).then(() =>
                        loadNotes(selectedProject?.id)
                      )
                    }
                    className="w-fit rounded-full border border-rose-400/50 px-4 py-2 text-xs text-rose-200 transition hover:border-rose-300"
                  >
                    Delete
                  </button>
                </div>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm text-white/70">
                {note.content}
              </p>
              {note.changed_files && (
                <p className="mt-3 text-xs text-white/50">
                  Files changed: {note.changed_files}
                </p>
              )}
              {note.important && (
                <span className="mt-3 inline-flex rounded-full bg-rose-500/20 px-3 py-1 text-xs text-rose-200">
                  Important
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProjectNotes;
  const handleEditNote = (note) => {
    setNoteForm({
      title: note.title || "",
      content: note.content || "",
      changedFiles: note.changed_files || "",
      important: Boolean(note.important),
    });
    setEditingNoteId(note.id);
  };

  const handleCancelEdit = () => {
    setNoteForm({ title: "", content: "", changedFiles: "", important: false });
    setEditingNoteId(null);
  };
