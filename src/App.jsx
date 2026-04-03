import React, { useEffect, useMemo, useState } from "react";
import Dashboard from "./components/Dashboard.jsx";
import { getSession, signInWithEmail, signOut, supabase } from "./services/supabaseClient";

const todayString = () => new Date().toISOString().split("T")[0];

const App = () => {
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

  return (
    <Dashboard
      session={session}
      email={email}
      authStatus={authStatus}
      onEmailChange={setEmail}
      onSignIn={handleSignIn}
      onSignOut={handleSignOut}
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
