import React, { useEffect, useMemo, useState } from "react";
import {
  addProject,
  addProjectNote,
  deleteProject,
  deleteProjectNote,
  fetchProjectNotes,
  fetchProjects,
  deleteProjectNotePhotos,
  uploadProjectNotePhotos,
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
    photos: [],
  });
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [filterToday, setFilterToday] = useState(false);
  const [filterImportant, setFilterImportant] = useState(false);
  const [error, setError] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const MAX_PHOTOS = 6;

  const normalizePhotoUrls = (value) => {
    if (Array.isArray(value)) return value.filter(Boolean);
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) return [];
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed.filter(Boolean);
      } catch {
        return [trimmed];
      }
    }
    return [];
  };

  const normalizePhotoItems = (value) =>
    normalizePhotoUrls(value).map((url) => ({ kind: "existing", url }));

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

  const handlePhotoUpload = async (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    const imageFiles = files.filter((file) => file.type.startsWith("image/"));
    if (imageFiles.length === 0) {
      setError("Only image files are supported.");
      event.target.value = "";
      return;
    }

    if (noteForm.photos.length + imageFiles.length > MAX_PHOTOS) {
      setError(`You can add up to ${MAX_PHOTOS} photos per note.`);
      event.target.value = "";
      return;
    }

    try {
      setNoteForm((prev) => ({
        ...prev,
        photos: [
          ...prev.photos,
          ...imageFiles.map((file) => ({
            kind: "new",
            file,
            preview: URL.createObjectURL(file),
          })),
        ],
      }));
      setError("");
    } catch {
      setError("Could not read one of the images. Try a smaller file.");
    } finally {
      event.target.value = "";
    }
  };

  const handleRemovePhoto = async (index) => {
    const target = noteForm.photos[index];
    if (!target) return;

    if (target.kind === "existing") {
      const { error: deleteError } = await deleteProjectNotePhotos([target.url]);
      if (deleteError) {
        setError("Could not delete photo from storage.");
        return;
      }
    }

    if (target.kind === "new" && target.preview) {
      URL.revokeObjectURL(target.preview);
    }

    setNoteForm((prev) => ({
      ...prev,
      photos: prev.photos.filter((_, idx) => idx !== index),
    }));
    setError("");
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
    const existingUrls = noteForm.photos
      .filter((photo) => photo.kind === "existing")
      .map((photo) => photo.url);
    const newFiles = noteForm.photos
      .filter((photo) => photo.kind === "new")
      .map((photo) => photo.file);

    let uploadedUrls = [];
    if (newFiles.length > 0) {
      const { data: uploadUrls, error: uploadError } = await uploadProjectNotePhotos(
        selectedProject.id,
        newFiles
      );
      if (uploadError) {
        const message = uploadError.message || "Could not upload photos.";
        setError(`${message} Check your storage bucket access.`);
        return;
      }
      uploadedUrls = uploadUrls || [];
    }

    const payload = {
      project_id: selectedProject.id,
      title: noteForm.title.trim() || "Project note",
      content: noteForm.content.trim(),
      changed_files: noteForm.changedFiles.trim(),
      important: noteForm.important,
      photo_urls: [...existingUrls, ...uploadedUrls],
    };
    const { error: saveError } = editingNoteId
      ? await updateProjectNote(editingNoteId, payload)
      : await addProjectNote(payload);
    if (saveError) {
      setError("Could not save project note.");
      return;
    }
    noteForm.photos.forEach((photo) => {
      if (photo.kind === "new" && photo.preview) {
        URL.revokeObjectURL(photo.preview);
      }
    });
    setNoteForm({
      title: "",
      content: "",
      changedFiles: "",
      important: false,
      photos: [],
    });
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

  const handleEditNote = (note) => {
    setNoteForm({
      title: note.title || "",
      content: note.content || "",
      changedFiles: note.changed_files || "",
      important: Boolean(note.important),
      photos: normalizePhotoItems(note.photo_urls),
    });
    setEditingNoteId(note.id);
    setError("");
  };

  const handleCancelEdit = () => {
    noteForm.photos.forEach((photo) => {
      if (photo.kind === "new" && photo.preview) {
        URL.revokeObjectURL(photo.preview);
      }
    });
    setNoteForm({ title: "", content: "", changedFiles: "", important: false, photos: [] });
    setEditingNoteId(null);
    setError("");
  };

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
          <div className="grid gap-2">
            <label className="text-xs text-white/60">
              Add photos (up to {MAX_PHOTOS})
            </label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handlePhotoUpload}
              className="rounded-2xl bg-white/10 px-4 py-3 text-sm text-white file:mr-4 file:rounded-full file:border-0 file:bg-white/20 file:px-4 file:py-2 file:text-xs file:text-white/80"
            />
            {noteForm.photos.length > 0 && (
              <div className="flex flex-wrap gap-3">
                {noteForm.photos.map((photo, index) => (
                  <div
                    key={`${photo.kind}-${photo.url || photo.preview}-${index}`}
                    className="relative h-20 w-20 overflow-hidden rounded-2xl border border-white/10"
                  >
                    <img
                      src={photo.kind === "existing" ? photo.url : photo.preview}
                      alt="Project note"
                      className="h-full w-full object-cover"
                      onClick={() =>
                        setPreviewUrl(
                          photo.kind === "existing" ? photo.url : photo.preview
                        )
                      }
                    />
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(index)}
                      className="absolute right-1 top-1 rounded-full bg-ink/80 px-2 py-1 text-[10px] text-white"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
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
          {filteredNotes.map((note) => {
            const photoUrls = normalizePhotoUrls(note.photo_urls);
            return (
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
              {photoUrls.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-3">
                  {photoUrls.map((photo, index) => (
                    <div
                      key={`${note.id}-photo-${index}`}
                      className="h-20 w-20 overflow-hidden rounded-2xl border border-white/10"
                    >
                      <img
                        src={photo}
                        alt="Project note"
                        className="h-full w-full object-cover"
                        onClick={() => setPreviewUrl(photo)}
                      />
                    </div>
                  ))}
                </div>
              )}
              {note.important && (
                <span className="mt-3 inline-flex rounded-full bg-rose-500/20 px-3 py-1 text-xs text-rose-200">
                  Important
                </span>
              )}
              </div>
            );
          })}
        </div>
      </div>
      {previewUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 p-6"
          onClick={() => setPreviewUrl("")}
          role="presentation"
        >
          <div
            className="relative max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-3xl border border-white/10 bg-slate-950/90 p-4"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="absolute right-4 top-4 rounded-full border border-white/20 px-3 py-1 text-xs text-white/80 transition hover:border-white/60"
              onClick={() => setPreviewUrl("")}
            >
              Close
            </button>
            <img
              src={previewUrl}
              alt="Preview"
              className="max-h-[80vh] w-full rounded-2xl object-contain"
            />
          </div>
        </div>
      )}
    </section>
  );
};

export default ProjectNotes;
