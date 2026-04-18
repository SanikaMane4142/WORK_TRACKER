
import React, { useState, useEffect } from "react";
import { fetchDiaryEntry, upsertDiaryEntry } from "../services/supabaseClient";

const DIARY_STORAGE_KEY = "dailyDiaryEntries.v1";
const getToday = () => new Date().toISOString().split("T")[0];

const loadDiaryLocal = (date) => {
  try {
    const raw = localStorage.getItem(DIARY_STORAGE_KEY);
    const parsed = JSON.parse(raw || "{}");
    return parsed[date] || "";
  } catch {
    return "";
  }
};

const saveDiaryLocal = (date, text) => {
  try {
    const raw = localStorage.getItem(DIARY_STORAGE_KEY);
    const parsed = JSON.parse(raw || "{}");
    parsed[date] = text;
    localStorage.setItem(DIARY_STORAGE_KEY, JSON.stringify(parsed));
  } catch {}
};


export default function DailyDiary({ date }) {
  const [text, setText] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const diaryDate = date || getToday();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setStatus("");
    fetchDiaryEntry(diaryDate)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (data && data.text !== undefined) {
          setText(data.text);
          saveDiaryLocal(diaryDate, data.text);
        } else {
          // fallback to local
          setText(loadDiaryLocal(diaryDate));
        }
        if (error) setStatus("Offline mode");
      })
      .catch(() => {
        if (!cancelled) {
          setText(loadDiaryLocal(diaryDate));
          setStatus("Offline mode");
        }
      })
      .finally(() => setLoading(false));
    return () => { cancelled = true; };
  }, [diaryDate]);

  const handleSave = async () => {
    setStatus("Saving...");
    setLoading(true);
    saveDiaryLocal(diaryDate, text);
    try {
      const { error } = await upsertDiaryEntry({ entry_date: diaryDate, text });
      if (error) {
        setStatus("Saved locally (offline)");
      } else {
        setStatus("Saved!");
      }
    } catch {
      setStatus("Saved locally (offline)");
    }
    setLoading(false);
    setTimeout(() => setStatus(""), 1200);
  };

  return (
    <div className="rounded-2xl border-2 border-pink-200 bg-pink-50/80 p-6 shadow-lg flex flex-col gap-4 animate-floatIn">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">🌸</span>
        <h2 className="font-display text-xl text-pink-700">Daily Diary</h2>
        <span className="ml-auto text-xs text-pink-400">{diaryDate}</span>
      </div>
      <textarea
        className="w-full rounded-2xl border border-pink-200 bg-white/70 px-4 py-3 text-pink-700 focus:outline-none focus:ring-2 focus:ring-pink-300 min-h-[120px] text-base shadow-inner"
        placeholder="Write about your day... ✨"
        value={text}
        onChange={e => setText(e.target.value)}
        disabled={loading}
      />
      <div className="flex items-center gap-3">
        <button
          className="rounded-full bg-pink-300 px-6 py-2 text-white font-semibold shadow transition hover:bg-pink-400"
          onClick={handleSave}
          disabled={loading}
        >
          {loading ? "Saving..." : "Save Diary"}
        </button>
        {status && <span className="text-pink-500 text-sm">{status}</span>}
      </div>
    </div>
  );
}
