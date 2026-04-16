import React, { useEffect, useMemo, useState } from "react";
import { addNote, deleteNote, fetchNotes, updateNote } from "../services/supabaseClient";
import { applyPasteToValue, getPlainTextFromPasteEvent } from "../utils/plainTextPaste";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

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

  const handleChange = (field) => (value) => {
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
    <section className="card p-6 md:p-8 space-y-6 bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 rounded-3xl shadow-lg">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-gray-800 font-sans">Notes</h2>
          <p className="text-md text-gray-600 font-light">
            Capture paragraphs, doc-style thoughts, and quick references.
          </p>
        </div>
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
          onChange={(e) => handleChange("title")(e.target.value)}
        />
        <ReactQuill
          theme="snow"
          value={form.content}
          onChange={handleChange("content")}
          placeholder="Write your note..."
          modules={{
            toolbar: [
              [{ header: [1, 2, false] }], // Header options
              ["bold", "italic", "underline", "strike"], // Text formatting options
              [{ list: "ordered" }, { list: "bullet" }], // List options
              ["link", "image"], // Link and image options
              ["clean"], // Remove formatting
            ],
          }}
          className="rounded-2xl border border-gray-300 bg-white p-6 shadow-md w-full h-40 focus:ring-2 focus:ring-blue-400"
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
          {filteredNotes.map((note) => (
            <div
              key={note.id}
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow-md hover:shadow-lg transition"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-800 font-serif">
                  {note.title || "Untitled note"}
                </h3>
                <p className="text-xs text-gray-500">
                  {formatDateTime(note.created_at)}
                </p>
              </div>
              <div
                className="mt-3 whitespace-pre-wrap text-sm text-gray-600"
                dangerouslySetInnerHTML={{ __html: note.content }}
              />
            </div>
          ))}
        </div>
      )}
      {isMinimized && (
        <div className="rounded-2xl border border-gray-200 bg-white p-4 text-sm text-gray-600">
          Notes minimized. Click "Show notes" to expand.
        </div>
      )}
    </section>
  );
};

export default NotesBoard;
