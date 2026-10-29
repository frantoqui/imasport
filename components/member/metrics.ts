/**
 * ====================================================================
 * ProgressEntry `metric` key vocabulary — THE CONTRACT
 * ====================================================================
 *
 * `ProgressEntry` is a generic series: one row per (userId, discipline,
 * metric, date). The dashboard charts are driven entirely by the `metric`
 * keys below, so a seed script, an import job or the coach evaluation form
 * must write exactly these strings — anything else is simply ignored by the
 * charts (it is not an error, it just never appears).
 *
 * Every key is listed with its discipline, unit and direction.
 *
 * --- CrossFit (discipline: "CrossFit") ------------------------------
 *  Lift progression (line chart, kg, higher is better)
 *    squat, deadlift, clean, snatch
 *  Performance profile (radar, score 0-100, higher is better)
 *    strength, gymnastics, cardio, weightlifting, mobility, power
 *  Benchmark WODs (list, SECONDS, LOWER is better) — open-ended family:
 *    any key matching /^wod[A-Z]\w*$/, e.g.
 *    wodFran, wodMurph, wodGrace, wodIsabel, wodChelsea, wodCindy
 *    The label shown is the part after "wod" ("wodFran" -> "Fran").
 *
 * --- Hyrox (discipline: "Hyrox") ------------------------------------
 *  Station times (bar chart, MINUTES, LOWER is better; `target` optional)
 *    skiErg, sledPush, sledPull, burpees, row, farmers, lunges, wallBalls
 *  Race simulation split (stacked bar, MINUTES, LOWER is better)
 *    raceRunning, raceStations        (total is derived as the sum)
 *  Performance profile (radar, score 0-100, higher is better)
 *    running, skiErgScore, sledScore, burpeesScore, rowScore, wallBallsScore
 *
 * --- Calistenia (discipline: "Calistenia") --------------------------
 *  Rep progression (line chart, REPS, higher is better)
 *    pullups, dips, hspu, muscleup
 *  Performance profile (radar, score 0-100, higher is better)
 *    push, pull, core, legs, skills, holds
 *  Skill progressions (level 1-5, higher is better)
 *    muscleUpLevel, handstandPushupLevel, frontLeverLevel, planacheLevel
 *    ("plancheLevel" is accepted as an alias of "planacheLevel".)
 *
 * Body composition does NOT live here: the area chart reads `BodyMetric`
 * rows (`weightKg`, `musclePct`, `fatPct`). The weekly calories bar chart
 * reads `Workout` rows (`calories`, `type`, `date`).
 * ====================================================================
 */

import type {
  BodyMetricRow,
  DashboardStats,
  Discipline,
  ProgressRow,
  WorkoutRow,
} from "./types";

// ---------------------------------------------------------------- vocabulary

export const CROSSFIT_LIFTS = ["squat", "deadlift", "clean", "snatch"] as const;
export const CROSSFIT_RADAR = [
  "strength",
  "gymnastics",
  "cardio",
  "weightlifting",
  "mobility",
  "power",
] as const;

export const HYROX_STATIONS = [
  "skiErg",
  "sledPush",
  "sledPull",
  "burpees",
  "row",
  "farmers",
  "lunges",
  "wallBalls",
] as const;
export const HYROX_RACE = ["raceRunning", "raceStations"] as const;
export const HYROX_RADAR = [
  "running",
  "skiErgScore",
  "sledScore",
  "burpeesScore",
  "rowScore",
  "wallBallsScore",
] as const;

export const CALISTENIA_REPS = [
  "pullups",
  "dips",
  "hspu",
  "muscleup",
] as const;
export const CALISTENIA_RADAR = [
  "push",
  "pull",
  "core",
  "legs",
  "skills",
  "holds",
] as const;
export const CALISTENIA_SKILLS = [
  "muscleUpLevel",
  "handstandPushupLevel",
  "frontLeverLevel",
  "planacheLevel",
] as const;

/** Tolerated misspelling so a seed using the English spelling still charts. */
const METRIC_ALIASES: Record<string, string> = {
  plancheLevel: "planacheLevel",
  muscleUps: "muscleup",
  pullUps: "pullups",
};

export function canonicalMetric(metric: string): string {
  return METRIC_ALIASES[metric] ?? metric;
}

