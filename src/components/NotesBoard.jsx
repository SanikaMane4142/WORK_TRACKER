import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
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
  const quillRef = useRef(null);
  const [form, setForm] = useState({ title: "", content: "" });
  const [notes, setNotes] = useState([]);
  const [deletedNotes, setDeletedNotes] = useState([]); // Recycle bin state
  const [showRecycleBin, setShowRecycleBin] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
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

  const stickers = [
    '📸', '🎉', '❤️', '🔥', '⭐', '🌟', '💫', '✨', '🎈', '🎁',
    '🍕', '🍔', '🌮', '☕', '🍩', '🎂', '🍦', '🍉', '🥑', '🍍',
    '🐱', '🐶', '🦄', '🐼', '🦋', '🐢', '🦞', '🐙', '🌈', '☀️'
  ];

  const insertSticker = useCallback((sticker) => {
    if (quillRef.current) {
      const quill = quillRef.current.getEditor();
      const range = quill.getSelection();
      quill.insertEmbed(range ? range.index : 0, 'emoji-sticker', sticker);
      setShowEmojiPicker(false);
    }
  }, []);

  const handleEmojiSticker = () => {
    setShowEmojiPicker(true);
  };

  const quillModules = {
    toolbar: {
      container: [
        [{ header: [1, 2, false] }],
        ["bold", "italic", "underline", "strike"],
        [{ list: "ordered" }, { list: "bullet" }],
        ["link"],
        ["emoji-sticker"],
        ["image"],
        ["clean"],
      ],
      handlers: {
        'emoji-sticker': handleEmojiSticker
      }
    }
  };


  // Move note to recycle bin instead of deleting permanently
  const handleDelete = async (noteId) => {
    const noteToDelete = notes.find((n) => n.id === noteId);
    if (noteToDelete) {
      setDeletedNotes((prev) => [...prev, { ...noteToDelete, deletedAt: new Date().toISOString() }]);
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
    }
    // Optionally, you can still call deleteNote(noteId) to remove from backend, or keep for permanent delete
    // await deleteNote(noteId);
    // loadNotes();
  };

  // Restore note from recycle bin
  const handleRestore = (noteId) => {
    const noteToRestore = deletedNotes.find((n) => n.id === noteId);
    if (noteToRestore) {
      setNotes((prev) => [...prev, noteToRestore]);
      setDeletedNotes((prev) => prev.filter((n) => n.id !== noteId));
    }
  };

  // Permanently delete note from recycle bin
  const handlePermanentDelete = (noteId) => {
    setDeletedNotes((prev) => prev.filter((n) => n.id !== noteId));
    // Optionally, call deleteNote(noteId) here for backend
  };

  return (
    <React.Fragment>
      {/* Recycle Bin Modal (always rendered at top level for overlay) */}
      {showRecycleBin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-bold mb-4">Recycle Bin</h3>
            {deletedNotes.length === 0 ? (
              <p className="text-gray-500">No deleted notes.</p>
            ) : (
              <ul className="space-y-3 max-h-64 overflow-y-auto">
                {deletedNotes.map((note) => (
                  <li key={note.id} className="flex items-center justify-between border-b pb-2">
                    <div>
                      <div className="font-semibold">{note.title || 'Untitled'}</div>
                      <div className="text-xs text-gray-400">Deleted: {formatDateTime(note.deletedAt)}</div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                        onClick={() => handleRestore(note.id)}
                      >Restore</button>
                      <button
                        className="px-2 py-1 text-xs bg-rose-100 text-rose-700 rounded hover:bg-rose-200"
                        onClick={() => handlePermanentDelete(note.id)}
                      >Delete</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <button
              className="mt-4 w-full rounded bg-gray-200 py-2 text-gray-700 hover:bg-gray-300"
              onClick={() => setShowRecycleBin(false)}
            >Close</button>
          </div>
        </div>
      )}
      {showEmojiPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40" onClick={() => setShowEmojiPicker(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold mb-6 text-gray-800">Stickers & Emojis 📸</h3>
            <div className="grid grid-cols-6 gap-3 mb-6">
              {stickers.map((sticker) => (
                <button
                  key={sticker}
                  className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-400 to-pink-500 text-2xl flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-200 text-white"
                  onClick={() => insertSticker(sticker)}
                >
                  {sticker}
                </button>
              ))}
            </div>
            <button
              className="w-full rounded-2xl bg-gray-200 py-3 text-gray-700 font-semibold hover:bg-gray-300 transition"
              onClick={() => setShowEmojiPicker(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
      <section className="card p-6 md:p-8 space-y-6 bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 rounded-3xl shadow-lg">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-extrabold text-gray-800 font-sans">Notes</h2>
            <p className="text-md text-gray-600 font-light">
              Capture paragraphs, doc-style thoughts, and quick references.
            </p>
          </div>
          <button
            className="rounded-full border border-gray-400/50 px-4 py-2 text-xs text-gray-700 bg-white hover:bg-gray-100 transition"
            onClick={() => setShowRecycleBin(true)}
          >
            🗑️ Recycle Bin ({deletedNotes.length})
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
            onChange={(e) => handleChange("title")(e.target.value)}
          />
          <ReactQuill
            theme="snow"
            value={form.content}
            onChange={handleChange("content")}
            placeholder="Write your note... 💫 Add stickers! 📸"
            modules={quillModules}
            ref={quillRef}
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
      </React.Fragment>
  );
};

export default NotesBoard;
