import React, { useEffect, useMemo, useState } from "react";
import { addNote, fetchNotes, updateNote } from "../services/supabaseClient";

const NOTES_COLLAPSED_KEY = "work_tracker:notes_collapsed";

const escapeHtml = (value = "") =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const plainTextToSafeHtml = (value = "") => escapeHtml(value).replaceAll("\n", "<br/>");

const htmlToPlainText = (value = "") => {
  if (!value) return "";
  if (typeof document === "undefined") return value;
  const el = document.createElement("div");
  el.innerHTML = value;
  return el.textContent || "";
};

const stripHtml = (value = "") => value.replace(/<[^>]*>/g, " ");

const formatDateTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const TrashIcon = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <path
      d="M9 3h6m-8 4h10M10 7v12m4-12v12M6 7l1 14h10l1-14"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const PencilIcon = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <path d="M12 20h9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path
      d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4L16.5 3.5Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const NotesBoard = ({ searchQuery = "" }) => {
  const [form, setForm] = useState({ title: "", content: "" });
  const [notes, setNotes] = useState([]);
  const [deletedNotes, setDeletedNotes] = useState([]);
  const [showRecycleBin, setShowRecycleBin] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [collapsedNoteIds, setCollapsedNoteIds] = useState(() => new Set());

  const loadNotes = async () => {
    const { data, error: loadError } = await fetchNotes();
    if (loadError) {
      setError("Unable to load notes. Check Supabase permissions.");
      return;
    }
    setNotes(data || []);
  };

  useEffect(() => {
    loadNotes();
  }, []);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(NOTES_COLLAPSED_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) setCollapsedNoteIds(new Set(parsed.filter(Boolean)));
    } catch {
      // ignore storage errors
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        NOTES_COLLAPSED_KEY,
        JSON.stringify(Array.from(collapsedNoteIds))
      );
    } catch {
      // ignore storage errors
    }
  }, [collapsedNoteIds]);

  const filteredNotes = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return notes;
    return notes.filter((note) => {
      const haystack = [
        note.title,
        stripHtml(note.content || ""),
        note.created_at,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [notes, searchQuery]);

  const handleChange = (field) => (event) => {
    const value = event?.target?.value ?? "";
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!form.content.trim()) {
      setError("Note content is required.");
      return;
    }

    setSaving(true);
    const payload = {
      title: form.title.trim() || "Untitled note",
      content: plainTextToSafeHtml(form.content.trim()),
    };

    const { error: saveError } = editingId
      ? await updateNote(editingId, payload)
      : await addNote(payload);

    setSaving(false);
    if (saveError) {
      setError("Could not save note.");
      return;
    }

    setForm({ title: "", content: "" });
    setEditingId(null);
    loadNotes();
  };

  const handleEdit = (note) => {
    setForm({
      title: note.title || "",
      content: htmlToPlainText(note.content || ""),
    });
    setEditingId(note.id);
    setError("");
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setForm({ title: "", content: "" });
    setError("");
  };

  const toggleNoteCollapsed = (noteId) => {
    setCollapsedNoteIds((prev) => {
      const next = new Set(prev);
      if (next.has(noteId)) next.delete(noteId);
      else next.add(noteId);
      return next;
    });
  };

  const handleDelete = (noteId) => {
    const noteToDelete = notes.find((n) => n.id === noteId);
    if (noteToDelete) {
      setDeletedNotes((prev) => [
        ...prev,
        { ...noteToDelete, deletedAt: new Date().toISOString() },
      ]);
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
    }
  };

  const handleRestore = (noteId) => {
    const noteToRestore = deletedNotes.find((n) => n.id === noteId);
    if (!noteToRestore) return;
    setNotes((prev) => [noteToRestore, ...prev]);
    setDeletedNotes((prev) => prev.filter((n) => n.id !== noteId));
  };

  const handlePermanentDelete = (noteId) => {
    setDeletedNotes((prev) => prev.filter((n) => n.id !== noteId));
  };

  return (
    <>
      {showRecycleBin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-slate-800">Recycle Bin</h3>
            <p className="mt-1 text-xs text-slate-500">
              Restore or permanently delete notes.
            </p>

            <div className="mt-4 max-h-72 space-y-3 overflow-y-auto">
              {deletedNotes.length === 0 ? (
                <p className="text-sm text-slate-500">No deleted notes.</p>
              ) : (
                deletedNotes.map((note) => (
                  <div
                    key={note.id}
                    className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-slate-800">
                        {note.title || "Untitled"}
                      </div>
                      <div className="text-xs text-slate-500">
                        Deleted: {formatDateTime(note.deletedAt)}
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs text-emerald-700 transition hover:bg-emerald-50"
                        onClick={() => handleRestore(note.id)}
                      >
                        Restore
                      </button>
                      <button
                        type="button"
                        className="rounded-full border border-rose-200 bg-white px-3 py-1 text-xs text-rose-700 transition hover:bg-rose-50"
                        onClick={() => handlePermanentDelete(note.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <button
              type="button"
              className="mt-5 w-full rounded-xl bg-slate-200 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-300"
              onClick={() => setShowRecycleBin(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}

      <section className="card p-6 md:p-8 space-y-6 bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 rounded-3xl shadow-lg">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-extrabold text-gray-800 font-sans">
              Notes
            </h2>
            <p className="text-md text-gray-600 font-light">
              Capture paragraphs, doc-style thoughts, and quick references.
            </p>
          </div>
          <button
            type="button"
            className="rounded-full border border-gray-400/50 px-4 py-2 text-xs text-gray-700 bg-white hover:bg-gray-100 transition"
            onClick={() => setShowRecycleBin(true)}
          >
            <span className="inline-flex items-center gap-2">
              <TrashIcon className="h-4 w-4" />
              Recycle Bin ({deletedNotes.length})
            </span>
          </button>
        </div>

        <div>
          <button
            type="button"
            onClick={() => setIsMinimized((prev) => !prev)}
            className="w-fit rounded-full border border-gray-300 px-4 py-2 text-sm text-gray-700 bg-white shadow-md hover:bg-gray-100 transition"
          >
            {isMinimized ? "Show notes" : "Minimize notes"}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-4 bg-white p-6 rounded-2xl shadow-md">
          <input
            className="rounded-full bg-gray-100 px-4 py-3 text-sm text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="Title (optional)"
            value={form.title}
            onChange={handleChange("title")}
          />
          <textarea
            rows={6}
            className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-800 shadow-md focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="Write your note..."
            value={form.content}
            onChange={handleChange("content")}
          />
          <button
            className="w-full rounded-full bg-gradient-to-r from-green-400 to-blue-500 px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:brightness-110 disabled:opacity-60"
            disabled={saving}
          >
            {saving ? "Saving..." : editingId ? "Update note" : "Add note"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={handleCancelEdit}
              className="w-fit rounded-full border border-gray-300 px-5 py-3 text-sm text-gray-700 bg-white shadow-md hover:bg-gray-100 transition"
            >
              Cancel edit
            </button>
          )}
        </form>

        {error && <p className="text-sm text-red-500 font-medium">{error}</p>}

        {!isMinimized && (
          <div className="space-y-4">
            {filteredNotes.length === 0 && (
              <p className="text-sm text-gray-600">No notes yet.</p>
            )}
            {filteredNotes.map((note) => {
              const isCollapsed = collapsedNoteIds.has(note.id);
              return (
                <div
                  key={note.id}
                  className="rounded-2xl border border-gray-200 bg-white p-6 shadow-md hover:shadow-lg transition"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0">
                      <h3 className="truncate text-lg font-bold text-gray-800 font-serif">
                        {note.title || "Untitled note"}
                      </h3>
                      <p className="text-xs text-gray-500">
                        {formatDateTime(note.created_at)}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleNoteCollapsed(note.id)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 bg-white text-base font-semibold leading-none text-gray-700 shadow-sm transition hover:bg-gray-100"
                        aria-label={isCollapsed ? "Expand note" : "Minimize note"}
                        title={isCollapsed ? "Expand note" : "Minimize note"}
                      >
                        {isCollapsed ? "+" : "−"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEdit(note)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-700 shadow-sm transition hover:bg-gray-100"
                        aria-label="Edit note"
                        title="Edit note"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(note.id)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-rose-300 bg-white text-rose-500 shadow-sm transition hover:bg-rose-50"
                        aria-label="Delete note"
                        title="Delete note"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {!isCollapsed && note.content && (
                    <div
                      className="mt-3 whitespace-pre-wrap text-sm text-gray-600"
                      dangerouslySetInnerHTML={{ __html: note.content }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {isMinimized && (
          <div className="rounded-2xl border border-gray-200 bg-white p-4 text-sm text-gray-600">
            Notes minimized. Click &quot;Show notes&quot; to expand.
          </div>
        )}
      </section>
    </>
  );
};

export default NotesBoard;