export const METRIC_LABELS: Record<string, string> = {
  squat: "Sentadilla",
  deadlift: "Peso Muerto",
  clean: "Clean",
  snatch: "Snatch",
  strength: "Fuerza",
  gymnastics: "Gimnasia",
  cardio: "Cardio",
  weightlifting: "Halterofilia",
  mobility: "Movilidad",
  power: "Potencia",
  skiErg: "SkiErg",
  sledPush: "Sled Push",
  sledPull: "Sled Pull",
  burpees: "Burpees",
  row: "Row",
  farmers: "Farmers",
  lunges: "Lunges",
  wallBalls: "Wall Balls",
  raceRunning: "Running",
  raceStations: "Estaciones",
  running: "Running",
  skiErgScore: "SkiErg",
  sledScore: "Sled",
  burpeesScore: "Burpees",
  rowScore: "Row",
  wallBallsScore: "Wall Balls",
  pullups: "Pull-ups",
  dips: "Dips",
  hspu: "HSPU",
  muscleup: "Muscle-up",
  push: "Push",
  pull: "Pull",
  core: "Core",
  legs: "Piernas",
  skills: "Skills",
  holds: "Holds",
  muscleUpLevel: "Muscle-Up",
  handstandPushupLevel: "Handstand Push-up",
  frontLeverLevel: "Front Lever",
  planacheLevel: "Planche",
};

export function metricLabel(metric: string): string {
  const key = canonicalMetric(metric);
  if (METRIC_LABELS[key]) return METRIC_LABELS[key];
  if (isBenchmarkWod(key)) return key.slice(3);
  return key;
}

const WOD_PATTERN = /^wod[A-Z]\w*$/;

export function isBenchmarkWod(metric: string): boolean {
  return WOD_PATTERN.test(metric);
}

/**
 * The unit stored alongside a ProgressEntry value. Server Actions use this so
 * a coach's input is labelled consistently no matter who wrote the row.
 */
export const METRIC_UNITS: Record<string, string> = {
  ...Object.fromEntries(CROSSFIT_LIFTS.map((m) => [m, "kg"])),
  ...Object.fromEntries(CROSSFIT_RADAR.map((m) => [m, "score"])),
  ...Object.fromEntries(HYROX_STATIONS.map((m) => [m, "min"])),
  ...Object.fromEntries(HYROX_RACE.map((m) => [m, "min"])),
  ...Object.fromEntries(HYROX_RADAR.map((m) => [m, "score"])),
  ...Object.fromEntries(CALISTENIA_REPS.map((m) => [m, "reps"])),
  ...Object.fromEntries(CALISTENIA_RADAR.map((m) => [m, "score"])),
  ...Object.fromEntries(CALISTENIA_SKILLS.map((m) => [m, "nivel"])),
};

export function metricUnit(metric: string): string {
  const key = canonicalMetric(metric);
  if (METRIC_UNITS[key]) return METRIC_UNITS[key];
  return isBenchmarkWod(key) ? "s" : "";
}

/**
 * Whether a key belongs to the documented vocabulary. Server Actions reject
 * anything else, so a typo in a form never becomes a row no chart can read.
 */
export function isKnownMetric(metric: string): boolean {
  const key = canonicalMetric(metric);
  return key in METRIC_UNITS || isBenchmarkWod(key);
}

const LOWER_IS_BETTER = new Set<string>([...HYROX_STATIONS, ...HYROX_RACE]);

/** Times go down when an athlete improves; everything else goes up. */
export function isLowerBetter(metric: string): boolean {
  const key = canonicalMetric(metric);
  return LOWER_IS_BETTER.has(key) || isBenchmarkWod(key);
}

export const DISCIPLINE_COLORS: Record<Discipline, string> = {
  CrossFit: "#ef4444",
  Hyrox: "#eab308",
  Calistenia: "#22c55e",
};

// --------------------------------------------------------------- date helpers

/**
 * Amplify `a.date()` fields are plain "YYYY-MM-DD" strings. Parsing them with
 * `new Date("2024-08-25")` would be read as UTC midnight and render as the
 * 24th in a negative offset, so every parse pins local midnight instead.
 */
export function parseDate(date: string): Date {
  return new Date(`${date}T00:00:00`);
}

export function todayKey(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** "2024-08" — the calendar month a date string belongs to. */
export function monthKey(date: string): string {
  return date.slice(0, 7);
}

export function monthKeyOf(now: Date = new Date()): string {
  return todayKey(now).slice(0, 7);
}

export function previousMonthKey(now: Date = new Date()): string {
  const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return monthKeyOf(d);
}

const MONTHS_SHORT = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];

