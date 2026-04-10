import React, { useEffect, useMemo, useRef, useState } from "react";
import { addMistake, deleteMistake, fetchMistakes } from "../services/supabaseClient";

const normalize = (value) => value.trim().toLowerCase();
const STORAGE_KEY = "mistakeLogColumnWidths.v1";
const DEFAULT_COLUMNS = [
  { key: "problem", label: "Problem", width: 260, minWidth: 160 },
  { key: "cause", label: "Cause", width: 240, minWidth: 160 },
  { key: "solution", label: "Solution", width: 240, minWidth: 160 },
  { key: "learning", label: "Learning", width: 240, minWidth: 160 },
];
const ACTIONS_COLUMN = { key: "actions", label: "Actions", width: 110, minWidth: 90 };
const ALL_COLUMNS = [...DEFAULT_COLUMNS, ACTIONS_COLUMN];

const MistakeLog = ({ searchQuery = "" }) => {
  const [form, setForm] = useState({
    problem: "",
    cause: "",
    solution: "",
    learning: "",
  });
  const [mistakes, setMistakes] = useState([]);
  const [error, setError] = useState("");
  const [columnWidths, setColumnWidths] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      if (Array.isArray(parsed)) {
        const fallback = ALL_COLUMNS.map((col) => col.width);
        const padded =
          parsed.length === ALL_COLUMNS.length
            ? parsed
            : parsed.length === DEFAULT_COLUMNS.length
              ? [...parsed, ACTIONS_COLUMN.width]
              : fallback;

        if (padded.length === ALL_COLUMNS.length) {
          return padded.map((value, index) => {
          const num = Number(value);
          return Number.isFinite(num)
            ? Math.max(num, ALL_COLUMNS[index].minWidth)
            : ALL_COLUMNS[index].width;
          });
        }
      }
    } catch {
      // ignore
    }
    return ALL_COLUMNS.map((col) => col.width);
  });
  const resizingRef = useRef(null);

  const loadMistakes = async () => {
    const { data, error: loadError } = await fetchMistakes();
    if (loadError) {
      setError("Unable to load mistakes.");
      return;
    }
    setMistakes(data || []);
  };

  useEffect(() => {
    loadMistakes();
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(columnWidths));
    } catch {
      // ignore
    }
  }, [columnWidths]);

  useEffect(() => {
    const handleMouseMove = (event) => {
      const resizing = resizingRef.current;
      if (!resizing) return;
      const { index, startX, startWidths } = resizing;
      const delta = event.clientX - startX;
      const minWidth = ALL_COLUMNS[index].minWidth;
      const nextWidth = Math.max(minWidth, startWidths[index] + delta);

      setColumnWidths((prev) => {
        if (!prev || prev.length !== startWidths.length) return prev;
        const next = [...prev];
        next[index] = nextWidth;
        return next;
      });
    };

    const handleMouseUp = () => {
      if (!resizingRef.current) return;
      resizingRef.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  const startResize = (index) => (event) => {
    event.preventDefault();
    event.stopPropagation();
    resizingRef.current = {
      index,
      startX: event.clientX,
      startWidths: columnWidths,
    };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!form.problem.trim()) {
      setError("Problem is required.");
      return;
    }

    const { error: saveError } = await addMistake({
      ...form,
      problem: form.problem.trim(),
    });

    if (saveError) {
      setError("Could not save mistake.");
      return;
    }

    setForm({ problem: "", cause: "", solution: "", learning: "" });
    loadMistakes();
  };

  const repeatCounts = useMemo(() => {
    const counts = {};
    mistakes.forEach((mistake) => {
      const key = normalize(mistake.problem || "");
      if (!key) return;
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }, [mistakes]);

  const filteredMistakes = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return mistakes;
    return mistakes.filter((mistake) => {
      const haystack = [
        mistake.problem,
        mistake.cause,
        mistake.solution,
        mistake.learning,
        mistake.created_at,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [mistakes, searchQuery]);

  return (
    <section className="card p-6 md:p-8 space-y-6 animate-floatIn">
      <div>
        <h2 className="section-title">Mistake Tracker</h2>
        <p className="text-sm text-white/60">Spot patterns and close feedback loops.</p>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-2">
        <input
          className="rounded-2xl bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-ocean"
          placeholder="Problem"
          value={form.problem}
          onChange={handleChange("problem")}
        />
        <input
          className="rounded-2xl bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-ocean"
          placeholder="Cause"
          value={form.cause}
          onChange={handleChange("cause")}
        />
        <input
          className="rounded-2xl bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-ocean"
          placeholder="Solution"
          value={form.solution}
          onChange={handleChange("solution")}
        />
        <input
          className="rounded-2xl bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-ocean"
          placeholder="Key learning"
          value={form.learning}
          onChange={handleChange("learning")}
        />
        <button className="rounded-2xl bg-mint px-5 py-3 text-sm font-semibold text-ink shadow-glow transition hover:brightness-110">
          Log mistake
        </button>
      </form>

      {error && <p className="text-sm text-rose-300">{error}</p>}

      <div className="space-y-3">
        {filteredMistakes.length === 0 && (
          <p className="text-sm text-white/60">No mistakes logged yet.</p>
        )}

        {filteredMistakes.length > 0 && (
          <div className="hidden md:block overflow-x-auto">
            <div
              className="min-w-max rounded-2xl border border-white/10 bg-white/5"
              style={{ width: "fit-content" }}
            >
              <div
                className="grid items-stretch border-b border-white/10 bg-white/5 text-xs font-semibold uppercase tracking-[0.16em] text-white/50"
                style={{
                  gridTemplateColumns: `${columnWidths.map((value) => `${value}px`).join(" ")}`,
                }}
              >
                {ALL_COLUMNS.map((col, index) => {
                  return (
                    <div
                      key={col.key}
                      className="relative px-4 py-3"
                      style={{ minWidth: col.minWidth }}
                    >
                      {col.label}
                      <div
                        role="separator"
                        aria-orientation="vertical"
                        aria-label={`Resize ${col.label} column`}
                        onMouseDown={startResize(index)}
                        className="col-resize-handle"
                        title="Drag to resize"
                      />
                    </div>
                  );
                })}
              </div>

              {filteredMistakes.map((mistake) => {
                const repeats = repeatCounts[normalize(mistake.problem || "")] || 0;
                return (
                  <div
                    key={mistake.id}
                    className="grid items-start border-b border-white/10 last:border-b-0"
                    style={{
                      gridTemplateColumns: `${columnWidths.map((value) => `${value}px`).join(" ")}`,
                    }}
                  >
                    <div className="px-4 py-3 text-sm text-white/80 whitespace-pre-wrap">
                      <div className="flex items-start justify-between gap-3">
                        <span className="font-medium text-white">{mistake.problem || "-"}</span>
                        {repeats > 1 && (
                          <span className="shrink-0 rounded-full bg-rose-500/20 px-3 py-1 text-[11px] text-rose-200">
                            Repeat ({repeats}x)
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="px-4 py-3 text-sm text-white/70 whitespace-pre-wrap">
                      {mistake.cause || "-"}
                    </div>
                    <div className="px-4 py-3 text-sm text-white/70 whitespace-pre-wrap">
                      {mistake.solution || "-"}
                    </div>
                    <div className="px-4 py-3 text-sm text-white/70 whitespace-pre-wrap">
                      {mistake.learning || "-"}
                    </div>
                    <div className="px-4 py-3">
                      <button
                        onClick={() => deleteMistake(mistake.id).then(loadMistakes)}
                        className="rounded-full border border-rose-400/50 px-4 py-2 text-xs text-rose-200 transition hover:border-rose-300"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="md:hidden space-y-3">
        {filteredMistakes.map((mistake) => {
          const repeats = repeatCounts[normalize(mistake.problem || "")] || 0;
          return (
            <div
              key={mistake.id}
              className="rounded-2xl border border-white/10 bg-white/5 p-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg">{mistake.problem}</h3>
                {repeats > 1 && (
                  <span className="rounded-full bg-rose-500/20 px-3 py-1 text-xs text-rose-200">
                    Repeat issue ({repeats}x)
                  </span>
                )}
              </div>
              <div className="mt-2 text-sm text-white/70 space-y-1">
                <p>
                  <span className="text-white/50">Cause:</span> {mistake.cause || "-"}
                </p>
                <p>
                  <span className="text-white/50">Solution:</span> {mistake.solution || "-"}
                </p>
                <p>
                  <span className="text-white/50">Learning:</span> {mistake.learning || "-"}
                </p>
              </div>
              <div className="mt-3">
                <button
                  onClick={() => deleteMistake(mistake.id).then(loadMistakes)}
                  className="rounded-full border border-rose-400/50 px-4 py-2 text-xs text-rose-200 transition hover:border-rose-300"
                >
                  Delete
                </button>
              </div>
            </div>
          );
        })}
        </div>
      </div>
    </section>
  );
};

export default MistakeLog;
