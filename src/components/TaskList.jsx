import React, { useEffect, useMemo, useState } from "react";
import {
  addTask,
  deleteTask,
  fetchTasks,
  updateTask,
} from "../services/supabaseClient";

const todayString = () => new Date().toISOString().split("T")[0];
const tomorrowString = () => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().split("T")[0];
};

const TaskList = ({ onTasksUpdate }) => {
  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState("today");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    date: todayString(),
    priority: false,
  });

  const today = todayString();
  const tomorrow = tomorrowString();

  const refreshTasks = async () => {
    setLoading(true);
    const { data, error: fetchError } = await fetchTasks();
    if (fetchError) {
      setError("Unable to load tasks. Check your Supabase connection.");
    } else {
      setTasks(data || []);
      onTasksUpdate?.(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    refreshTasks();
  }, []);

  const filteredTasks = useMemo(() => {
    if (filter === "today") {
      return tasks.filter((task) => task.date === today);
    }
    if (filter === "tomorrow") {
      return tasks.filter((task) => task.date === tomorrow);
    }
    return tasks;
  }, [tasks, filter, today, tomorrow]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!form.title.trim()) {
      setError("Task title is required.");
      return;
    }

    const payload = {
      title: form.title.trim(),
      description: form.description,
      priority: form.priority,
      status: "open",
      date: form.date,
    };

    const result = editingId
      ? await updateTask(editingId, payload)
      : await addTask(payload);

    if (result.error) {
      const message = result.error.message || "Unknown error";
      const hint = result.error.hint ? ` (${result.error.hint})` : "";
      setError(`Could not save task: ${message}${hint}`);
      return;
    }

    setForm({ title: "", description: "", date: today, priority: false });
    setEditingId(null);
    refreshTasks();
  };

  const toggleDone = async (task) => {
    const newStatus = task.status === "done" ? "open" : "done";
    await updateTask(task.id, { status: newStatus });
    refreshTasks();
  };

  const handleEdit = (task) => {
    setForm({
      title: task.title,
      description: task.description || "",
      date: task.date || today,
      priority: Boolean(task.priority),
    });
    setEditingId(task.id);
  };

  const handleDelete = async (taskId) => {
    await deleteTask(taskId);
    refreshTasks();
  };

  const counts = useMemo(
    () => ({
      today: tasks.filter((task) => task.date === today).length,
      tomorrow: tasks.filter((task) => task.date === tomorrow).length,
      done: tasks.filter((task) => task.status === "done").length,
    }),
    [tasks, today, tomorrow]
  );

  return (
    <section className="card p-6 md:p-8 space-y-6 animate-floatIn">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="section-title">Task Tracker</h2>
          <p className="text-sm text-white/60">
            {counts.today} today · {counts.tomorrow} tomorrow · {counts.done} done
          </p>
        </div>
        <div className="flex gap-2">
          {["today", "tomorrow", "all"].map((option) => (
            <button
              key={option}
              className={`rounded-full px-4 py-2 text-xs uppercase tracking-wide transition ${
                filter === option
                  ? "bg-white text-ink"
                  : "bg-white/10 text-white hover:bg-white/20"
              }`}
              onClick={() => setFilter(option)}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="grid gap-3 md:grid-cols-[2fr_2fr_1fr_1fr_auto]"
      >
        <input
          className="rounded-2xl bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-ocean"
          placeholder="Task title"
          value={form.title}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, title: event.target.value }))
          }
        />
        <input
          className="rounded-2xl bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-ocean"
          placeholder="Description or context"
          value={form.description}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, description: event.target.value }))
          }
        />
        <input
          type="date"
          className="rounded-2xl bg-white/10 px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-ocean"
          value={form.date}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, date: event.target.value }))
          }
        />
        <label className="flex items-center gap-2 rounded-2xl bg-white/5 px-4 py-3 text-sm text-white/70">
          <input
            type="checkbox"
            checked={form.priority}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, priority: event.target.checked }))
            }
            className="h-4 w-4 rounded border-white/30 bg-white/10"
          />
          Priority
        </label>
        <button className="rounded-2xl bg-ocean px-5 py-3 text-sm font-semibold text-ink shadow-glow transition hover:brightness-110">
          {editingId ? "Update" : "Add"}
        </button>
      </form>

      {error && <p className="text-sm text-rose-300">{error}</p>}

      <div className="space-y-3">
        {loading && <p className="text-sm text-white/60">Loading tasks...</p>}
        {!loading && filteredTasks.length === 0 && (
          <p className="text-sm text-white/60">No tasks yet for this view.</p>
        )}
        {filteredTasks.map((task) => (
          <div
            key={task.id}
            className={`flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:border-white/30 ${
              task.priority ? "ring-1 ring-mint/60" : ""
            }`}
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3
                    className={`font-display text-lg ${
                      task.status === "done" ? "line-through text-white/40" : ""
                    }`}
                  >
                    {task.title}
                  </h3>
                  {task.priority && (
                    <span className="rounded-full bg-mint/20 px-3 py-1 text-xs text-mint">
                      Priority
                    </span>
                  )}
                </div>
                {task.description && (
                  <p className="text-sm text-white/60">{task.description}</p>
                )}
                <p className="text-xs text-white/40">Due {task.date}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => toggleDone(task)}
                  className="rounded-full border border-white/20 px-4 py-2 text-xs text-white transition hover:border-white/60"
                >
                  {task.status === "done" ? "Mark open" : "Mark done"}
                </button>
                <button
                  onClick={() => handleEdit(task)}
                  className="rounded-full border border-white/20 px-4 py-2 text-xs text-white transition hover:border-white/60"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(task.id)}
                  className="rounded-full border border-rose-400/50 px-4 py-2 text-xs text-rose-200 transition hover:border-rose-300"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default TaskList;