const MONTHS_LONG = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const DAYS_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export function shortMonthLabel(date: string): string {
  return MONTHS_SHORT[parseDate(date).getMonth()] ?? date;
}

/** "Agosto 2024", used to group the photo gallery. */
export function longMonthLabel(monthKeyValue: string): string {
  const [year, month] = monthKeyValue.split("-");
  const index = Number(month) - 1;
  return `${MONTHS_LONG[index] ?? month} ${year}`;
}

/** "25 Ago" */
export function shortDateLabel(date: string): string {
  const d = parseDate(date);
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}

/** "25 Ago 2024" */
export function mediumDateLabel(date: string): string {
  const d = parseDate(date);
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * "Hoy" / "Ayer" / "Mañana" / "Hace 4 días" / "En 3 días", falling back to a
 * full date once the distance stops being useful.
 */
export function relativeDayLabel(
  date: string,
  now: Date = new Date()
): string {
  const days = daysBetween(date, todayKey(now));
  if (days === 0) return "Hoy";
  if (days === 1) return "Ayer";
  if (days === -1) return "Mañana";
  if (days > 1 && days < 7) return `Hace ${days} días`;
  if (days < -1 && days > -7) return `En ${-days} días`;
  return mediumDateLabel(date);
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Whole days from `from` to `to`, both "YYYY-MM-DD". */
export function daysBetween(from: string, to: string): number {
  return Math.round(
    (parseDate(to).getTime() - parseDate(from).getTime()) / MS_PER_DAY
  );
}

export function addDays(date: string, days: number): string {
  const d = parseDate(date);
  d.setDate(d.getDate() + days);
  return todayKey(d);
}

/** Seconds -> "4:32" or "1:12:30". */
export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return "—";
  const total = Math.round(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/**
 * "7:00 AM" / "19:30" -> minutes since midnight, or `null`.
 *
 * `ClassSession.time` is free text, so the coach panel falls back to the
 * stored `status` whenever this cannot make sense of it.
 */
export function parseTimeOfDay(time: string | null | undefined): number | null {
  if (!time) return null;
  const match = /^(\d{1,2}):(\d{2})\s*(am|pm)?$/i.exec(time.trim());
  if (!match) return null;

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = match[3]?.toLowerCase();
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  if (minutes > 59) return null;

  if (meridiem === "pm" && hours < 12) hours += 12;
  if (meridiem === "am" && hours === 12) hours = 0;
  if (hours > 23) return null;

  return hours * 60 + minutes;
}

/** "9:12" or "1:09:12" -> seconds. Returns null when unparseable. */
export function parseClock(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (/^\d+(\.\d+)?$/.test(trimmed)) return Math.round(Number(trimmed));
  const parts = trimmed.split(":").map((p) => Number(p));
  if (parts.some((p) => !Number.isFinite(p) || p < 0)) return null;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return null;
}

// -------------------------------------------------------------- series shapes

/** Rows for one metric, oldest first. */
export type MetricSeries = Map<string, ProgressRow[]>;

export function groupByMetric(rows: readonly ProgressRow[]): MetricSeries {
  const grouped: MetricSeries = new Map();
  for (const row of rows) {
    const key = canonicalMetric(row.metric);
    const list = grouped.get(key);
    if (list) list.push(row);
    else grouped.set(key, [row]);
  }
  for (const list of grouped.values()) {
    list.sort((a, b) => a.date.localeCompare(b.date));
  }
  return grouped;
}

export function latestOf(
  series: MetricSeries,
  metric: string
): ProgressRow | null {
  const list = series.get(canonicalMetric(metric));
  return list && list.length > 0 ? list[list.length - 1] : null;
}

export type ChartPoint = { label: string } & Record<string, number | string>;

/**
 * One chart row per calendar month, carrying the last value recorded in that
 * month for each requested metric. Months where no requested metric has data
 * are skipped, so the x-axis never shows an empty gap.
 */
export function monthlySeries(
  series: MetricSeries,
  metrics: readonly string[]
): ChartPoint[] {
  const byMonth = new Map<string, Record<string, number>>();
  for (const metric of metrics) {
    for (const row of series.get(canonicalMetric(metric)) ?? []) {
      const month = monthKey(row.date);
      const bucket = byMonth.get(month) ?? {};
      bucket[canonicalMetric(metric)] = row.value;
      byMonth.set(month, bucket);
    }
  }
  return [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, values]) => ({
      label: MONTHS_SHORT[Number(month.slice(5, 7)) - 1] ?? month,
      ...values,
    }));
}

/** One chart row per date on which any requested metric was recorded. */
export function dailySeries(
  series: MetricSeries,
  metrics: readonly string[]
): ChartPoint[] {
  const byDate = new Map<string, Record<string, number>>();
  for (const metric of metrics) {
    for (const row of series.get(canonicalMetric(metric)) ?? []) {
      const bucket = byDate.get(row.date) ?? {};
      bucket[canonicalMetric(metric)] = row.value;
      byDate.set(row.date, bucket);
    }
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, values]) => ({ label: shortDateLabel(date), ...values }));
}

