import React from "react";
import TaskList from "./TaskList.jsx";
import WorkLog from "./WorkLog.jsx";
import MistakeLog from "./MistakeLog.jsx";
import InsightTracker from "./InsightTracker.jsx";
import NotesBoard from "./NotesBoard.jsx";
import AnalyticsDashboard from "./AnalyticsDashboard.jsx";
import ProjectNotes from "./ProjectNotes.jsx";
import {
  fetchAllProjectNotes,
  fetchMistakes,
  fetchNotes,
  fetchProjects,
} from "../services/supabaseClient";

const navItems = ["Overview", "Tasks", "Calendar", "AI Insights", "Notes", "Project Notes"];

const toolItems = [
  { label: "Time Tracker" },
  { label: "Analytics" },
];

const Sidebar = ({ activeNav, onNavigate, onLogout }) => (
  <aside className="flex h-full flex-col gap-6 rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-card">
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-500 text-white shadow-glow">
        <span className="text-lg font-semibold">S</span>
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-900">Sanika</p>
        <p className="text-xs text-slate-400">SaaS Console</p>
      </div>
    </div>

    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
        Main
      </p>
      <nav className="space-y-1">
        {navItems.map((label) => (
          <button
            key={label}
            onClick={() => onNavigate(label)}
            className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${
              activeNav === label
                ? "bg-indigo-50 text-indigo-600 shadow-sm"
                : "text-slate-500 hover:bg-slate-50"
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-indigo-500/80" />
            {label}
          </button>
        ))}
      </nav>
    </div>

    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
        Tools
      </p>
      <div className="space-y-1">
        {toolItems.map((item) => (
          <button
            key={item.label}
            onClick={() => onNavigate(item.label)}
            className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${
              activeNav === item.label
                ? "bg-indigo-50 text-indigo-600 shadow-sm"
                : "text-slate-500 hover:bg-slate-50"
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-slate-300" />
            {item.label}
          </button>
        ))}
      </div>
    </div>

    <div className="mt-auto">
      <button
        onClick={onLogout}
        className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-slate-500 transition hover:bg-slate-50"
      >
        <span className="h-2 w-2 rounded-full bg-slate-300" />
        Logout
      </button>
    </div>
  </aside>
);

const Header = ({
  session,
  email,
  authStatus,
  onEmailChange,
  onSignIn,
  onSignOut,
  searchValue,
  onSearchChange,
}) => (
  <header className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white/70 p-4 shadow-card md:flex-row md:items-center md:justify-between">
    <div className="flex flex-1 items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-2 shadow-sm">
      <span className="text-slate-400">Search</span>
      <input
        type="text"
        placeholder="Search or type a command"
        className="w-full bg-transparent text-sm text-slate-600 placeholder:text-slate-400 focus:outline-none"
        value={searchValue}
        onChange={(event) => onSearchChange(event.target.value)}
      />
      <span className="rounded-full border border-slate-200 px-2 py-1 text-xs text-slate-400">
        Cmd F
      </span>
    </div>
    <div className="flex items-center gap-3">
      {session ? (
        <div className="flex items-center gap-3">
          <button className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:scale-[1.02] hover:bg-slate-800">
            New Project
          </button>
          <button className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50">
            !
          </button>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-violet-400 text-white">
            <span className="text-sm font-semibold">{session.user.email?.[0]?.toUpperCase() || "A"}</span>
          </div>
          <button
            onClick={onSignOut}
            className="rounded-full border border-slate-200 px-4 py-2 text-xs text-slate-500 transition hover:bg-slate-50"
          >
            Sign out
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <input
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs text-slate-600 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            placeholder="Email for magic link"
            value={email}
            onChange={(event) => onEmailChange(event.target.value)}
          />
          <button
            onClick={onSignIn}
            className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
          >
            Send magic link
          </button>
          {authStatus && <span className="text-xs text-slate-400">{authStatus}</span>}
        </div>
      )}
    </div>
  </header>
);

const StatCard = ({ icon, label, value, children }) => (
  <div className="card flex flex-col gap-4 p-5">
    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-100 text-lg">
      {icon}
    </div>
    <div>
      <p className="text-2xl font-semibold text-slate-900">{value}</p>
      <p className="text-sm text-slate-500">{label}</p>
    </div>
    {children}
  </div>
);

const DotMeter = () => (
  <div className="flex flex-wrap gap-1">
    {Array.from({ length: 20 }).map((_, index) => (
      <span
        key={index}
        className={`h-2 w-2 rounded-full ${
          index < 12 ? "bg-indigo-400" : "bg-slate-200"
        }`}
      />
    ))}
  </div>
);

const DonutChart = () => (
  <div className="card flex flex-col gap-4 p-6">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-semibold text-slate-700">Work-Life Balance</p>
        <p className="text-xs text-slate-400">This week</p>
      </div>
      <div className="rounded-full bg-indigo-50 px-3 py-1 text-xs text-indigo-500">
        Balance
      </div>
    </div>
    <div className="relative mx-auto h-40 w-40">
      <svg className="h-full w-full -rotate-90">
        <circle
          cx="80"
          cy="80"
          r="64"
          stroke="#e2e8f0"
          strokeWidth="14"
          fill="none"
        />
        <circle
          cx="80"
          cy="80"
          r="64"
          stroke="url(#balanceGradient)"
          strokeWidth="14"
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${(2 * Math.PI * 64 * 0.65).toFixed(0)} ${(2 * Math.PI * 64).toFixed(0)}`}
        />
        <defs>
          <linearGradient id="balanceGradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <p className="text-2xl font-semibold text-slate-900">65%</p>
        <p className="text-xs text-slate-500">Work</p>
      </div>
    </div>
    <div className="space-y-2 text-sm text-slate-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-indigo-500" />
          Work
        </div>
        <span className="font-semibold text-slate-700">65%</span>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-violet-300" />
          Life
        </div>
        <span className="font-semibold text-slate-700">35%</span>
      </div>
    </div>
  </div>
);

const ProductivityTrends = ({ weeklyFocus }) => {
  const max = Math.max(1, ...weeklyFocus.map((item) => item.hours));
  return (
    <div className="card p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-700">Productivity Trends</p>
          <p className="text-xs text-slate-400">Daily focus hours</p>
        </div>
        <div className="rounded-full bg-indigo-50 px-3 py-1 text-xs text-indigo-500">
          +12% vs last week
        </div>
      </div>
      <div className="mt-6 flex items-end justify-between gap-3">
        {weeklyFocus.map((item) => (
          <div key={item.day} className="flex flex-1 flex-col items-center gap-2">
            <div
              className={`relative w-full rounded-full ${
                item.isCurrent ? "bg-gradient-to-b from-indigo-500 to-violet-400" : "bg-indigo-200"
              }`}
              style={{ height: `${(item.hours / max) * 110 + 20}px` }}
            >
              {item.isCurrent && (
                <span className="absolute -top-7 left-1/2 -translate-x-1/2 rounded-full bg-slate-900 px-3 py-1 text-[10px] text-white shadow-lg">
                  {item.hours} hours
                </span>
              )}
            </div>
            <span className="text-xs text-slate-400">{item.day}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const TimeTracker = () => {
  const [isRunning, setIsRunning] = React.useState(false);
  const [seconds, setSeconds] = React.useState(0);
  const [sessions, setSessions] = React.useState([]);
  const tickRef = React.useRef(null);
  const targetMinutes = 50;
  const targetSeconds = targetMinutes * 60;

  React.useEffect(() => {
    if (!isRunning) return;
    tickRef.current = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(tickRef.current);
  }, [isRunning]);

  const formatTime = (value) => {
    const mins = Math.floor(value / 60);
    const secs = value % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const toggleRun = () => setIsRunning((prev) => !prev);

  const handleReset = () => {
    if (seconds > 0) {
      const entry = {
        id: `${Date.now()}`,
        duration: seconds,
        endedAt: new Date().toISOString(),
      };
      setSessions((prev) => [entry, ...prev].slice(0, 5));
    }
    setSeconds(0);
    setIsRunning(false);
  };

  const progress = Math.min(seconds / targetSeconds, 1);
  const dash = `${(2 * Math.PI * 70 * progress).toFixed(0)} ${(2 * Math.PI * 70).toFixed(0)}`;

  return (
    <div className="rounded-2xl bg-sky-50 p-6 text-slate-900 shadow-lg">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-800">Time Tracker</p>
          <p className="text-xs text-slate-500">
            {targetMinutes} min focus target
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="flex h-9 items-center justify-center rounded-full border border-slate-200 px-4 text-xs text-slate-600 transition hover:border-slate-300"
          >
            Reset
          </button>
          <button
            onClick={toggleRun}
            className="flex h-9 items-center justify-center rounded-full bg-sky-500 px-4 text-xs font-semibold text-white shadow-glow transition hover:brightness-110"
          >
            {isRunning ? "Pause" : "Start"}
          </button>
        </div>
      </div>
      <div className="mt-6 flex items-center justify-center">
        <div className="relative h-44 w-44">
          <svg className="h-full w-full -rotate-90">
            <circle
              cx="88"
              cy="88"
              r="70"
              stroke="rgba(148,163,184,0.35)"
              strokeWidth="14"
              fill="none"
            />
            <circle
              cx="88"
              cy="88"
              r="70"
              stroke="url(#timerGradient)"
              strokeWidth="14"
              strokeLinecap="round"
              fill="none"
              strokeDasharray={dash}
            />
            <defs>
              <linearGradient id="timerGradient" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="100%" stopColor="#0ea5e9" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <p className="text-3xl font-semibold text-slate-900">{formatTime(seconds)}</p>
            <p className="text-xs text-slate-500">
              {isRunning ? "Focusing" : "Paused"}
            </p>
          </div>
        </div>
      </div>
      <div className="mt-6 space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Recent sessions</p>
        {sessions.length === 0 && (
          <p className="text-xs text-slate-500">No sessions yet.</p>
        )}
        {sessions.map((session) => (
          <div
            key={session.id}
            className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs text-slate-600"
          >
            <span>{formatTime(session.duration)}</span>
            <span>
              {new Date(session.endedAt).toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const ReminderCard = ({ nextMeeting, onOpenMeetings }) => (
  <div className="card p-5">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-semibold text-slate-700">Reminders</p>
        <p className="text-xs text-slate-400">What's coming up next</p>
      </div>
      <div className="flex items-center gap-2">
        <button className="h-8 w-8 rounded-full border border-slate-200 text-slate-400 transition hover:bg-slate-50">
          &lt;
        </button>
        <button className="h-8 w-8 rounded-full border border-slate-200 text-slate-400 transition hover:bg-slate-50">
          &gt;
        </button>
      </div>
    </div>
    <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-700">
          {nextMeeting?.title || "Today's Meeting"}
        </p>
        <div className="rounded-full bg-indigo-50 px-3 py-1 text-xs text-indigo-500">
          {nextMeeting?.tag || "Work"}
        </div>
      </div>
      <p className="mt-2 text-xs text-slate-400">
        {nextMeeting?.notes || "Review campaign results with team."}
      </p>
      <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
        <span>{nextMeeting?.time || "14:00"}</span>
        <button
          onClick={onOpenMeetings}
          className="rounded-full border border-slate-200 px-3 py-1 text-[11px] text-slate-500 transition hover:bg-slate-50"
        >
          Open meetings
        </button>
      </div>
    </div>
  </div>
);

const InsightCard = () => (
  <div className="rounded-2xl bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-600 p-6 text-white shadow-lg">
    <div className="flex items-center justify-between">
      <p className="text-sm font-semibold text-white/80">AI Insights</p>
      <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/80">
        Smart suggestion
      </span>
    </div>
    <p className="mt-4 text-lg font-semibold">
      You're overloaded on Wednesday. Move tasks?
    </p>
    <div className="mt-6 flex gap-3">
      <button className="rounded-full border border-white/30 px-4 py-2 text-xs text-white/80 transition hover:bg-white/10">
        Ignore
      </button>
      <button className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-indigo-600 transition hover:brightness-105">
        Reschedule
      </button>
    </div>
  </div>
);

const MeetingsPage = ({ meetings, onAddMeeting, searchQuery = "" }) => {
  const [form, setForm] = React.useState({
    title: "",
    time: "",
    tag: "Work",
    notes: "",
  });

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!form.title.trim()) return;
    onAddMeeting({
      id: `${Date.now()}`,
      title: form.title.trim(),
      time: form.time || "14:00",
      tag: form.tag || "Work",
      notes: form.notes.trim(),
      created_at: new Date().toISOString(),
    });
    setForm({ title: "", time: "", tag: "Work", notes: "" });
  };

  const filteredMeetings = React.useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return meetings;
    return meetings.filter((meeting) => {
      const haystack = [
        meeting.title,
        meeting.time,
        meeting.tag,
        meeting.notes,
        meeting.created_at,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [meetings, searchQuery]);

  return (
    <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-slate-800">Meetings</h2>
        <p className="text-sm text-slate-500">Upcoming meetings and notes.</p>
        <div className="mt-5 space-y-3">
          {filteredMeetings.length === 0 && (
            <p className="text-sm text-slate-400">No meetings yet.</p>
          )}
          {filteredMeetings.map((meeting) => (
            <div
              key={meeting.id}
              className="rounded-2xl border border-slate-200 bg-white/80 p-4"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-700">{meeting.title}</p>
                <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs text-indigo-500">
                  {meeting.tag}
                </span>
              </div>
              <p className="mt-2 text-xs text-slate-400">
                {meeting.notes || "No notes yet."}
              </p>
              <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                <span>{meeting.time}</span>
                <span>Scheduled</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card p-6">
        <h3 className="text-lg font-semibold text-slate-800">Add meeting</h3>
        <p className="text-sm text-slate-500">Create a new meeting entry.</p>
        <div className="mt-4 grid gap-3">
          <input
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            placeholder="Meeting title"
            value={form.title}
            onChange={handleChange("title")}
          />
          <div className="grid gap-3 md:grid-cols-2">
            <input
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              placeholder="Time (e.g., 14:00)"
              value={form.time}
              onChange={handleChange("time")}
            />
            <input
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              placeholder="Tag (Work)"
              value={form.tag}
              onChange={handleChange("tag")}
            />
          </div>
          <textarea
            rows="3"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            placeholder="Notes"
            value={form.notes}
            onChange={handleChange("notes")}
          />
          <button
            type="submit"
            className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Add meeting
          </button>
        </div>
      </form>
    </section>
  );
};

const Dashboard = ({
  session,
  email,
  authStatus,
  onEmailChange,
  onSignIn,
  onSignOut,
  onLocalSignOut,
  stats,
  weeklyFocus,
  filterFrom,
  filterTo,
  onFilterFromChange,
  onFilterToChange,
  tasks,
  onTasksUpdate,
  logs,
  onLogsUpdate,
}) => {
  const [activeNav, setActiveNav] = React.useState("Overview");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedDate, setSelectedDate] = React.useState(
    new Date().toISOString().split("T")[0]
  );
  const [calendarMonth, setCalendarMonth] = React.useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [meetings, setMeetings] = React.useState(() => {
    try {
      return JSON.parse(localStorage.getItem("meetings") || "[]");
    } catch (error) {
      return [];
    }
  });
  const [notes, setNotes] = React.useState([]);
  const [mistakes, setMistakes] = React.useState([]);
  const [projectNotes, setProjectNotes] = React.useState([]);
  const [projects, setProjects] = React.useState([]);
  const [searchError, setSearchError] = React.useState("");
  const logDateSet = React.useMemo(
    () => new Set((logs || []).map((log) => log.log_date)),
    [logs]
  );

  const formatDate = (date) => date.toISOString().split("T")[0];
  const isSameDay = (a, b) => formatDate(a) === formatDate(b);
  const today = new Date();

  const getCalendarDays = (monthDate) => {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const firstOfMonth = new Date(year, month, 1);
    const startOffset = (firstOfMonth.getDay() + 6) % 7;
    const startDate = new Date(year, month, 1 - startOffset);
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + index);
      return {
        date,
        inMonth: date.getMonth() === month,
      };
    });
  };

  const calendarDays = getCalendarDays(calendarMonth);
  const monthLabel = calendarMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const nextMeeting = meetings[0];
  React.useEffect(() => {
    localStorage.setItem("meetings", JSON.stringify(meetings));
  }, [meetings]);

  React.useEffect(() => {
    const loadSearchData = async () => {
      const [notesResult, mistakesResult, projectNotesResult, projectsResult] = await Promise.all([
        fetchNotes(),
        fetchMistakes(),
        fetchAllProjectNotes(),
        fetchProjects(),
      ]);
      if (
        notesResult.error ||
        mistakesResult.error ||
        projectNotesResult.error ||
        projectsResult.error
      ) {
        setSearchError("Some search results could not be loaded from Supabase.");
      }
      setNotes(notesResult.data || []);
      setMistakes(mistakesResult.data || []);
      setProjectNotes(projectNotesResult.data || []);
      setProjects(projectsResult.data || []);
    };
    loadSearchData();
  }, []);

  React.useEffect(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return;

    const matches = (value) =>
      String(value || "")
        .toLowerCase()
        .includes(query);

    const counts = {
      Tasks: tasks.filter((task) =>
        [task.title, task.description, task.date, task.status].some(matches)
      ).length,
      Calendar: logs.filter((log) =>
        [
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
        ].some(matches)
      ).length,
      Notes: notes.filter((note) =>
        [note.title, note.content, note.created_at].some(matches)
      ).length,
      "Project Notes": projectNotes.filter((note) =>
        [note.title, note.content, note.changed_files, note.created_at].some(matches)
      ).length,
      "AI Insights": mistakes.filter((mistake) =>
        [
          mistake.problem,
          mistake.cause,
          mistake.solution,
          mistake.learning,
          mistake.created_at,
        ].some(matches)
      ).length,
      Meetings: meetings.filter((meeting) =>
        [
          meeting.title,
          meeting.time,
          meeting.tag,
          meeting.notes,
          meeting.created_at,
        ].some(matches)
      ).length,
    };

    const best = Object.entries(counts).reduce(
      (acc, [section, count]) => {
        if (count > acc.count) return { section, count };
        return acc;
      },
      { section: activeNav, count: counts[activeNav] ?? 0 }
    );

    if (best.count > 0 && best.section !== activeNav) {
      setActiveNav(best.section);
    }
  }, [searchQuery, tasks, logs, notes, projectNotes, mistakes, meetings, activeNav]);

  const handleAddMeeting = (meeting) => {
    setMeetings((prev) => [meeting, ...prev]);
  };

  const renderOverview = () => (
    <>
      <section className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-card">
        <p className="text-3xl font-semibold text-slate-900">Hello, Sanika!</p>
        <p className="text-sm text-slate-500">Here's your weekly overview</p>
      </section>

      <section className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="grid gap-4 md:grid-cols-2">
          {stats.map((stat, index) => (
            <StatCard key={stat.label} icon={stat.icon} label={stat.label} value={stat.value}>
              {index === 3 && <DotMeter />}
            </StatCard>
          ))}
        </div>
        <DonutChart />
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.4fr_0.6fr]">
        <ProductivityTrends weeklyFocus={weeklyFocus} />
        <div className="space-y-4">
          <TimeTracker />
          <ReminderCard
            nextMeeting={nextMeeting}
            onOpenMeetings={() => setActiveNav("Meetings")}
          />
        </div>
      </section>

      <InsightCard />
    </>
  );

  const renderProjects = () => (
    <section className="space-y-6">
      <TaskList onTasksUpdate={onTasksUpdate} searchQuery={searchQuery} />
    </section>
  );

  const renderCalendar = () => (
    <section className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-700">Calendar</p>
              <p className="text-xs text-slate-400">{monthLabel}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  setCalendarMonth(
                    new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1)
                  )
                }
                className="h-8 w-8 rounded-full border border-slate-200 text-slate-400 transition hover:bg-slate-50"
              >
                &lt;
              </button>
              <button
                onClick={() =>
                  setCalendarMonth(
                    new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1)
                  )
                }
                className="h-8 w-8 rounded-full border border-slate-200 text-slate-400 transition hover:bg-slate-50"
              >
                &gt;
              </button>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-7 gap-2 text-center text-xs text-slate-400">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-7 gap-2">
            {calendarDays.map(({ date, inMonth }) => {
              const dateKey = formatDate(date);
              const isSelected = dateKey === selectedDate;
              const hasLog = logDateSet.has(dateKey);
              return (
                <button
                  key={dateKey}
                  onClick={() => setSelectedDate(dateKey)}
                  className={`relative flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium transition ${
                    isSelected
                      ? "bg-indigo-500 text-white shadow-glow"
                      : inMonth
                      ? "text-slate-600 hover:bg-slate-100"
                      : "text-slate-300"
                  } ${isSameDay(date, today) && !isSelected ? "border border-indigo-200" : ""}`}
                >
                  {date.getDate()}
                  {hasLog && (
                    <span className="absolute -bottom-1 h-2 w-2 rounded-full bg-indigo-400" />
                  )}
                </button>
              );
            })}
          </div>
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
            Selected: <span className="font-semibold text-slate-700">{selectedDate}</span>
          </div>
        </div>
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-card">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-800">Log Filters</h2>
                <p className="text-sm text-slate-500">Filter daily logs by date range.</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <input
                  type="date"
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  value={filterFrom}
                  onChange={(event) => onFilterFromChange(event.target.value)}
                />
                <input
                  type="date"
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  value={filterTo}
                  onChange={(event) => onFilterToChange(event.target.value)}
                />
              </div>
            </div>
          </div>
          <WorkLog
            tasks={tasks}
            filterFrom={filterFrom}
            filterTo={filterTo}
            onLogsUpdate={onLogsUpdate}
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            searchQuery={searchQuery}
          />
        </div>
      </div>
    </section>
  );

  const renderInsights = () => (
    <section className="space-y-6">
      <InsightTracker tasks={tasks} onSaved={() => {}} />
      <MistakeLog searchQuery={searchQuery} />
    </section>
  );

  const renderNotes = () => (
    <section className="space-y-6">
      <NotesBoard searchQuery={searchQuery} />
    </section>
  );

  const renderProjectNotes = () => (
    <section className="space-y-6">
      <ProjectNotes />
    </section>
  );

  const renderMeetings = () => (
    <MeetingsPage
      meetings={meetings}
      onAddMeeting={handleAddMeeting}
      searchQuery={searchQuery}
    />
  );

  const renderTimeTracker = () => (
    <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-6">
        <TimeTracker />
        <ReminderCard />
      </div>
      <InsightCard />
    </section>
  );

  const renderAnalytics = () => (
    <AnalyticsDashboard tasks={tasks} logs={logs} />
  );

  const renderSearchResults = () => {
    const query = searchQuery.trim().toLowerCase();
    const matches = (value) =>
      String(value || "")
        .toLowerCase()
        .includes(query);

    const taskResults = tasks.filter((task) =>
      [task.title, task.description, task.date, task.status].some(matches)
    );
    const logResults = logs.filter((log) =>
      [
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
      ].some(matches)
    );
    const noteResults = notes.filter((note) =>
      [note.title, note.content, note.created_at].some(matches)
    );
    const projectNoteResults = projectNotes.filter((note) =>
      [note.title, note.content, note.changed_files, note.created_at].some(matches)
    );
    const mistakeResults = mistakes.filter((mistake) =>
      [
        mistake.problem,
        mistake.cause,
        mistake.solution,
        mistake.learning,
        mistake.created_at,
      ].some(matches)
    );
    const meetingResults = meetings.filter((meeting) =>
      [
        meeting.title,
        meeting.time,
        meeting.tag,
        meeting.notes,
        meeting.created_at,
      ].some(matches)
    );

    const total =
      taskResults.length +
      logResults.length +
      noteResults.length +
      projectNoteResults.length +
      mistakeResults.length +
      meetingResults.length;

    return (
      <section className="space-y-6">
        <div className="card p-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="section-title">Search Results</h2>
              <p className="text-sm text-slate-500">
                {total} matches for "{searchQuery}"
              </p>
            </div>
            {searchError && <p className="text-xs text-rose-400">{searchError}</p>}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="card p-6 space-y-3">
            <h3 className="text-sm font-semibold text-slate-700">Tasks</h3>
            {taskResults.length === 0 && (
              <p className="text-sm text-slate-400">No task matches.</p>
            )}
            {taskResults.map((task) => (
              <div
                key={task.id}
                className="rounded-2xl border border-slate-200 bg-white/80 p-4"
              >
                <p className="text-sm font-semibold text-slate-700">{task.title}</p>
                {task.description && (
                  <p className="text-xs text-slate-500">{task.description}</p>
                )}
                <p className="text-xs text-slate-400">
                  {task.date} · {task.status}
                </p>
              </div>
            ))}
          </div>

          <div className="card p-6 space-y-3">
            <h3 className="text-sm font-semibold text-slate-700">Notes</h3>
            {noteResults.length === 0 && (
              <p className="text-sm text-slate-400">No note matches.</p>
            )}
            {noteResults.map((note) => (
              <div
                key={note.id}
                className="rounded-2xl border border-slate-200 bg-white/80 p-4"
              >
                <p className="text-sm font-semibold text-slate-700">
                  {note.title || "Untitled note"}
                </p>
                <p className="text-xs text-slate-500 line-clamp-3">{note.content}</p>
              </div>
            ))}
          </div>

          <div className="card p-6 space-y-3">
            <h3 className="text-sm font-semibold text-slate-700">Project Notes</h3>
            {projectNoteResults.length === 0 && (
              <p className="text-sm text-slate-400">No project note matches.</p>
            )}
            {projectNoteResults.map((note) => (
              <div
                key={note.id}
                className="rounded-2xl border border-slate-200 bg-white/80 p-4"
              >
                <p className="text-sm font-semibold text-slate-700">
                  {note.title || "Project note"}
                </p>
                <p className="text-xs text-slate-500 line-clamp-3">{note.content}</p>
              </div>
            ))}
          </div>

          <div className="card p-6 space-y-3">
            <h3 className="text-sm font-semibold text-slate-700">Daily Logs</h3>
            {logResults.length === 0 && (
              <p className="text-sm text-slate-400">No log matches.</p>
            )}
            {logResults.map((log, index) => (
              <div
                key={log.id || log.log_date || `log-${index}`}
                className="rounded-2xl border border-slate-200 bg-white/80 p-4"
              >
                <p className="text-sm font-semibold text-slate-700">{log.log_date}</p>
                <p className="text-xs text-slate-500">
                  Hours {log.hours || "-"} · Rating {log.rating || "-"}
                </p>
                <p className="text-xs text-slate-500 line-clamp-2">
                  {log.notes || log.insights || log.tasks_completed || "Log entry"}
                </p>
              </div>
            ))}
          </div>

          <div className="card p-6 space-y-3">
            <h3 className="text-sm font-semibold text-slate-700">Mistakes</h3>
            {mistakeResults.length === 0 && (
              <p className="text-sm text-slate-400">No mistake matches.</p>
            )}
            {mistakeResults.map((mistake) => (
              <div
                key={mistake.id}
                className="rounded-2xl border border-slate-200 bg-white/80 p-4"
              >
                <p className="text-sm font-semibold text-slate-700">
                  {mistake.problem}
                </p>
                <p className="text-xs text-slate-500">{mistake.learning || "-"}</p>
              </div>
            ))}
          </div>

          <div className="card p-6 space-y-3 lg:col-span-2">
            <h3 className="text-sm font-semibold text-slate-700">Meetings</h3>
            {meetingResults.length === 0 && (
              <p className="text-sm text-slate-400">No meeting matches.</p>
            )}
            <div className="grid gap-3 md:grid-cols-2">
              {meetingResults.map((meeting) => (
                <div
                  key={meeting.id}
                  className="rounded-2xl border border-slate-200 bg-white/80 p-4"
                >
                  <p className="text-sm font-semibold text-slate-700">
                    {meeting.title}
                  </p>
                  <p className="text-xs text-slate-500">
                    {meeting.time} · {meeting.tag}
                  </p>
                  <p className="text-xs text-slate-500 line-clamp-2">
                    {meeting.notes || "No notes"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  };

  const renderSection = () => {
    if (searchQuery.trim()) {
      return renderSearchResults();
    }
    switch (activeNav) {
      case "Tasks":
        return renderProjects();
      case "Calendar":
        return renderCalendar();
      case "AI Insights":
        return renderInsights();
      case "Notes":
        return renderNotes();
      case "Project Notes":
        return renderProjectNotes();
      case "Meetings":
        return renderMeetings();
      case "Time Tracker":
        return renderTimeTracker();
      case "Analytics":
        return renderAnalytics();
      default:
        return renderOverview();
    }
  };

  return (
    <div className="min-h-screen px-5 py-8 lg:px-10">
      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <Sidebar
          activeNav={activeNav}
          onNavigate={setActiveNav}
          onLogout={onLocalSignOut}
        />
        <main className="space-y-6">
          <Header
            session={session}
            email={email}
            authStatus={authStatus}
            onEmailChange={onEmailChange}
            onSignIn={onSignIn}
            onSignOut={onSignOut}
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
          />
          {renderSection()}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
