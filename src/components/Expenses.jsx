import React, { useEffect, useMemo, useState } from "react";
import { addExpense, deleteExpense, fetchExpenses } from "../services/supabaseClient";

const todayString = () => new Date().toISOString().split("T")[0];

const Expenses = ({ refreshKey = 0 }) => {
  const [form, setForm] = useState({
    amount: "",
    category: "",
    note: "",
    expense_date: todayString(),
  });
  const [expenses, setExpenses] = useState([]);
  const [error, setError] = useState("");

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
    <section className="card p-6 md:p-8 space-y-6 animate-floatIn">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="section-title">Daily Expenses</h2>
          <p className="text-sm text-white/60">Track spending quickly each day.</p>
        </div>
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/70">
          Today: ₹{todayTotal.toFixed(2)}
        </span>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-[1fr_1fr_2fr_auto]">
        <input
          type="number"
          step="0.01"
          className="rounded-2xl bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-ocean"
          placeholder="Amount"
          value={form.amount}
          onChange={handleChange("amount")}
        />
        <input
          className="rounded-2xl bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-ocean"
          placeholder="Category (food, travel)"
          value={form.category}
          onChange={handleChange("category")}
        />
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
        {expenses.length === 0 && (
          <p className="text-sm text-white/60">No expenses yet.</p>
        )}
        {expenses.map((expense) => (
          <div
            key={expense.id}
            className="rounded-2xl border border-white/10 bg-white/5 p-4"
          >
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold text-white">
                  ₹{Number(expense.amount || 0).toFixed(2)}
                </p>
                <p className="text-xs text-white/60">
                  {expense.category || "general"} · {expense.expense_date}
                </p>
                {expense.note && (
                  <p className="text-xs text-white/60">{expense.note}</p>
                )}
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