export type RadarPoint = { metric: string; value: number; fullMark: number };

/** Latest score per radar axis. Axes without a row are left out. */
export function radarSeries(
  series: MetricSeries,
  axes: readonly string[]
): RadarPoint[] {
  const points: RadarPoint[] = [];
  for (const axis of axes) {
    const row = latestOf(series, axis);
    if (row) {
      points.push({
        metric: metricLabel(axis),
        value: row.value,
        fullMark: 100,
      });
    }
  }
  // A radar with one or two axes reads as a glitch rather than a profile.
  return points.length >= 3 ? points : [];
}

export type StationPoint = {
  station: string;
  time: number;
  target: number | null;
};

export function stationSeries(series: MetricSeries): StationPoint[] {
  const points: StationPoint[] = [];
  for (const station of HYROX_STATIONS) {
    const row = latestOf(series, station);
    if (row) {
      points.push({
        station: metricLabel(station),
        time: row.value,
        target: row.target ?? null,
      });
    }
  }
  return points;
}

export type RacePoint = {
  label: string;
  running: number;
  stations: number;
  total: number;
};

/** Race simulations in chronological order, numbered "Sim #1", "Sim #2"… */
export function raceSeries(series: MetricSeries): RacePoint[] {
  const running = series.get("raceRunning") ?? [];
  const stations = series.get("raceStations") ?? [];
  const dates = [
    ...new Set([...running, ...stations].map((row) => row.date)),
  ].sort();

  return dates.map((date, i) => {
    const run = running.find((row) => row.date === date)?.value ?? 0;
    const st = stations.find((row) => row.date === date)?.value ?? 0;
    return {
      label: `Sim #${i + 1}`,
      running: run,
      stations: st,
      total: Math.round((run + st) * 10) / 10,
    };
  });
}

export type SkillPoint = {
  name: string;
  level: number;
  maxLevel: number;
  status: string;
};

const SKILL_STATUS = [
  "Principiante",
  "Principiante",
  "Intermedio",
  "En progreso",
  "Avanzado",
  "Dominado",
];

export function skillSeries(series: MetricSeries): SkillPoint[] {
  const points: SkillPoint[] = [];
  for (const skill of CALISTENIA_SKILLS) {
    const row = latestOf(series, skill);
    if (row) {
      const level = Math.max(0, Math.min(5, Math.round(row.value)));
      points.push({
        name: metricLabel(skill),
        level,
        maxLevel: 5,
        status: SKILL_STATUS[level] ?? "En progreso",
      });
    }
  }
  return points;
}

export type BenchmarkPoint = {
  name: string;
  best: string;
  prev: string | null;
};

/**
 * Benchmark WODs: best (fastest) time ever, with the value recorded just
 * before that best so the card can show the improvement.
 */
export function benchmarkSeries(series: MetricSeries): BenchmarkPoint[] {
  const points: BenchmarkPoint[] = [];
  for (const [metric, rows] of series) {
    if (!isBenchmarkWod(metric) || rows.length === 0) continue;
    let bestIndex = 0;
    rows.forEach((row, i) => {
      if (row.value < rows[bestIndex].value) bestIndex = i;
    });
    points.push({
      name: metricLabel(metric),
      best: formatDuration(rows[bestIndex].value),
      prev: bestIndex > 0 ? formatDuration(rows[bestIndex - 1].value) : null,
    });
  }
  return points.sort((a, b) => a.name.localeCompare(b.name));
}

export type WeeklyPoint = { day: string; calories: number; duration: number };

/**
 * Monday-to-Sunday calories and minutes for the current week, optionally
 * narrowed to one discipline. Days without a workout stay at zero, exactly
 * like the original chart.
 */
