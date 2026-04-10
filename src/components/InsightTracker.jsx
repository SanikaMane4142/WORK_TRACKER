import React, { useMemo, useState } from "react";
import { updateTask } from "../services/supabaseClient";
import {
  applyPasteToValue,
  getPlainTextFromPasteEvent,
} from "../utils/plainTextPaste";

const InsightTracker = ({ tasks = [], onSaved }) => {
  const [selectedId, setSelectedId] = useState("");
  const [notes, setNotes] = useState("");
  const [confidenceBefore, setConfidenceBefore] = useState("");
  const [confidenceAfter, setConfidenceAfter] = useState("");
  const [status, setStatus] = useState("");

  const selectedTask = useMemo(
    () => tasks.find((task) => String(task.id) === String(selectedId)),
    [tasks, selectedId]
  );

  const handleLoad = () => {
    if (!selectedTask) return;
    setNotes(selectedTask.description || "");
  };

  const handleSave = async () => {
    if (!selectedTask) return;
    setStatus("Saving...");

    const payload = `${notes}\n\nConfidence before: ${confidenceBefore}\nConfidence after: ${confidenceAfter}`.trim();

    const { error } = await updateTask(selectedTask.id, {
      description: payload,
    });

    if (error) {
      setStatus("Save failed");
    } else {
      setStatus("Saved");
      onSaved?.();
    }
  };

  const handlePlainTextPaste = (event) => {
    const pastedText = getPlainTextFromPasteEvent(event);
    if (!pastedText) return;
    event.preventDefault();

    const target = event.target;
    const selectionStart = target?.selectionStart;
    const selectionEnd = target?.selectionEnd;

    let nextCursor = null;
    setNotes((prev) => {
      const next = applyPasteToValue({
        value: prev ?? "",
        pasteText: pastedText,
        selectionStart,
        selectionEnd,
      });
      nextCursor = next.nextCursor;
      return next.nextValue;
    });

    if (typeof nextCursor === "number" && target && "setSelectionRange" in target) {
      requestAnimationFrame(() => {
        target.setSelectionRange(nextCursor, nextCursor);
      });
    }
  };

  return (
    <section className="card p-6 md:p-8 space-y-6 animate-floatIn">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="section-title">Insight Tracker</h2>
          <p className="text-sm text-white/60">
            Capture task-level notes and confidence shifts.
          </p>
        </div>
        <button
          className="rounded-full border border-white/20 px-4 py-2 text-xs text-white/70 transition hover:border-white/60"
          disabled
        >
          Auto-generate daily summary (soon)
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-[2fr_1fr_1fr_auto]">
        <select
          className="rounded-2xl bg-white/10 px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-ocean"
          value={selectedId}
          onChange={(event) => setSelectedId(event.target.value)}
        >
          <option value="">Select a task</option>
          {tasks.map((task) => (
            <option key={task.id} value={task.id}>
              {task.title}
            </option>
          ))}
        </select>
        <input
          type="number"
          min="1"
          max="10"
          className="rounded-2xl bg-white/10 px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-ocean"
          placeholder="Confidence before"
          value={confidenceBefore}
          onChange={(event) => setConfidenceBefore(event.target.value)}
        />
        <input
          type="number"
          min="1"
          max="10"
          className="rounded-2xl bg-white/10 px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-ocean"
          placeholder="Confidence after"
          value={confidenceAfter}
          onChange={(event) => setConfidenceAfter(event.target.value)}
        />
        <button
          onClick={handleLoad}
          className="rounded-2xl border border-white/20 px-4 py-3 text-xs text-white transition hover:border-white/60"
        >
          Load
        </button>
      </div>

      <textarea
        rows="4"
        className="w-full rounded-2xl bg-white/10 px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-ocean"
        placeholder="Notes, insights, what worked well..."
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        onPaste={handlePlainTextPaste}
      />

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={handleSave}
          className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:brightness-110"
        >
          Save insight
        </button>
        {status && <span className="text-xs text-white/60">{status}</span>}
      </div>
    </section>
  );
};

export default InsightTracker;
