import React, { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
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
    changedFiles: "",
    important: false,
    content: "",
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

  const normalizePhotoItems = (note) => {
    if (Array.isArray(note?.photo_items)) {
      return note.photo_items.map((item, index) => ({
        id: `${note.id}-photo-${index}`,
        url: item?.url || "",
        description: item?.description || "",
      }));
    }
    const photoUrls = normalizePhotoUrls(note?.photo_urls);
    return photoUrls.map((url, index) => ({
      id: `${note.id}-photo-${index}`,
      url,
      description: "",
    }));
  };

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

  const handleRemovePhoto = async (photoId) => {
    const target = noteForm.photos.find((photo) => photo.id === photoId);
    if (!target) return;

    if (target.url) {
      const { error: deleteError } = await deleteProjectNotePhotos([target.url]);
      if (deleteError) {
        setError("Could not delete photo from storage.");
        return;
      }
    }

    if (target.preview) {
      URL.revokeObjectURL(target.preview);
    }

    setNoteForm((prev) => ({
      ...prev,
      photos: prev.photos.filter((photo) => photo.id !== photoId),
    }));
    setError("");
  };

  const handleAddPhoto = () => {
    const imageCount = noteForm.photos.length;
    if (imageCount >= MAX_PHOTOS) {
      setError(`You can add up to ${MAX_PHOTOS} photos per note.`);
      return;
    }
    setNoteForm((prev) => ({
      ...prev,
      photos: [
        ...prev.photos,
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          file: null,
          preview: "",
          url: "",
          description: "",
        },
      ],
    }));
  };

  const handlePhotoFileSelect = (photoId) => async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Only image files are supported.");
      event.target.value = "";
      return;
    }
    setNoteForm((prev) => ({
      ...prev,
      photos: prev.photos.map((photo) => {
        if (photo.id !== photoId) return photo;
        if (photo.preview) URL.revokeObjectURL(photo.preview);
        return {
          ...photo,
          file,
          preview: URL.createObjectURL(file),
          url: "",
        };
      }),
    }));
    setError("");
    event.target.value = "";
  };

  const handlePhotoDescriptionChange = (photoId) => (event) => {
    const value = event.target.value;
    setNoteForm((prev) => ({
      ...prev,
      photos: prev.photos.map((photo) =>
        photo.id === photoId ? { ...photo, description: value } : photo
      ),
    }));
  };
  const handleAddNote = async (event) => {
    event.preventDefault();
    setError("");
    if (!selectedProject?.id) {
      setError("Select a project first.");
      return;
    }
    const hasContent =
      noteForm.content.trim() ||
      noteForm.photos.some((photo) => photo.url || photo.preview || photo.file);
    if (!hasContent) {
      setError("Add some text or at least one photo.");
      return;
    }

    const newFiles = noteForm.photos.filter((photo) => photo.file).map((photo) => photo.file);

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

    let uploadIndex = 0;
    const resolvedPhotos = noteForm.photos.map((photo) => {
      if (photo.file) {
        const nextUrl = uploadedUrls[uploadIndex];
        uploadIndex += 1;
        return {
          ...photo,
          url: nextUrl || "",
          file: null,
          preview: "",
        };
      }
      return photo;
    });

    const photoUrls = resolvedPhotos.map((photo) => photo.url).filter(Boolean);
    const photoItems = resolvedPhotos
      .filter((photo) => photo.url)
      .map((photo) => ({
        url: photo.url,
        description: photo.description || "",
      }));

    const payload = {
      project_id: selectedProject.id,
      title: noteForm.title.trim() || "Project note",
      content: noteForm.content.trim(),
      changed_files: noteForm.changedFiles.trim(),
      important: noteForm.important,
      photo_urls: photoUrls,
      photo_items: photoItems,
    };
    const { error: saveError } = editingNoteId
      ? await updateProjectNote(editingNoteId, payload)
      : await addProjectNote(payload);
    if (saveError) {
      setError("Could not save project note.");
      return;
    }
    noteForm.photos.forEach((photo) => {
      if (photo.preview) {
        URL.revokeObjectURL(photo.preview);
      }
    });
    setNoteForm({
      title: "",
      changedFiles: "",
      important: false,
      content: "",
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
      photos: normalizePhotoItems(note).map((item) => ({
        ...item,
        file: null,
        preview: "",
      })),
    });
    setEditingNoteId(note.id);
    setError("");
  };

  const handleCancelEdit = () => {
    noteForm.photos.forEach((photo) => {
      if (photo.preview) {
        URL.revokeObjectURL(photo.preview);
      }
    });
    setNoteForm({
      title: "",
      changedFiles: "",
      important: false,
      content: "",
      photos: [],
    });
    setEditingNoteId(null);
    setError("");
  };

  const formatNoteContent = (content) => {
    if (!content) return "";
    if (content.includes("|")) return content;
    const lines = content.split(/\r?\n/);
    const hasMarker = lines.some((line) => line.trim().toUpperCase() === "TABLE");
    if (!hasMarker) return content;
    const output = [];
    let i = 0;
    const splitBySpaces = (value) =>
      value
        .trim()
        .split(/\s{2,}/)
        .map((cell) => cell.trim())
        .filter(Boolean);
    let convertNextBlock = false;
    while (i < lines.length) {
      const line = lines[i];
      if (line?.trim().toUpperCase() === "TABLE") {
        convertNextBlock = true;
        i += 1;
        continue;
      }
      const hasTabs = line?.includes("\t");
      const spaceCells = line ? splitBySpaces(line) : [];
      const hasSpaceTable = spaceCells.length >= 2;
      if (!line || (!convertNextBlock && (!hasTabs && !hasSpaceTable))) {
        output.push(line);
        i += 1;
        continue;
      }
      if (!convertNextBlock) {
        output.push(line);
        i += 1;
        continue;
      }
      const block = [];
      while (
        i < lines.length &&
        lines[i] &&
        (lines[i].includes("\t") || splitBySpaces(lines[i]).length >= 2)
      ) {
        block.push(lines[i]);
        i += 1;
      }
      if (block.length >= 2) {
        const headerCells = block[0].includes("\t")
          ? block[0].split("\t").map((cell) => cell.trim())
          : splitBySpaces(block[0]);
        const separator = headerCells.map(() => "---");
        output.push(`| ${headerCells.join(" | ")} |`);
        output.push(`| ${separator.join(" | ")} |`);
        block.slice(1).forEach((row) => {
          const cells = row.includes("\t")
            ? row.split("\t").map((cell) => cell.trim())
            : splitBySpaces(row);
          output.push(`| ${cells.join(" | ")} |`);
        });
        convertNextBlock = false;
      } else {
        output.push(...block);
        convertNextBlock = false;
      }
      if (i < lines.length && lines[i] === "") {
        output.push("");
        i += 1;
      }
    }
    return output.join("\n");
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
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs text-white/60">
                Photos with descriptions (up to {MAX_PHOTOS})
              </label>
              <button
                type="button"
                onClick={handleAddPhoto}
                className="rounded-full border border-white/20 px-3 py-1 text-[11px] text-white transition hover:border-white/60"
              >
                Add photo
              </button>
            </div>
            {noteForm.photos.map((photo) => (
              <div
                key={photo.id}
                className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3"
              >
                <div className="flex items-center justify-between text-xs text-white/60">
                  <span>Photo</span>
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(photo.id)}
                    className="rounded-full border border-white/20 px-3 py-1 text-[11px] text-white transition hover:border-white/60"
                  >
                    Remove
                  </button>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoFileSelect(photo.id)}
                  className="rounded-2xl bg-white/10 px-4 py-3 text-sm text-white file:mr-4 file:rounded-full file:border-0 file:bg-white/20 file:px-4 file:py-2 file:text-xs file:text-white/80"
                />
                {(photo.preview || photo.url) && (
                  <div className="relative h-32 w-32 overflow-hidden rounded-2xl border border-white/10">
                    <img
                      src={photo.preview || photo.url}
                      alt="Project note"
                      className="h-full w-full object-cover"
                      onClick={() => setPreviewUrl(photo.preview || photo.url)}
                    />
                  </div>
                )}
                <input
                  className="rounded-2xl bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-ocean"
                  placeholder="Description for this photo"
                  value={photo.description}
                  onChange={handlePhotoDescriptionChange(photo.id)}
                />
              </div>
            ))}
          </div>
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
          {filteredNotes.map((note) => {
            const photoItems = normalizePhotoItems(note);
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
              {note.changed_files && (
                <p className="mt-3 text-xs text-white/50">
                  Files changed: {note.changed_files}
                </p>
              )}
              {note.content && (
                <div className="mt-3 project-note-markdown">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {formatNoteContent(note.content)}
                  </ReactMarkdown>
                </div>
              )}
              {photoItems.length > 0 && (
                <div className="mt-3 space-y-3">
                  {photoItems.map((photo, index) => (
                    <div key={`${note.id}-photo-${index}`} className="space-y-2">
                      {photo.url && (
                        <div className="h-24 w-24 overflow-hidden rounded-2xl border border-white/10">
                          <img
                            src={photo.url}
                            alt="Project note"
                            className="h-full w-full object-cover"
                            onClick={() => setPreviewUrl(photo.url)}
                          />
                        </div>
                      )}
                      {photo.description && (
                        <p className="text-xs text-white/60">{photo.description}</p>
                      )}
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
