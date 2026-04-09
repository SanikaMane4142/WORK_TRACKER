import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn(
    "Missing Supabase env vars. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local."
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey);

const WORK_LOG_TABLE = "work_logs";
const WORK_LOG_SCHEMA = import.meta.env.VITE_WORK_LOG_SCHEMA || "default";

const COLUMN_MAPS = {
  default: {
    log_date: "log_date",
    hours: "hours",
    tasks_planned: "tasks_planned",
    tasks_completed: "tasks_completed",
    wip: "wip",
    blockers: "blockers",
    learnings: "learnings",
    insights: "insights",
    rating: "rating",
    tomorrow: "tomorrow",
    notes: "notes",
  },
  alt: {
    log_date: "date",
    hours: "total_hours",
    tasks_planned: "tasks_planned",
    tasks_completed: "tasks_completed",
    wip: "wip",
    blockers: "blockers",
    learnings: "learnings",
    insights: "insights",
    rating: "rating",
    tomorrow: "tomorrow_plan",
    notes: "notes",
  },
};

const ACTIVE_MAP = COLUMN_MAPS[WORK_LOG_SCHEMA] || COLUMN_MAPS.default;

const mapToDb = (payload) =>
  Object.entries(ACTIVE_MAP).reduce((acc, [uiKey, dbKey]) => {
    acc[dbKey] = payload[uiKey];
    return acc;
  }, {});

const mapFromDb = (row) =>
  Object.entries(ACTIVE_MAP).reduce(
    (acc, [uiKey, dbKey]) => {
      acc[uiKey] = row?.[dbKey] ?? null;
      return acc;
    },
    { id: row?.id ?? null }
  );

const formatSupabaseError = (error) => {
  if (!error) return "";
  const message = error.message || "Unknown error";
  const code = error.code || "";
  const details = error.details ? ` Details: ${error.details}` : "";
  const hint = error.hint ? ` Hint: ${error.hint}` : "";

  const normalized = `${message} ${error.details || ""} ${error.hint || ""}`
    .toLowerCase()
    .trim();

  if (code === "42703" || normalized.includes("column") && normalized.includes("does not exist")) {
    return "Database column mismatch. Check VITE_WORK_LOG_SCHEMA and confirm the work_logs table columns match the selected schema (default vs alt).";
  }

  if (code === "42P01" || normalized.includes("relation") && normalized.includes("does not exist")) {
    return "Table missing. Ensure the work_logs table exists in your Supabase project and the configured schema is correct.";
  }

  if (code === "22P02" || normalized.includes("invalid input syntax")) {
    return "Invalid data sent to Supabase. Verify date format is YYYY-MM-DD and numeric fields are valid numbers.";
  }

  const codeSuffix = code ? ` (code ${code})` : "";
  return `${message}${codeSuffix}${details}${hint}`.trim();
};

const ensureConfigured = () => {
  if (!supabaseUrl || !supabaseKey) {
    return {
      error: {
        message:
          "Missing Supabase env vars. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.",
      },
    };
  }
  return { error: null };
};

export const signInWithEmail = (email) =>
  supabase.auth.signInWithOtp({ email });

export const signOut = () => supabase.auth.signOut();

export const getSession = () => supabase.auth.getSession();

export const fetchTasks = () =>
  supabase.from("tasks").select("*").order("created_at", { ascending: false });

export const addTask = (payload) => supabase.from("tasks").insert([payload]);

export const updateTask = (id, updates) =>
  supabase.from("tasks").update(updates).eq("id", id);

export const deleteTask = (id) =>
  supabase.from("tasks").delete().eq("id", id);

export const fetchExpenses = ({ from, to } = {}) => {
  let query = supabase.from("expenses").select("*").order("expense_date", {
    ascending: false,
  });
  if (from) query = query.gte("expense_date", from);
  if (to) query = query.lte("expense_date", to);
  return query;
};

export const addExpense = (payload) => supabase.from("expenses").insert([payload]);

export const deleteExpense = (id) =>
  supabase.from("expenses").delete().eq("id", id);

export const fetchDailySummary = (date) =>
  supabase
    .from("daily_summaries")
    .select("*")
    .eq("summary_date", date)
    .maybeSingle();

export const upsertDailySummary = (payload) =>
  supabase
    .from("daily_summaries")
    .upsert([payload], { onConflict: "summary_date" });

export const fetchWorkLogs = async ({ from, to } = {}) => {
  const { error: configError } = ensureConfigured();
  if (configError) return { data: null, error: configError };

  const dateColumn = ACTIVE_MAP.log_date;
  let query = supabase.from(WORK_LOG_TABLE).select("*").order(dateColumn, {
    ascending: false,
  });

  if (from) query = query.gte(dateColumn, from);
  if (to) query = query.lte(dateColumn, to);

  const { data, error } = await query;
  if (error) return { data: null, error };

  return { data: (data || []).map(mapFromDb), error: null };
};

