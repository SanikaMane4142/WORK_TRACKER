import React, { useEffect, useMemo, useState } from "react";
import Dashboard from "./components/Dashboard.jsx";
import { getSession, signInWithEmail, signOut, supabase } from "./services/supabaseClient";

const todayString = () => new Date().toISOString().split("T")[0];

const App = () => {
  const [localUser, setLocalUser] = useState({ username: "", password: "" });
  const [localAuthed, setLocalAuthed] = useState(false);
  const [localError, setLocalError] = useState("");
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState("");
  const [authStatus, setAuthStatus] = useState("");
  const [tasks, setTasks] = useState([]);
  const [logs, setLogs] = useState([]);
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  useEffect(() => {
    getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => setSession(newSession)
    );
    return () => listener?.subscription?.unsubscribe();
  }, []);

  const handleSignIn = async () => {
    setAuthStatus("Sending magic link...");
    const { error } = await signInWithEmail(email);
    setAuthStatus(error ? "Sign in failed" : "Check your email for the link");
  };

  const handleSignOut = async () => {
    await signOut();
    setSession(null);
  };

  const handleLocalLogin = (event) => {
    event.preventDefault();
    setLocalError("");
    const username = localUser.username.trim();
    const password = localUser.password;
    if (username === "Sanika" && password === "Sanika01") {
      setLocalAuthed(true);
      setLocalUser({ username: "", password: "" });
      return;
    }
    setLocalError("Invalid username or password.");
  };

  const handleLocalLogout = () => {
    setLocalAuthed(false);
    setLocalUser({ username: "", password: "" });
  };

  const today = todayString();
  const todayLog = logs.find((log) => log.log_date === today);
  const projectsInProgress = tasks.filter((task) => task.status !== "done").length;
  const tasksCompleted = tasks.filter((task) => task.status === "done").length;
  const focusHours = todayLog?.hours ? `${todayLog.hours}h` : "0h";
  const activityTime = `${logs.length} days`;

  const stats = [
    { label: "Projects in progress", value: String(projectsInProgress), icon: "📁" },
    { label: "Tasks completed", value: String(tasksCompleted), icon: "✅" },
    { label: "Focus hours", value: focusHours, icon: "⏳" },
    { label: "Activity time", value: activityTime, icon: "🕒" },
  ];

  const weeklyFocus = useMemo(() => {
    const now = new Date();
    const items = [];
    for (let i = 6; i >= 0; i -= 1) {
      const date = new Date();
      date.setDate(now.getDate() - i);
      const key = date.toISOString().split("T")[0];
      const log = logs.find((entry) => entry.log_date === key);
      const day = date.toLocaleDateString("en-US", { weekday: "short" });
      items.push({
        day,
        hours: log?.hours ? Number(log.hours) : 0,
        isCurrent: key === today,
      });
    }
    return items;
  }, [logs, today]);

  if (!localAuthed) {
    return (
      <div className="min-h-screen bg-transparent px-6 py-10">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-sky-200/60 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-teal-200/50 blur-3xl" />
        </div>
        <div className="relative mx-auto flex min-h-[80vh] w-full max-w-5xl flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white/80 shadow-xl md:flex-row">
          <section className="flex flex-1 flex-col justify-between gap-10 p-8 text-slate-900 md:p-12">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-3 rounded-full border border-slate-200 bg-white/20 px-4 py-2 text-xs text-slate-500">
                <span className="h-2 w-2 rounded-full bg-ocean" />
                Personal work tracker
              </div>
              <div className="space-y-3">
                <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
                  Sanika
                </h1>
                <p className="text-sm text-slate-500">
                  Keep your week focused, your notes organized, and your goals visible.
                </p>
              </div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white/20 p-2">
              <div className="overflow-hidden rounded-2xl">
                <img
                  src="/smart-task-card.svg"
                  alt="Smart task management card"
                  className="h-72 w-full object-cover"
                />
              </div>
            </div>
            <div className="grid gap-4 text-sm text-slate-500">
              <div className="rounded-2xl border border-slate-200 bg-white/20 p-4">
                Weekly analytics, task focus, and notes in one place.
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white/20 p-4">
                Secure personal login for a single owner dashboard.
              </div>
            </div>
          </section>

          <section className="flex flex-1 items-center justify-center border-t border-slate-200 bg-white/20 p-8 md:border-l md:border-t-0 md:p-12">
            <div className="w-full max-w-sm space-y-6">
              <div className="space-y-2 text-slate-900">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                  Sign in
                </p>
                <h2 className="text-2xl font-semibold">Welcome back</h2>
                <p className="text-sm text-slate-500">Use your Sanika credentials.</p>
              </div>
              <form onSubmit={handleLocalLogin} className="grid gap-4">
                <label className="space-y-2 text-xs uppercase tracking-[0.2em] text-slate-400">
                  Username
                  <input
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-ocean"
                    placeholder="Sanika"
                    value={localUser.username}
                    onChange={(event) =>
                      setLocalUser((prev) => ({ ...prev, username: event.target.value }))
                    }
                  />
                </label>
                <label className="space-y-2 text-xs uppercase tracking-[0.2em] text-slate-400">
                  Password
                  <input
                    type="password"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-ocean"
                    placeholder="••••••••"
                    value={localUser.password}
                    onChange={(event) =>
                      setLocalUser((prev) => ({ ...prev, password: event.target.value }))
                    }
                  />
                </label>
                <button className="rounded-2xl bg-mint px-5 py-3 text-sm font-semibold text-ink shadow-glow transition hover:brightness-110">
                  Sign in
                </button>
              </form>
              {localError && <p className="text-sm text-rose-300">{localError}</p>}
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <Dashboard
      session={session}
      email={email}
      authStatus={authStatus}
      onEmailChange={setEmail}
      onSignIn={handleSignIn}
      onSignOut={handleSignOut}
      onLocalSignOut={handleLocalLogout}
      stats={stats}
      weeklyFocus={weeklyFocus}
      filterFrom={filterFrom}
      filterTo={filterTo}
      onFilterFromChange={setFilterFrom}
      onFilterToChange={setFilterTo}
      tasks={tasks}
      onTasksUpdate={setTasks}
      logs={logs}
      onLogsUpdate={setLogs}
    />
  );
};

export default App;
