// ============================================================
// Plan Schedule Utilities
// Parses weekly structure → generates sessions → tracks completion
// ============================================================
import { LongTermPlan, TrainingPhase, WeeklySession, WeeklyTemplate, WorkoutType } from "./types";
import { getWeeklySessions, saveWeeklySessions, getWorkoutLogs } from "./store";

// ---- Get Monday of a given date's week ----
export function getWeekStart(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun, 1=Mon, ...
  const diff = day === 0 ? -6 : 1 - day; // shift to Monday
  d.setDate(d.getDate() + diff);
  return d.toISOString().split("T")[0];
}

// ---- Get ISO string for a specific day of a week (0=Mon, 6=Sun) ----
export function weekDayDate(weekStart: string, dayOffset: number): string {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + dayOffset);
  return d.toISOString().split("T")[0];
}

// ---- Parse "3× strength, 2× hiit, 1× mobility" → [{type, count}] ----
export function parseWeeklyStructure(structure: string): { type: WorkoutType; count: number }[] {
  const typeMap: Record<string, WorkoutType> = {
    strength: "strength", strong: "strength", weights: "strength", lifting: "strength",
    hiit: "hiit", interval: "hiit", intervals: "hiit", circuit: "hiit",
    cardio: "cardio", running: "cardio", run: "cardio", endurance: "cardio",
    mobility: "mobility", yoga: "mobility", stretch: "mobility", flexibility: "mobility",
    combined: "combined", full: "combined", "full body": "combined",
  };

  const parts = structure.toLowerCase().split(/,|;|\band\b/);
  const result: { type: WorkoutType; count: number }[] = [];

  for (const part of parts) {
    const match = part.match(/(\d+)\s*[×x*]\s*([\w\s]+)/);
    if (!match) continue;
    const count = parseInt(match[1]);
    const typeStr = match[2].trim().replace(/session[s]?|workout[s]?/g, "").trim();
    const mapped = typeMap[typeStr];
    if (mapped) result.push({ type: mapped, count });
  }

  return result;
}

// ---- Get the current active phase from a plan ----
export function getCurrentPhase(plan: LongTermPlan): TrainingPhase | null {
  const today = new Date().toISOString().split("T")[0];
  return plan.phases.find((p) => p.startDate <= today && p.endDate >= today) ?? null;
}

// ---- Generate or sync weekly sessions for the current week ----
// template takes priority over the plan's weeklyStructure for day assignment.
// If template is provided, specific days are locked; the plan phase still provides
// the exercise type context for workout generation.
export async function syncWeeklySessions(
  plan: LongTermPlan,
  template?: WeeklyTemplate | null
): Promise<WeeklySession[]> {
  const weekStart = getWeekStart();

  const existing = await getWeeklySessions();
  const thisWeek = existing.filter((s) => s.weekStart === weekStart);
  if (thisWeek.length > 0) return thisWeek;

  let newSessions: WeeklySession[];

  if (template && Object.keys(template).length > 0) {
    // ---- Template mode: user has fixed days ----
    newSessions = buildSessionsFromTemplate(template, weekStart);
  } else {
    // ---- Auto mode: distribute from plan phase weeklyStructure ----
    const phase = getCurrentPhase(plan);
    if (!phase) return [];

    const sessionTypes = parseWeeklyStructure(phase.weeklyStructure);
    if (sessionTypes.length === 0) return [];

    const totalSessions = sessionTypes.reduce((sum, s) => sum + s.count, 0);
    const spacing = 6 / totalSessions;
    const slots = Array.from({ length: totalSessions }, (_, i) => ({
      dayOffset: Math.round(i * spacing),
    }));

    const sessionList: WorkoutType[] = [];
    for (const { type, count } of sessionTypes) {
      for (let i = 0; i < count; i++) sessionList.push(type);
    }

    newSessions = sessionList.map((type, i) => ({
      id: `ws-${weekStart}-${i}`,
      weekStart,
      plannedDate: weekDayDate(weekStart, slots[i]?.dayOffset ?? i),
      sessionType: type,
      status: "planned",
    }));
  }

  const preserved = existing.filter((s) => s.weekStart !== weekStart);
  await saveWeeklySessions([...preserved, ...newSessions]);
  return newSessions;
}

function buildSessionsFromTemplate(
  template: WeeklyTemplate,
  weekStart: string
): WeeklySession[] {
  const sessions: WeeklySession[] = [];
  // Iterate days 0–6 (Mon–Sun) in order
  for (let day = 0; day <= 6; day++) {
    const type = template[day];
    if (!type || type === "rest") continue;
    sessions.push({
      id: `ws-${weekStart}-${day}`,
      weekStart,
      plannedDate: weekDayDate(weekStart, day),
      sessionType: type as WorkoutType,
      status: "planned",
    });
  }
  return sessions;
}

// ---- Determine what session type is due today ----
export function getTodaysSession(sessions: WeeklySession[]): WeeklySession | null {
  const today = new Date().toISOString().split("T")[0];
  // First check: something planned for today
  const todaySession = sessions.find(
    (s) => (s.plannedDate === today || s.movedTo === today) && s.status === "planned"
  );
  if (todaySession) return todaySession;
  // Fallback: earliest planned session not yet done
  return sessions.find((s) => s.status === "planned") ?? null;
}