export const upsertWorkLog = async (payload) => {
  const { error: configError } = ensureConfigured();
  if (configError) return { data: null, error: configError };

  const mapped = mapToDb(payload);
  const dateColumn = ACTIVE_MAP.log_date;

  const { data, error } = await supabase
    .from(WORK_LOG_TABLE)
    .upsert([mapped], { onConflict: dateColumn })
    .select();

  if (error) {
    const message = (error.message || "").toLowerCase();
    const noUnique =
      error.code === "42P10" ||
      message.includes("no unique constraint") ||
      message.includes("on conflict") ||
      message.includes("violates unique");

    if (!noUnique) {
      return { data: null, error };
    }

    const { data: existingRows, error: findError } = await supabase
      .from(WORK_LOG_TABLE)
      .select("id")
      .eq(dateColumn, mapped[dateColumn])
      .order("id", { ascending: false })
      .limit(1);

    if (findError) return { data: null, error: findError };

    const existing = Array.isArray(existingRows) ? existingRows[0] : existingRows;

    if (existing?.id) {
      const { data: updatedRows, error: updateError } = await supabase
        .from(WORK_LOG_TABLE)
        .update(mapped)
        .eq("id", existing.id)
        .select();

      if (updateError) return { data: null, error: updateError };
      const updated = Array.isArray(updatedRows) ? updatedRows[0] : updatedRows;
      return { data: updated ? mapFromDb(updated) : null, error: null };
    }

    const { data: insertedRows, error: insertError } = await supabase
      .from(WORK_LOG_TABLE)
      .insert([mapped])
      .select();

    if (insertError) return { data: null, error: insertError };
    const inserted = Array.isArray(insertedRows) ? insertedRows[0] : insertedRows;
    return { data: inserted ? mapFromDb(inserted) : null, error: null };
  }

  const row = Array.isArray(data) ? data[0] : data;
  return { data: row ? mapFromDb(row) : null, error: null };
};

export const explainSupabaseError = formatSupabaseError;

export const fetchMistakes = () =>
  supabase.from("mistakes").select("*").order("created_at", { ascending: false });

export const addMistake = (payload) => supabase.from("mistakes").insert([payload]);

export const deleteMistake = (id) =>
  supabase.from("mistakes").delete().eq("id", id);

export const fetchNotes = () =>
  supabase.from("notes").select("*").order("created_at", { ascending: false });

export const addNote = (payload) => supabase.from("notes").insert([payload]);

export const updateNote = (id, updates) =>
  supabase.from("notes").update(updates).eq("id", id);

export const deleteNote = (id) =>
  supabase.from("notes").delete().eq("id", id);

export const fetchProjects = () =>
  supabase.from("projects").select("*").order("created_at", { ascending: false });

export const addProject = (payload) =>
  supabase.from("projects").insert([payload]).select().single();

export const deleteProject = (id) =>
  supabase.from("projects").delete().eq("id", id);

export const fetchProjectNotes = (projectId) =>
  supabase
    .from("project_notes")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

export const fetchAllProjectNotes = () =>
  supabase.from("project_notes").select("*").order("created_at", { ascending: false });

export const addProjectNote = (payload) =>
  supabase.from("project_notes").insert([payload]);

export const updateProjectNote = (id, updates) =>
  supabase.from("project_notes").update(updates).eq("id", id);

export const deleteProjectNote = (id) =>
  supabase.from("project_notes").delete().eq("id", id);

const PROJECT_NOTE_BUCKET = "project_notes";

const buildUploadPath = (projectId, fileName) => {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `${projectId}/${unique}-${safeName}`;
};

export const uploadProjectNotePhotos = async (projectId, files = []) => {
  if (!projectId) {
    return { data: [], error: { message: "Missing project id." } };
  }
  if (!files.length) return { data: [], error: null };

  const uploads = await Promise.all(
    files.map(async (file) => {
      const path = buildUploadPath(projectId, file.name || "photo");
      const { error: uploadError } = await supabase.storage
        .from(PROJECT_NOTE_BUCKET)
        .upload(path, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type || "image/*",
        });
      if (uploadError) {
        return { url: null, error: uploadError };
      }
      const { data } = supabase.storage.from(PROJECT_NOTE_BUCKET).getPublicUrl(path);
      return { url: data?.publicUrl || null, error: null };
    })
  );

  const firstError = uploads.find((item) => item.error)?.error || null;
  if (firstError) return { data: [], error: firstError };

  return { data: uploads.map((item) => item.url).filter(Boolean), error: null };
};

const extractStoragePath = (publicUrl) => {
  if (!publicUrl) return null;
  try {
    const url = new URL(publicUrl);
    const marker = `/${PROJECT_NOTE_BUCKET}/`;
    const index = url.pathname.indexOf(marker);
    if (index === -1) return null;
    return url.pathname.slice(index + marker.length);
  } catch {
    return null;
  }
};

export const deleteProjectNotePhotos = async (urls = []) => {
  const paths = urls
    .map(extractStoragePath)
    .filter(Boolean);
  if (paths.length === 0) return { data: [], error: null };

  const { data, error } = await supabase.storage
    .from(PROJECT_NOTE_BUCKET)
    .remove(paths);

  if (error) return { data: null, error };
  return { data: data || [], error: null };
};
