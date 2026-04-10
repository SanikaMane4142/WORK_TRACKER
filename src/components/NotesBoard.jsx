import React, { useEffect, useMemo, useState } from "react";
import {
  addNote,
  deleteNote,
  fetchNotes,
  updateNote,
} from "../services/supabaseClient";
import {
  applyPasteToValue,
  getPlainTextFromPasteEvent,
} from "../utils/plainTextPaste";

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

const NotesBoard = ({ searchQuery = "" }) => {
  const [form, setForm] = useState({ title: "", content: "" });
  const [notes, setNotes] = useState([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [editingId, setEditingId] = useState(null);

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

  const filteredNotes = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return notes;
    return notes.filter((note) => {
      const haystack = [note.title, note.content, note.created_at]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [notes, searchQuery]);

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handlePlainTextPaste = (field) => (event) => {
    const pastedText = getPlainTextFromPasteEvent(event);
    if (!pastedText) return;
    event.preventDefault();

    const target = event.target;
    const selectionStart = target?.selectionStart;
    const selectionEnd = target?.selectionEnd;

    let nextCursor = null;
    setForm((prev) => {
      const currentValue = prev[field] ?? "";
      const next = applyPasteToValue({
        value: currentValue,
        pasteText: pastedText,
        selectionStart,
        selectionEnd,
      });
      nextCursor = next.nextCursor;
      return { ...prev, [field]: next.nextValue };
    });

    if (typeof nextCursor === "number" && target && "setSelectionRange" in target) {
      requestAnimationFrame(() => {
        target.setSelectionRange(nextCursor, nextCursor);
      });
    }
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
      content: form.content.trim(),
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
      content: note.content || "",
    });
    setEditingId(note.id);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setForm({ title: "", content: "" });
  };

  const handleDelete = async (noteId) => {
    await deleteNote(noteId);
    loadNotes();
  };

  return (
    <section className="card p-6 md:p-8 space-y-6 animate-floatIn">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="section-title">Notes</h2>
          <p className="text-sm text-white/60">
            Capture paragraphs, doc-style thoughts, and quick references.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsMinimized((prev) => !prev)}
          className="w-fit rounded-full border border-white/20 px-4 py-2 text-xs text-white transition hover:border-white/60"
        >
          {isMinimized ? "Show notes" : "Minimize notes"}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-3">
        <input
          className="rounded-2xl bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-ocean"
          placeholder="Title (optional)"
          value={form.title}
          onChange={handleChange("title")}
        />
        <textarea
          rows="5"
          className="rounded-2xl bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-ocean"
          placeholder="Write your note..."
          value={form.content}
          onChange={handleChange("content")}
          onPaste={handlePlainTextPaste("content")}
        />
        <button
          className="w-fit rounded-2xl bg-mint px-5 py-3 text-sm font-semibold text-ink shadow-glow transition hover:brightness-110 disabled:opacity-60"
          disabled={saving}
        >
          {saving ? "Saving..." : editingId ? "Update note" : "Add note"}
        </button>
        {editingId && (
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

      {!isMinimized && (
        <div className="space-y-3">
          {filteredNotes.length === 0 && (
            <p className="text-sm text-white/60">No notes yet.</p>
          )}
          {filteredNotes.map((note) => (
            <div
              key={note.id}
              className="rounded-2xl border border-white/10 bg-white/5 p-4"
            >
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="font-display text-lg">{note.title || "Untitled note"}</h3>
                  <p className="text-xs text-white/40">
                    {formatDateTime(note.created_at)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleEdit(note)}
                    className="w-fit rounded-full border border-white/20 px-4 py-2 text-xs text-white transition hover:border-white/60"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(note.id)}
                    className="w-fit rounded-full border border-rose-400/50 px-4 py-2 text-xs text-rose-200 transition hover:border-rose-300"
                  >
                    Delete
                  </button>
                </div>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm text-white/70">
                {note.content}
              </p>
            </div>
          ))}
        </div>
      )}
      {isMinimized && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">
          Notes minimized. Click "Show notes" to expand.
        </div>
      )}
    </section>
  );
};

export default NotesBoard;