export function weeklySeries(
  workouts: readonly WorkoutRow[],
  discipline: Discipline | null,
  now: Date = new Date()
): WeeklyPoint[] {
  const todayIndex = (now.getDay() + 6) % 7; // 0 = Monday
  const monday = todayKey(
    new Date(now.getFullYear(), now.getMonth(), now.getDate() - todayIndex)
  );

  const points: WeeklyPoint[] = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(monday, i);
    return { day: DAYS_SHORT[parseDate(date).getDay()], calories: 0, duration: 0 };
  });

  for (const workout of workouts) {
    if (discipline && workout.type !== discipline) continue;
    const offset = daysBetween(monday, workout.date);
    if (offset < 0 || offset > 6) continue;
    points[offset].calories += workout.calories ?? 0;
    points[offset].duration += Math.round((workout.durationSec ?? 0) / 60);
  }
  return points;
}

export type BodyPoint = {
  label: string;
  muscle: number | null;
  fat: number | null;
  weight: number | null;
};

export function bodySeries(rows: readonly BodyMetricRow[]): BodyPoint[] {
  return [...rows]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((row) => ({
      label: shortDateLabel(row.date),
      muscle: row.musclePct ?? null,
      fat: row.fatPct ?? null,
      weight: row.weightKg ?? null,
    }));
}

// ------------------------------------------------------------ dashboard stats

/** Distinct workout dates, newest first. */
function distinctDatesDesc(workouts: readonly WorkoutRow[]): string[] {
  return [...new Set(workouts.map((w) => w.date))].sort((a, b) =>
    b.localeCompare(a)
  );
}

/**
 * Consecutive days with at least one workout, counting back from the most
 * recent workout. A streak only counts as "current" if that workout was today
 * or yesterday — otherwise it has already been broken and we report 0.
 */
export function currentStreak(
  workouts: readonly WorkoutRow[],
  now: Date = new Date()
): number {
  const dates = distinctDatesDesc(workouts);
  if (dates.length === 0) return 0;

  const today = todayKey(now);
  const gap = daysBetween(dates[0], today);
  if (gap > 1 || gap < 0) return 0;

  let streak = 1;
  for (let i = 1; i < dates.length; i++) {
    if (daysBetween(dates[i], dates[i - 1]) === 1) streak += 1;
    else break;
  }
  return streak;
}

/**
 * A PR is a ProgressEntry that beat every earlier entry for the same metric,
 * respecting the metric's direction (times improve downwards).
 */
function prCountForMonth(
  progress: readonly ProgressRow[],
  month: string
): number {
  const series = groupByMetric(progress);
  let count = 0;

  for (const [metric, rows] of series) {
    const lower = isLowerBetter(metric);
    let best: number | null = null;
    for (const row of rows) {
      const beatsBest =
        best === null || (lower ? row.value < best : row.value > best);
      if (beatsBest) {
        // The very first entry for a metric is a baseline, not a PR.
        if (best !== null && monthKey(row.date) === month) count += 1;
        best = row.value;
      }
    }
  }
  return count;
}

export function deriveStats(
  workouts: readonly WorkoutRow[],
  progress: readonly ProgressRow[],
  now: Date = new Date()
): DashboardStats {
  const thisMonth = monthKeyOf(now);
  const lastMonth = previousMonthKey(now);

  const inMonth = (month: string) =>
    workouts.filter((w) => monthKey(w.date) === month);

  const current = inMonth(thisMonth);
  const previous = inMonth(lastMonth);
  const hasPreviousMonth = previous.length > 0;

  const sum = (rows: readonly WorkoutRow[]) =>
    rows.reduce((total, row) => total + (row.calories ?? 0), 0);

  const prsNow = prCountForMonth(progress, thisMonth);
  const prsPrev = prCountForMonth(progress, lastMonth);
  const hadProgressLastMonth = progress.some(
    (row) => monthKey(row.date) === lastMonth
  );

  return {
    sessionsThisMonth: {
      value: current.length,
      delta: hasPreviousMonth ? current.length - previous.length : null,
    },
    streakDays: currentStreak(workouts, now),
    prsThisMonth: {
      value: prsNow,
      delta: hadProgressLastMonth ? prsNow - prsPrev : null,
    },
    caloriesThisMonth: {
      value: sum(current),
      delta: hasPreviousMonth ? sum(current) - sum(previous) : null,
    },
  };
}

export function formatDelta(delta: number, suffix = "vs mes anterior"): string {
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta.toLocaleString("es-MX")} ${suffix}`;
}
