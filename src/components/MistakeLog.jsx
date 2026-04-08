import React, { useEffect, useMemo, useState } from "react";
import { addMistake, deleteMistake, fetchMistakes } from "../services/supabaseClient";

const normalize = (value) => value.trim().toLowerCase();

const MistakeLog = ({ searchQuery = "" }) => {
  const [form, setForm] = useState({
    problem: "",
    cause: "",
    solution: "",
    learning: "",
  });
  const [mistakes, setMistakes] = useState([]);
  const [error, setError] = useState("");

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
                    Repeat issue · {repeats}x
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
    </section>
  );
};

export default MistakeLog;
