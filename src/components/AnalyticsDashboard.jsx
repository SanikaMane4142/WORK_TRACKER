import React, { useEffect, useMemo, useState } from "react";
import { fetchMistakes, fetchNotes } from "../services/supabaseClient";

const toKey = (date) => date.toISOString().split("T")[0];

const buildWeek = (offsetWeeks = 0) => {
  const today = new Date();
  if (offsetWeeks !== 0) {
    today.setDate(today.getDate() - offsetWeeks * 7);
  }
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(today.getDate() - (6 - index));
    return {
      date,
      key: toKey(date),
      label: date.toLocaleDateString("en-US", { weekday: "short" }),
    };
  });
};

const formatRange = (days) => {
  if (days.length === 0) return "";
  const start = days[0].date.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
  });
  const end = days[days.length - 1].date.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
  });
  return `${start} - ${end}`;
};

const AnalyticsDashboard = ({ tasks = [], logs = [] }) => {
  const [notes, setNotes] = useState([]);
  const [mistakes, setMistakes] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [weekOffset, setWeekOffset] = useState(0);

  useEffect(() => {
    const load = async () => {
      const [notesResult, mistakesResult] = await Promise.all([
        fetchNotes(),
        fetchMistakes(),
      ]);
      if (notesResult.error || mistakesResult.error) {
        setLoadError("Some analytics could not be loaded from Supabase.");
      }
      setNotes(notesResult.data || []);
      setMistakes(mistakesResult.data || []);
    };
    load();
  }, []);

  const week = useMemo(() => buildWeek(weekOffset), [weekOffset]);
  const rangeLabel = formatRange(week);

  const logsByDate = useMemo(() => {
    const map = new Map();
    logs.forEach((log) => {
      if (log?.log_date) map.set(log.log_date, log);
    });
    return map;
  }, [logs]);

  const notesByDate = useMemo(() => {
    const map = new Map();
    notes.forEach((note) => {
      if (!note?.created_at) return;
      const key = toKey(new Date(note.created_at));
      map.set(key, (map.get(key) || 0) + 1);
    });
    return map;
  }, [notes]);

  const mistakesByDate = useMemo(() => {
    const map = new Map();
    mistakes.forEach((mistake) => {
      if (!mistake?.created_at) return;
      const key = toKey(new Date(mistake.created_at));
      map.set(key, (map.get(key) || 0) + 1);
    });
    return map;
  }, [mistakes]);

  const weeklyData = useMemo(() => {
    return week.map((day) => {
      const log = logsByDate.get(day.key);
      const hours = log?.hours ? Number(log.hours) : 0;
      const rating = log?.rating ? Number(log.rating) : 0;
      const completed = tasks.filter(
        (task) => task.status === "done" && task.date === day.key
      ).length;
      const noteCount = notesByDate.get(day.key) || 0;
      const mistakeCount = mistakesByDate.get(day.key) || 0;
      return {
        ...day,
        hours,
        rating,
        completed,
        noteCount,
        mistakeCount,
      };
    });
  }, [week, logsByDate, tasks, notesByDate, mistakesByDate]);

  const totalHours = weeklyData.reduce((sum, item) => sum + item.hours, 0);
  const avgHours = totalHours / weeklyData.length;
  const bestDay = weeklyData.reduce(
    (best, item) => (item.hours > best.hours ? item : best),
    weeklyData[0]
  );
  const completedTotal = weeklyData.reduce((sum, item) => sum + item.completed, 0);
  const avgRating = weeklyData.reduce((sum, item) => sum + item.rating, 0) / weeklyData.length;
  const notesTotal = weeklyData.reduce((sum, item) => sum + item.noteCount, 0);
  const mistakesTotal = weeklyData.reduce((sum, item) => sum + item.mistakeCount, 0);

  const maxHours = Math.max(1, ...weeklyData.map((item) => item.hours));
  const maxCompleted = Math.max(1, ...weeklyData.map((item) => item.completed));
  const maxNotes = Math.max(1, ...weeklyData.map((item) => item.noteCount));
  const maxMistakes = Math.max(1, ...weeklyData.map((item) => item.mistakeCount));

  return (
    <section className="space-y-6">
      <div className="card p-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="section-title">Weekly Analytics</h2>
            <p className="text-sm text-white/60">Week range: {rangeLabel}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="rounded-full border border-white/20 px-3 py-2 text-xs text-white/70 transition hover:border-white/60"
              onClick={() => setWeekOffset((prev) => prev + 1)}
            >
              Previous week
            </button>
            <button
              className="rounded-full border border-white/20 px-3 py-2 text-xs text-white/70 transition hover:border-white/60 disabled:opacity-50"
              onClick={() => setWeekOffset(0)}
              disabled={weekOffset === 0}
            >
              Current week
            </button>
          </div>
          {loadError && <p className="text-xs text-rose-300">{loadError}</p>}
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="card p-5 space-y-2">
          <p className="text-sm text-white/60">Total hours</p>
          <p className="text-3xl font-semibold text-white">{totalHours.toFixed(1)}h</p>
          <p className="text-xs text-white/40">Avg {avgHours.toFixed(1)}h / day</p>
        </div>
        <div className="card p-5 space-y-2">
          <p className="text-sm text-white/60">Best day</p>
          <p className="text-3xl font-semibold text-white">{bestDay.label}</p>
          <p className="text-xs text-white/40">{bestDay.hours.toFixed(1)}h focused</p>
        </div>
        <div className="card p-5 space-y-2">
          <p className="text-sm text-white/60">Tasks completed</p>
          <p className="text-3xl font-semibold text-white">{completedTotal}</p>
          <p className="text-xs text-white/40">Done this week</p>
        </div>
        <div className="card p-5 space-y-2">
          <p className="text-sm text-white/60">Avg rating</p>
          <p className="text-3xl font-semibold text-white">
            {Number.isFinite(avgRating) ? avgRating.toFixed(1) : "0.0"}
          </p>
          <p className="text-xs text-white/40">From daily logs</p>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-white">Focus hours</p>
              <p className="text-xs text-white/50">Daily hours logged</p>
            </div>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/70">
              {totalHours.toFixed(1)}h total
            </span>
          </div>
          <div className="mt-6 flex items-end justify-between gap-3">
            {weeklyData.map((item) => (
              <div key={item.key} className="flex flex-1 flex-col items-center gap-2">
                <div
                  className="w-full rounded-full bg-white/10"
                  style={{ height: `${(item.hours / maxHours) * 110 + 18}px` }}
                >
                  <div className="h-full w-full rounded-full bg-gradient-to-b from-mint to-ocean" />
                </div>
                <span className="text-xs text-white/50">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-white">Tasks completed</p>
              <p className="text-xs text-white/50">Based on completed tasks</p>
            </div>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/70">
              {completedTotal} tasks
            </span>
          </div>
          <div className="mt-6 flex items-end justify-between gap-3">
            {weeklyData.map((item) => (
              <div key={item.key} className="flex flex-1 flex-col items-center gap-2">
                <div
                  className="w-full rounded-full bg-white/10"
                  style={{ height: `${(item.completed / maxCompleted) * 110 + 18}px` }}
                >
                  <div className="h-full w-full rounded-full bg-gradient-to-b from-white/80 to-white/20" />
                </div>
                <span className="text-xs text-white/50">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-white">Notes created</p>
              <p className="text-xs text-white/50">Weekly note activity</p>
            </div>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/70">
              {notesTotal} notes
            </span>
          </div>
          <div className="mt-6 flex items-end justify-between gap-3">
            {weeklyData.map((item) => (
              <div key={item.key} className="flex flex-1 flex-col items-center gap-2">
                <div
                  className="w-full rounded-full bg-white/10"
                  style={{ height: `${(item.noteCount / maxNotes) * 90 + 16}px` }}
                >
                  <div className="h-full w-full rounded-full bg-gradient-to-b from-indigo-400 to-violet-500" />
                </div>
                <span className="text-xs text-white/50">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-white">Mistakes logged</p>
              <p className="text-xs text-white/50">Weekly learning signals</p>
            </div>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/70">
              {mistakesTotal} mistakes
            </span>
          </div>
          <div className="mt-6 flex items-end justify-between gap-3">
            {weeklyData.map((item) => (
              <div key={item.key} className="flex flex-1 flex-col items-center gap-2">
                <div
                  className="w-full rounded-full bg-white/10"
                  style={{ height: `${(item.mistakeCount / maxMistakes) * 90 + 16}px` }}
                >
                  <div className="h-full w-full rounded-full bg-gradient-to-b from-rose-300 to-rose-500" />
                </div>
                <span className="text-xs text-white/50">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </section>
  );
};

export default AnalyticsDashboard;
