import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  explainSupabaseError,
  fetchWorkLogs,
  upsertWorkLog,
} from "../services/supabaseClient";
import {
  applyPasteToValue,
  getPlainTextFromPasteEvent,
} from "../utils/plainTextPaste";

const todayString = () => new Date().toISOString().split("T")[0];
const tomorrowString = () => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().split("T")[0];
};

const formatLogText = (log) => {
  const lines = [
    `Date: ${log.log_date}`,
    `Total Hours: ${log.hours || ""}`,
    `Tasks Planned: ${log.tasks_planned || ""}`,
    `Tasks Completed: ${log.tasks_completed || ""}`,
    `WIP: ${log.wip || ""}`,
    `Blockers: ${log.blockers || ""}`,
    `Learnings: ${log.learnings || ""}`,
    `Insights: ${log.insights || ""}`,
    `Productivity Rating: ${log.rating || ""}`,
    `Tomorrow Plan: ${log.tomorrow || ""}`,
    `Notes: ${log.notes || ""}`,
  ];
  return lines.join("\n");
};

const WorkLog = ({
  tasks = [],
  filterFrom,
  filterTo,
  onLogsUpdate,
  selectedDate,
  onDateChange,
  searchQuery = "",
}) => {
  const [form, setForm] = useState({
    log_date: todayString(),
    hours: "",
    tasks_planned: "",
    tasks_completed: "",
    wip: "",
    blockers: "",
    learnings: "",
    insights: "",
    rating: "",
    tomorrow: "",
    notes: "",
  });
  const [logs, setLogs] = useState([]);
  const [status, setStatus] = useState("Idle");
  const [error, setError] = useState("");
  const [isHydrating, setIsHydrating] = useState(false);
  const [frozenDates, setFrozenDates] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("worklogFrozenDates") || "{}");
    } catch (err) {
      return {};
    }
  });
  const saveTimer = useRef(null);
  const isSavingRef = useRef(false);
  const pendingSaveRef = useRef(false);
  const latestPayloadRef = useRef(null);
  const lastSavedHashRef = useRef("");
  const isValidDateString = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value || "");
  const normalizeNumber = (value) => {
    if (value === "" || value === null || value === undefined) return null;
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  };
  const buildPayload = (currentForm) => ({
    ...currentForm,
    rating: normalizeNumber(currentForm.rating),
    hours: normalizeNumber(currentForm.hours),
  });

  const loadLogs = async () => {
    const { data, error: loadError } = await fetchWorkLogs({
      from: filterFrom,
      to: filterTo,
    });
    if (loadError) {
      const message = explainSupabaseError(loadError);
      console.error("Load logs error:", loadError);
      setError(message || "Unable to load logs. Check Supabase permissions.");
      return;
    }
    setLogs(data || []);
    onLogsUpdate?.(data || []);
  };

  useEffect(() => {
    loadLogs();
  }, [filterFrom, filterTo]);

  useEffect(() => {
    if (!selectedDate) return;
    if (selectedDate === form.log_date) return;
    viewDate(selectedDate);
  }, [selectedDate]);

  const isFrozen = Boolean(frozenDates[form.log_date]);

  useEffect(() => {
    if (isHydrating || isFrozen) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);

    if (!isValidDateString(form.log_date)) {
      setError("Please choose a valid log date (YYYY-MM-DD).");
      setStatus("Error");
      return;
    }

    const payload = buildPayload(form);
    latestPayloadRef.current = payload;
    const hash = JSON.stringify(payload);
    if (hash === lastSavedHashRef.current) return;

    saveTimer.current = setTimeout(async () => {
      const performSave = async () => {
        if (isSavingRef.current) {
          pendingSaveRef.current = true;
          return;
        }

        isSavingRef.current = true;
        setStatus("Saving...");
        const { error: saveError } = await upsertWorkLog(
          latestPayloadRef.current
        );

        if (saveError) {
          const message = explainSupabaseError(saveError);
          console.error("Auto-save error:", saveError);
          setError(message || "Auto-save failed. Please check your connection.");
          setStatus("Error");
        } else {
          setError("");
          setStatus("Saved");
          lastSavedHashRef.current = JSON.stringify(
            latestPayloadRef.current
          );
          loadLogs();
        }

        isSavingRef.current = false;
        if (pendingSaveRef.current) {
          pendingSaveRef.current = false;
          performSave();
        }
      };

      performSave();
    }, 800);

    return () => clearTimeout(saveTimer.current);
  }, [form, isHydrating, isFrozen]);

  const handleChange = (field) => (event) => {
    const value = event.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
    if (field === "log_date") {
      onDateChange?.(value);
    }
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

  const hydrateFormForDate = (date, log = null) => {
    setForm({
      log_date: date,
      hours: log?.hours ? String(log.hours) : "",
      tasks_planned: log?.tasks_planned || "",
      tasks_completed: log?.tasks_completed || "",
      wip: log?.wip || "",
      blockers: log?.blockers || "",
      learnings: log?.learnings || "",
      insights: log?.insights || "",
      rating: log?.rating ? String(log.rating) : "",
      tomorrow: log?.tomorrow || "",
      notes: log?.notes || "",
    });
  };

  const viewDate = async (date) => {
    setIsHydrating(true);
    setStatus("Loading...");
    const { data, error: loadError } = await fetchWorkLogs({
      from: date,
      to: date,
    });
    if (loadError) {
      const message = explainSupabaseError(loadError);
      console.error("Load log error:", loadError);
      setError(message || "Unable to load log for that date.");
      setStatus("Error");
      hydrateFormForDate(date);
    } else {
      setError("");
      hydrateFormForDate(date, data?.[0] || null);
      setStatus("Loaded");
    }
    setIsHydrating(false);
  };

  const toggleFreeze = async () => {
    if (isFrozen) {
      const next = { ...frozenDates };
      delete next[form.log_date];
      setFrozenDates(next);
      localStorage.setItem("worklogFrozenDates", JSON.stringify(next));
      setStatus("Unfrozen");
      return;
    }

    if (!isValidDateString(form.log_date)) {
      setError("Please choose a valid log date (YYYY-MM-DD) before freezing.");
      setStatus("Error");
      return;
    }

    setStatus("Saving...");
    const { error: saveError } = await upsertWorkLog(buildPayload(form));

    if (saveError) {
      const message = explainSupabaseError(saveError);
      console.error("Freeze error:", saveError);
      setError(message || "Freeze failed. Please check your connection.");
      setStatus("Error");
      return;
    }

    const next = { ...frozenDates, [form.log_date]: true };
    setFrozenDates(next);
    localStorage.setItem("worklogFrozenDates", JSON.stringify(next));
    setError("");
    setStatus("Frozen");
    loadLogs();
  };

  const autoFillFromTasks = () => {
    const completed = tasks.filter((task) => task.status === "done");
    const planned = tasks.filter((task) => task.status !== "done");

    setForm((prev) => ({
      ...prev,
      tasks_planned: planned.map((task) => `• ${task.title}`).join("\n"),
      tasks_completed: completed.map((task) => `• ${task.title}`).join("\n"),
    }));
  };

  const copyLog = async (log) => {
    await navigator.clipboard.writeText(formatLogText(log));
  };

  const downloadLog = (log) => {
    const blob = new Blob([formatLogText(log)], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `work-log-${log.log_date}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const expandedByDefault = useMemo(() => new Set([form.log_date]), [form.log_date]);

  const filteredLogs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return logs;
    return logs.filter((log) => {
      const haystack = [
        log.log_date,
        log.hours,
        log.tasks_planned,
        log.tasks_completed,
        log.wip,
        log.blockers,
        log.learnings,
        log.insights,
        log.rating,
        log.tomorrow,
        log.notes,
      ]
        .filter((value) => value !== null && value !== undefined)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [logs, searchQuery]);

  return (
    <section className="card p-6 md:p-8 space-y-6 animate-floatIn">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="section-title">Daily Work Log</h2>
          <p className="text-sm text-white/60">
            Auto-saves to Supabase · {status}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="rounded-full border border-white/20 px-4 py-2 text-xs text-white transition hover:border-white/60 disabled:opacity-60"
            onClick={autoFillFromTasks}
            disabled={isFrozen}
          >
            Auto-fill from tasks
          </button>
          <button
            className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
              isFrozen
                ? "bg-white/20 text-white/80 hover:bg-white/30"
                : "bg-mint text-ink hover:brightness-110"
            }`}
            onClick={toggleFreeze}
          >
            {isFrozen ? "Unfreeze" : "Save & freeze"}
          </button>
          {error && (
            <span className="text-xs text-rose-300">
              {error}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        <button
          className="rounded-full border border-white/20 px-4 py-2 text-white/80 transition hover:border-white/60"
          onClick={() => viewDate(todayString())}
        >
          View today
        </button>
        <button
          className="rounded-full border border-white/20 px-4 py-2 text-white/80 transition hover:border-white/60"
          onClick={() => viewDate(tomorrowString())}
        >
          View tomorrow
        </button>
        {isFrozen && (
          <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-2 text-white/70">
            Frozen
          </span>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm text-white/70">
          Date
          <input
            type="date"
            className="w-full rounded-2xl bg-white/10 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-ocean disabled:opacity-50"
            value={form.log_date}
            onChange={handleChange("log_date")}
            disabled={isFrozen}
          />
        </label>
        <label className="space-y-2 text-sm text-white/70">
          Total hours
          <input
            type="number"
            step="0.5"
            className="w-full rounded-2xl bg-white/10 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-ocean disabled:opacity-50"
            value={form.hours}
            onChange={handleChange("hours")}
            disabled={isFrozen}
          />
        </label>
        <label className="space-y-2 text-sm text-white/70">
          Tasks planned
          <textarea
            rows="3"
            className="w-full rounded-2xl bg-white/10 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-ocean disabled:opacity-50"
            value={form.tasks_planned}
            onChange={handleChange("tasks_planned")}
            onPaste={handlePlainTextPaste("tasks_planned")}
            disabled={isFrozen}
          />
        </label>
        <label className="space-y-2 text-sm text-white/70">
          Tasks completed
          <textarea
            rows="3"
            className="w-full rounded-2xl bg-white/10 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-ocean disabled:opacity-50"
            value={form.tasks_completed}
            onChange={handleChange("tasks_completed")}
            onPaste={handlePlainTextPaste("tasks_completed")}
            disabled={isFrozen}
          />
        </label>
        <label className="space-y-2 text-sm text-white/70">
          WIP
          <textarea
            rows="2"
            className="w-full rounded-2xl bg-white/10 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-ocean disabled:opacity-50"
            value={form.wip}
            onChange={handleChange("wip")}
            onPaste={handlePlainTextPaste("wip")}
            disabled={isFrozen}
          />
        </label>
        <label className="space-y-2 text-sm text-white/70">
          Blockers
          <textarea
            rows="2"
            className="w-full rounded-2xl bg-white/10 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-ocean disabled:opacity-50"
            value={form.blockers}
            onChange={handleChange("blockers")}
            onPaste={handlePlainTextPaste("blockers")}
            disabled={isFrozen}
          />
        </label>
        <label className="space-y-2 text-sm text-white/70">
          Learnings
          <textarea
            rows="2"
            className="w-full rounded-2xl bg-white/10 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-ocean disabled:opacity-50"
            value={form.learnings}
            onChange={handleChange("learnings")}
            onPaste={handlePlainTextPaste("learnings")}
            disabled={isFrozen}
          />
        </label>
        <label className="space-y-2 text-sm text-white/70">
          Insights
          <textarea
            rows="2"
            className="w-full rounded-2xl bg-white/10 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-ocean disabled:opacity-50"
            value={form.insights}
            onChange={handleChange("insights")}
            onPaste={handlePlainTextPaste("insights")}
            disabled={isFrozen}
          />
        </label>
        <label className="space-y-2 text-sm text-white/70">
          Productivity rating (1-10)
          <input
            type="number"
            min="1"
            max="10"
            className="w-full rounded-2xl bg-white/10 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-ocean disabled:opacity-50"
            value={form.rating}
            onChange={handleChange("rating")}
            disabled={isFrozen}
          />
        </label>
        <label className="space-y-2 text-sm text-white/70">
          Tomorrow plan
          <textarea
            rows="2"
            className="w-full rounded-2xl bg-white/10 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-ocean disabled:opacity-50"
            value={form.tomorrow}
            onChange={handleChange("tomorrow")}
            onPaste={handlePlainTextPaste("tomorrow")}
            disabled={isFrozen}
          />
        </label>
        <label className="md:col-span-2 space-y-2 text-sm text-white/70">
          Notes
          <textarea
            rows="3"
            className="w-full rounded-2xl bg-white/10 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-ocean disabled:opacity-50"
            value={form.notes}
            onChange={handleChange("notes")}
            onPaste={handlePlainTextPaste("notes")}
            disabled={isFrozen}
          />
        </label>
      </div>

      {error && <p className="text-sm text-rose-300">{error}</p>}

      <div className="space-y-4">
        <h3 className="font-display text-lg">History</h3>
        {filteredLogs.length === 0 && (
          <p className="text-sm text-white/60">No logs yet.</p>
        )}
        {filteredLogs.map((log, index) => {
          const openByDefault = expandedByDefault.has(log.log_date);
          return (
            <details
              key={log.id || log.log_date || `log-${index}`}
              className="rounded-2xl border border-white/10 bg-white/5 p-4"
              open={openByDefault}
            >
              <summary className="flex cursor-pointer items-center justify-between gap-4 text-sm text-white/80">
                <span>{log.log_date}</span>
                <span className="text-xs text-white/50">
                  Rating {log.rating || "-"}
                </span>
              </summary>
              <div className="mt-4 grid gap-3 text-sm text-white/70">
                <p>
                  <span className="text-white/50">Hours:</span> {log.hours || "-"}
                </p>
                <p>
                  <span className="text-white/50">Planned:</span> {log.tasks_planned || "-"}
                </p>
                <p>
                  <span className="text-white/50">Completed:</span> {log.tasks_completed || "-"}
                </p>
                <p>
                  <span className="text-white/50">WIP:</span> {log.wip || "-"}
                </p>
                <p>
                  <span className="text-white/50">Blockers:</span> {log.blockers || "-"}
                </p>
                <p>
                  <span className="text-white/50">Learnings:</span> {log.learnings || "-"}
                </p>
                <p>
                  <span className="text-white/50">Insights:</span> {log.insights || "-"}
                </p>
                <p>
                  <span className="text-white/50">Tomorrow:</span> {log.tomorrow || "-"}
                </p>
                <p>
                  <span className="text-white/50">Notes:</span> {log.notes || "-"}
                </p>
                <div className="flex flex-wrap gap-2 pt-2">
                  <button
                    onClick={() => copyLog(log)}
                    className="rounded-full border border-white/20 px-4 py-2 text-xs text-white transition hover:border-white/60"
                  >
                    Copy log
                  </button>
                  <button
                    onClick={() => downloadLog(log)}
                    className="rounded-full border border-white/20 px-4 py-2 text-xs text-white transition hover:border-white/60"
                  >
                    Download
                  </button>
                </div>
              </div>
            </details>
          );
        })}
      </div>
    </section>
  );
};

export default WorkLog;