// ---- Mark a session complete (called after workout finishes) ----
export async function completeWeeklySession(
  sessionType: WorkoutType,
  workoutLogId: string
): Promise<void> {
  const sessions = await getWeeklySessions();
  const today = new Date().toISOString().split("T")[0];
  const weekStart = getWeekStart();

  // Find the first planned session of this type this week
  const idx = sessions.findIndex(
    (s) =>
      s.weekStart === weekStart &&
      s.sessionType === sessionType &&
      s.status === "planned"
  );

  if (idx >= 0) {
    sessions[idx] = {
      ...sessions[idx],
      status: "completed",
      completedDate: today,
      workoutLogId,
    };
    await saveWeeklySessions(sessions);
  }
}

// ---- Skip a session ----
export async function skipWeeklySession(sessionId: string): Promise<void> {
  const sessions = await getWeeklySessions();
  const idx = sessions.findIndex((s) => s.id === sessionId);
  if (idx >= 0) {
    sessions[idx] = { ...sessions[idx], status: "skipped" };
    await saveWeeklySessions(sessions);
  }
}

// ---- Move a session to a different date ----
export async function moveWeeklySession(sessionId: string, newDate: string): Promise<void> {
  const sessions = await getWeeklySessions();
  const idx = sessions.findIndex((s) => s.id === sessionId);
  if (idx >= 0) {
    sessions[idx] = { ...sessions[idx], status: "planned", movedTo: newDate };
    await saveWeeklySessions(sessions);
  }
}

// ---- Ad-hoc reshuffling helpers ----

/** True if a planned session's effective date is before today. */
export function isSessionOverdue(session: WeeklySession): boolean {
  const today = new Date().toISOString().split("T")[0];
  const effectiveDate = session.movedTo ?? session.plannedDate;
  return session.status === "planned" && effectiveDate < today;
}

/** js getDay() → Mon-based offset (0=Mon … 6=Sun) */
function toMonOffset(jsDay: number): number {
  return jsDay === 0 ? 6 : jsDay - 1;
}

/**
 * Returns the next `daysAhead` dates from today with context:
 * - templateType: what the weekly template assigns that weekday (or null)
 * - occupied: whether a session is already planned on that date
 */
export function getRescheduleDates(
  template: WeeklyTemplate,
  sessions: WeeklySession[],
  daysAhead = 14
): Array<{
  date: string;
  shortDay: string;
  templateType: WorkoutType | "rest" | null;
  occupied: boolean;
}> {
  const DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const result = [];
  const base = new Date();

  for (let i = 0; i < daysAhead; i++) {
    const d = new Date(base);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split("T")[0];
    const offset = toMonOffset(d.getDay());
    const templateType = (template[offset] as WorkoutType | "rest") ?? null;
    const occupied = sessions.some(
      (s) =>
        (s.movedTo === dateStr || s.plannedDate === dateStr) &&
        s.status === "planned"
    );
    result.push({ date: dateStr, shortDay: DAY_SHORT[offset], templateType, occupied });
  }

  return result;
}

/**
 * Reschedule a single overdue session: marks it skipped, inserts a makeup on targetDate.
 * Returns the full updated sessions list.
 */
export async function rescheduleSession(
  sessionId: string,
  targetDate: string
): Promise<WeeklySession[]> {
  const sessions = await getWeeklySessions();

  const idx = sessions.findIndex((s) => s.id === sessionId);
  if (idx < 0) return sessions;

  const original = sessions[idx];
  // Mark original as skipped
  sessions[idx] = { ...original, status: "skipped" };

  // Create makeup session (weekStart of the target date)
  const makeup: WeeklySession = {
    id: `makeup-${Date.now()}`,
    weekStart: getWeekStart(new Date(targetDate)),
    plannedDate: targetDate,
    sessionType: original.sessionType,
    status: "planned",
  };
  sessions.push(makeup);

  await saveWeeklySessions(sessions);
  return sessions;
}

/**
 * Auto-reschedule ALL overdue planned sessions into the next available free slots.
 * Free slot = no template session AND no existing planned session for that date.
 * Template days are skipped (kept intact). Returns count rescheduled.
 */
export async function autoRescheduleAll(
  template: WeeklyTemplate
): Promise<{ rescheduled: number; sessions: WeeklySession[] }> {
  let sessions = await getWeeklySessions();
  const today = new Date().toISOString().split("T")[0];

  // All overdue planned sessions, oldest first
  const overdue = sessions
    .filter((s) => isSessionOverdue(s))
    .sort((a, b) => (a.movedTo ?? a.plannedDate).localeCompare(b.movedTo ?? b.plannedDate));

  if (overdue.length === 0) return { rescheduled: 0, sessions };

  // Collect free days from today forward
  const freeDays: string[] = [];
  for (let i = 0; i < 21 && freeDays.length < overdue.length; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split("T")[0];
    const offset = toMonOffset(d.getDay());
    const tmplType = template[offset];
    const hasSession = sessions.some(
      (s) =>
        (s.movedTo === dateStr || s.plannedDate === dateStr) &&
        s.status === "planned"
    );
    if ((!tmplType || tmplType === "rest") && !hasSession) {
      freeDays.push(dateStr);
    }
  }

  let rescheduled = 0;
  for (let i = 0; i < overdue.length && i < freeDays.length; i++) {
    const session = overdue[i];
    const targetDate = freeDays[i];
    const idx = sessions.findIndex((s) => s.id === session.id);
    if (idx >= 0) sessions[idx] = { ...sessions[idx], status: "skipped" };
    sessions.push({
      id: `makeup-${Date.now()}-${i}`,
      weekStart: getWeekStart(new Date(targetDate)),
      plannedDate: targetDate,
      sessionType: session.sessionType,
      status: "planned",
    });
    rescheduled++;
  }

  await saveWeeklySessions(sessions);
  return { rescheduled, sessions };
}
