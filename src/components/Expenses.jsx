import React, { useEffect, useMemo, useRef, useState } from "react";
import { addExpense, deleteExpense, fetchExpenses } from "../services/supabaseClient";

const todayString = () => new Date().toISOString().split("T")[0];
const RUPEE = "\u20B9";
const CATEGORY_OPTIONS = [
  { value: "food", label: "Food" },
  { value: "shopping", label: "Shopping" },
  { value: "work", label: "Work" },
  { value: "office", label: "Office" },
  { value: "home", label: "Home" },
  { value: "travel", label: "Travel" },
  { value: "health", label: "Health" },
  { value: "other", label: "Other" },
];

const formatCategory = (value) => {
  if (!value) return "General";
  const match = CATEGORY_OPTIONS.find((item) => item.value === value.toLowerCase());
  if (match) return match.label;
  return value
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const Expenses = ({ refreshKey = 0 }) => {
  const [form, setForm] = useState({
    amount: "",
    category: "",
    note: "",
    expense_date: todayString(),
  });
  const [expenses, setExpenses] = useState([]);
  const [error, setError] = useState("");
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const categoryMenuRef = useRef(null);

  const loadExpenses = async () => {
    const { data, error: loadError } = await fetchExpenses();
    if (loadError) {
      setError("Unable to load expenses.");
      return;
    }
    setExpenses(data || []);
  };

  useEffect(() => {
    loadExpenses();
  }, [refreshKey]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!categoryMenuRef.current?.contains(event.target)) {
        setIsCategoryOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter a valid amount.");
      return;
    }
    const payload = {
      amount,
      category: form.category.trim() || "general",
      note: form.note.trim(),
      expense_date: form.expense_date || todayString(),
    };
    const { error: saveError } = await addExpense(payload);
    if (saveError) {
      setError("Could not save expense.");
      return;
    }
    setForm({ amount: "", category: "", note: "", expense_date: todayString() });
    setIsCategoryOpen(false);
    loadExpenses();
  };

  const totalsByDate = useMemo(() => {
    return expenses.reduce((acc, item) => {
      const key = item.expense_date || todayString();
      acc[key] = (acc[key] || 0) + Number(item.amount || 0);
      return acc;
    }, {});
  }, [expenses]);

  const todayTotal = totalsByDate[todayString()] || 0;

  return (
    <section className="card space-y-6 p-6 md:p-8 animate-floatIn">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="section-title">Daily Expenses</h2>
          <p className="text-sm text-white/60">Track spending quickly each day.</p>
        </div>
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/70">
          Today: {RUPEE}
          {todayTotal.toFixed(2)}
        </span>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-[1fr_1fr_2fr_1fr_auto]">
        <input
          type="number"
          step="0.01"
          className="rounded-2xl bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-ocean"
          placeholder="Amount"
          value={form.amount}
          onChange={handleChange("amount")}
        />
        <div className="relative" ref={categoryMenuRef}>
          <button
            type="button"
            className="cute-dropdown-trigger flex w-full items-center justify-between rounded-full bg-white/10 px-5 py-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-ocean"
            onClick={() => setIsCategoryOpen((prev) => !prev)}
            aria-haspopup="listbox"
            aria-expanded={isCategoryOpen}
          >
            <span className={form.category ? "text-slate-700" : "text-slate-500"}>
              {form.category ? formatCategory(form.category) : "Select category"}
            </span>
            <span className="text-xs text-slate-500 transition-transform duration-200">
              {isCategoryOpen ? "▲" : "▼"}
            </span>
          </button>
          {isCategoryOpen && (
            <div className="cute-dropdown-menu absolute z-20 mt-2 w-full rounded-3xl border border-white/40 bg-white/95 p-2 shadow-[0_16px_36px_rgba(15,23,42,0.16)] backdrop-blur-md">
              <button
                type="button"
                className="cute-dropdown-item w-full rounded-2xl px-4 py-2 text-left text-sm text-slate-700 transition"
                onClick={() => {
                  setForm((prev) => ({ ...prev, category: "" }));
                  setIsCategoryOpen(false);
                }}
              >
                Select category
              </button>
              {CATEGORY_OPTIONS.map((category) => (
                <button
                  key={category.value}
                  type="button"
                  className={`mt-1 w-full rounded-2xl px-4 py-2 text-left text-sm transition ${
                    form.category === category.value
                      ? "bg-sky-200/70 text-slate-900 shadow-sm"
                      : "cute-dropdown-item text-slate-700"
                  }`}
                  onClick={() => {
                    setForm((prev) => ({ ...prev, category: category.value }));
                    setIsCategoryOpen(false);
                  }}
                >
                  {category.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <input
          className="rounded-2xl bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-ocean"
          placeholder="Note"
          value={form.note}
          onChange={handleChange("note")}
        />
        <input
          type="date"
          className="rounded-2xl bg-white/10 px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-ocean"
          value={form.expense_date}
          onChange={handleChange("expense_date")}
        />
        <button className="rounded-2xl bg-mint px-5 py-3 text-sm font-semibold text-ink shadow-glow transition hover:brightness-110">
          Add expense
        </button>
      </form>

      {error && <p className="text-sm text-rose-300">{error}</p>}

      <div className="space-y-3">
        {expenses.length === 0 && <p className="text-sm text-white/60">No expenses yet.</p>}
        {expenses.map((expense) => (
          <div key={expense.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold text-white">
                  {RUPEE}
                  {Number(expense.amount || 0).toFixed(2)}
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="rounded-full border border-white/20 bg-white/10 px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-white/70">
                    {formatCategory(expense.category)}
                  </span>
                  <p className="text-xs text-white/60">{expense.expense_date}</p>
                </div>
                {expense.note && <p className="text-xs text-white/60">{expense.note}</p>}
              </div>
              <button
                onClick={() => deleteExpense(expense.id).then(loadExpenses)}
                className="w-fit rounded-full border border-rose-400/50 px-4 py-2 text-xs text-rose-200 transition hover:border-rose-300"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default Expenses;
