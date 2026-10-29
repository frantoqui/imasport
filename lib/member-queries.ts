import "server-only";

import { userClient } from "./amplify-server";
import { todayKey } from "@/components/member/metrics";
import type {
  AchievementRow,
  AppointmentRow,
  AthleteDetail,
  AthleteListRow,
  AthletePhotoRow,
  BodyMetricRow,
  ClassSessionRow,
  CoachRow,
  Discipline,
  EvaluationRow,
  EventRegistrationRow,
  ProfileRow,
  ProgressRow,
  WorkoutRow,
} from "@/components/member/types";

/**
 * Server-side reads for the member area.
 *
 * Everything here goes through `userClient`, so the AppSync authorization
 * rules apply exactly as they would in the browser: an athlete physically
 * cannot read another athlete's rows even if a page asked for them. The
 * functions that take an `athleteId` other than the viewer's own
 * (`getAthleteDetail`, `getAthletes`) therefore only succeed for a COACH or
 * ADMIN, and their callers gate on `requireRole('coach')` first.
 *
 * Every function returns plain serializable rows (see
 * `components/member/types.ts`) and surfaces GraphQL errors instead of
 * swallowing them — a page that half-loaded silently is worse than one that
 * says what broke.
 */

type Page<T> = {
  data: T[];
  nextToken?: string | null;
  errors?: readonly { message: string }[] | null;
};

/** How many rows any single query will ever pull back. */
const MAX_ROWS = 2000;
const PAGE_SIZE = 500;

function fail(label: string, errors: readonly { message: string }[]): never {
  throw new Error(
    `${label}: ${errors.map((e) => e.message).join("; ") || "error desconocido"}`
  );
}

/**
 * Amplify's cookie-backed server client refreshes credentials lazily, and when
 * a page fires several reads at once the losers of that race throw
 * "No current user" even though the viewer is perfectly signed in. Observed in
 * practice: one of eight parallel dashboard reads failing while the rest
 * succeeded. A short retry makes the race invisible instead of blanking a
 * panel; a genuine authorization failure comes back as GraphQL `errors`, not
 * as this exception, so nothing real is being swallowed.
 */
const TRANSIENT_AUTH = /no current user|no federated jwt|credential|token/i;

export async function withRetry<T>(operation: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      if (!TRANSIENT_AUTH.test(message)) throw error;
      await new Promise((resolve) => setTimeout(resolve, 120 * (attempt + 1)));
    }
  }
  throw lastError;
}

/** Follows `nextToken` so a filtered list cannot silently truncate. */
async function collect<T>(
  label: string,
  fetchPage: (nextToken?: string) => Promise<Page<T>>,
  max = MAX_ROWS
): Promise<T[]> {
  const rows: T[] = [];
  let token: string | undefined;

  do {
    const current = token;
    const page = await withRetry(() => fetchPage(current));
    if (page.errors?.length) fail(label, page.errors);
    rows.push(...(page.data ?? []));
    token = page.nextToken ?? undefined;
  } while (token && rows.length < max);

  return rows.slice(0, max);
}

function one<T>(
  label: string,
  result: { data: T | null; errors?: readonly { message: string }[] | null }
): T | null {
  if (result.errors?.length) fail(label, result.errors);
  return result.data ?? null;
}

/** `one`, but for a single `get` that also needs the transient-auth retry. */
async function getOne<T>(
  label: string,
  operation: () => Promise<{
    data: T | null;
    errors?: readonly { message: string }[] | null;
  }>
): Promise<T | null> {
  return one(label, await withRetry(operation));
}

const num = (value: number | null | undefined): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const str = (value: string | null | undefined): string | null =>
  value ?? null;

/**
 * `a.json()` round-trips as an `AWSJSON` string, so a plain object is never
 * what comes back. One malformed row must not take the page down.
 */
function parseMetrics(raw: unknown): Record<string, number | string> {
  let value: unknown = raw;
  if (typeof raw === "string") {
    try {
      value = JSON.parse(raw);
    } catch {
      return {};
    }
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  const out: Record<string, number | string> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (typeof entry === "number" && Number.isFinite(entry)) out[key] = entry;
    else if (typeof entry === "string") out[key] = entry;
  }
  return out;
}

// ------------------------------------------------------------------- mappers

type Raw = Record<string, unknown>;

function toWorkout(row: Raw): WorkoutRow {
  return {
    id: String(row.id),
    date: String(row.date),
    type: (row.type as Discipline | null) ?? null,
    name: String(row.name ?? ""),
    durationSec: num(row.durationSec as number | null),
    calories: num(row.calories as number | null),
    notes: str(row.notes as string | null),
  };
}

function toBodyMetric(row: Raw): BodyMetricRow {
  return {
    id: String(row.id),
    date: String(row.date),
    weightKg: num(row.weightKg as number | null),
    musclePct: num(row.musclePct as number | null),
    fatPct: num(row.fatPct as number | null),
  };
}

function toProgress(row: Raw): ProgressRow {
  return {
    id: String(row.id),
    discipline: (row.discipline as Discipline | null) ?? null,
    metric: String(row.metric),
    value: Number(row.value),
    unit: str(row.unit as string | null),
    target: num(row.target as number | null),
    date: String(row.date),
  };
}

function toEvaluation(row: Raw): EvaluationRow {
  return {
    id: String(row.id),
    athleteId: String(row.athleteId),
    coachId: str(row.coachId as string | null),
    coachName: str(row.coachName as string | null),
    date: String(row.date),
    discipline: (row.discipline as Discipline | null) ?? null,
    performance: num(row.performance as number | null),
    technique: num(row.technique as number | null),
    effort: num(row.effort as number | null),
    notes: str(row.notes as string | null),
    metrics: parseMetrics(row.metrics),
    photoKey: str(row.photoKey as string | null),
  };
}

function toAppointment(row: Raw): AppointmentRow {
  return {
    id: String(row.id),
    coachId: str(row.coachId as string | null),
    coachName: str(row.coachName as string | null),
    sessionType: str(row.sessionType as string | null),
    date: String(row.date),
    time: str(row.time as string | null),
    status: (row.status as AppointmentRow["status"]) ?? null,
    notes: str(row.notes as string | null),
  };
}

function toClassSession(row: Raw): ClassSessionRow {
  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    date: String(row.date),
    time: str(row.time as string | null),
    discipline: (row.discipline as Discipline | null) ?? null,
    coachName: str(row.coachName as string | null),
    capacity: num(row.capacity as number | null),
    enrolled: num(row.enrolled as number | null),
    status: (row.status as ClassSessionRow["status"]) ?? null,
  };
}

export function toProfileRow(row: Raw): ProfileRow {
  const goals = Array.isArray(row.goals)
    ? row.goals.filter((g): g is string => typeof g === "string")
    : [];

  return {
    userId: String(row.userId),
    email: String(row.email ?? ""),
    name: String(row.name ?? ""),
    phone: str(row.phone as string | null),
    discipline: (row.discipline as Discipline | null) ?? null,
    planTier: (row.planTier as ProfileRow["planTier"]) ?? null,
    planStatus: (row.planStatus as ProfileRow["planStatus"]) ?? null,
    memberSince: str(row.memberSince as string | null),
    age: num(row.age as number | null),
    weightKg: num(row.weightKg as number | null),
    heightCm: num(row.heightCm as number | null),
    bodyFatPct: num(row.bodyFatPct as number | null),
    goals,
    avatarKey: str(row.avatarKey as string | null),
    notifyClasses: row.notifyClasses !== false,
    notifyWorkouts: row.notifyWorkouts !== false,
    notifyWeekly: row.notifyWeekly === true,
    coachStatus: (row.coachStatus as ProfileRow["coachStatus"]) ?? null,
    bio: str(row.bio as string | null),
    certifications: str(row.certifications as string | null),
    yearsExperience: num(row.yearsExperience as number | null),
    specialty: str(row.specialty as string | null),
  };
}

/** The viewer's own profile, flattened for the profile form. */
export async function getMyProfileRow(
  userId: string
): Promise<ProfileRow | null> {
  const profile = await getOne("Perfil", () =>
    userClient.models.UserProfile.get({ userId })
  );
  return profile ? toProfileRow(profile as unknown as Raw) : null;
}

// -------------------------------------------------------------- athlete reads

/** The viewer's workouts, newest first. `limit` caps the returned slice. */
export async function getMyWorkouts(
  userId: string,
  limit?: number
): Promise<WorkoutRow[]> {
  const rows = await collect("Entrenamientos", (nextToken) =>
    userClient.models.Workout.listWorkoutByUserId({ userId }, {
      limit: PAGE_SIZE,
      nextToken,
    })
  );
  const mapped = rows
    .map((row) => toWorkout(row as Raw))
    .sort((a, b) => b.date.localeCompare(a.date));
  return limit ? mapped.slice(0, limit) : mapped;
}

export async function getMyBodyMetrics(
  userId: string
): Promise<BodyMetricRow[]> {
  const rows = await collect("Métricas corporales", (nextToken) =>
    userClient.models.BodyMetric.listBodyMetricByUserId({ userId }, {
      limit: PAGE_SIZE,
      nextToken,
    })
  );
  return rows
    .map((row) => toBodyMetric(row as Raw))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function getMyProgress(
  userId: string,
  discipline?: Discipline
): Promise<ProgressRow[]> {
  const rows = await collect("Progreso", (nextToken) =>
    userClient.models.ProgressEntry.listProgressEntryByUserId({ userId }, {
      limit: PAGE_SIZE,
      nextToken,
      ...(discipline ? { filter: { discipline: { eq: discipline } } } : {}),
    })
  );
  return rows
    .map((row) => toProgress(row as Raw))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Evaluations are written by coaches; an athlete can only read their own. */
export async function getMyEvaluations(
  athleteId: string
): Promise<EvaluationRow[]> {
  const rows = await collect("Evaluaciones", (nextToken) =>
    userClient.models.Evaluation.listEvaluationByAthleteId({ athleteId }, {
      limit: PAGE_SIZE,
      nextToken,
    })
  );
  return rows
    .map((row) => toEvaluation(row as Raw))
    .sort((a, b) => b.date.localeCompare(a.date));
}

export async function getMyAppointments(
  athleteId: string
): Promise<AppointmentRow[]> {
  const rows = await collect("Citas", (nextToken) =>
    userClient.models.Appointment.listAppointmentByAthleteId({ athleteId }, {
      limit: PAGE_SIZE,
      nextToken,
    })
  );
  return rows
    .map((row) => toAppointment(row as Raw))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * The athlete's progress photos, newest first, with the coach's name resolved
 * where we can. An athlete cannot read another user's UserProfile, so the
 * name comes from the public CoachProfile card or from the denormalized
 * `coachName` on the evaluation the photo was taken alongside.
 */
export async function getMyAthletePhotos(
  athleteId: string
): Promise<AthletePhotoRow[]> {
  const [rows, coaches, evaluations] = await Promise.all([
    collect("Fotos", (nextToken) =>
      userClient.models.AthletePhoto.listAthletePhotoByAthleteId({ athleteId }, {
        limit: PAGE_SIZE,
        nextToken,
      })
    ),
    getCoaches().catch(() => [] as CoachRow[]),
    getMyEvaluations(athleteId).catch(() => [] as EvaluationRow[]),
  ]);

  const nameByCoachId = new Map<string, string>();
  for (const coach of coaches) {
    if (coach.userId) nameByCoachId.set(coach.userId, coach.name);
  }
  for (const evaluation of evaluations) {
    if (evaluation.coachId && evaluation.coachName) {
      nameByCoachId.set(evaluation.coachId, evaluation.coachName);
    }
  }

  return rows
    .map((raw) => {
      const row = raw as Raw;
      const coachId = str(row.coachId as string | null);
      return {
        id: String(row.id),
        key: String(row.key),
        caption: str(row.caption as string | null),
        takenAt: str(row.takenAt as string | null),
        coachId,
        coachName: coachId ? nameByCoachId.get(coachId) ?? null : null,
        evaluationId: str(row.evaluationId as string | null),
        createdAt: String(row.createdAt ?? ""),
      } satisfies AthletePhotoRow;
    })
    .sort((a, b) =>
      (b.takenAt ?? b.createdAt).localeCompare(a.takenAt ?? a.createdAt)
    );
}

/**
 * Upcoming event registrations. Each registration points at an Event, which
 * every signed-in user may read, so the title and date are fetched per row.
 */
export async function getMyEventRegistrations(
  userId: string
): Promise<EventRegistrationRow[]> {
  const rows = await collect("Inscripciones", (nextToken) =>
    userClient.models.EventRegistration.listEventRegistrationByUserId(
      { userId },
      { limit: PAGE_SIZE, nextToken }
    )
  );

  const today = todayKey();
  const active = rows.filter((row) => row.status !== "CANCELLED");

  const resolved = await Promise.all(
    active.map(async (row) => {
      const event = await getOne("Evento", () =>
        userClient.models.Event.get({ id: row.eventId })
      );
      if (!event || String(event.date) < today) return null;
      return {
        id: String(row.id),
        eventId: String(row.eventId),
        status: (row.status as EventRegistrationRow["status"]) ?? null,
        eventTitle: String(event.title),
        eventDate: String(event.date),
        eventTime: str(event.time),
        eventLocation: str(event.location),
        eventCategory: (event.category as Discipline | null) ?? null,
      } satisfies EventRegistrationRow;
    })
  );

  return resolved
    .filter((row): row is EventRegistrationRow => row !== null)
    .sort((a, b) => a.eventDate.localeCompare(b.eventDate));
}

/**
 * The full achievement catalogue with the viewer's unlocks folded in, so the
 * panel can show locked ones greyed out exactly as the design does.
 */
export async function getMyAchievements(
  userId: string
): Promise<AchievementRow[]> {
  const [catalogue, unlocked] = await Promise.all([
    collect("Logros", (nextToken) =>
      userClient.models.Achievement.list({ limit: PAGE_SIZE, nextToken })
    ),
    collect("Logros desbloqueados", (nextToken) =>
      userClient.models.UserAchievement.listUserAchievementByUserId(
        { userId },
        { limit: PAGE_SIZE, nextToken }
      )
    ),
  ]);

  const unlockedAt = new Map<string, string | null>();
  for (const row of unlocked) {
    unlockedAt.set(String(row.achievementCode), str(row.unlockedAt));
  }

  return catalogue
    .map((row) => ({
      code: String(row.code),
      name: String(row.name),
      description: str(row.description),
      icon: str(row.icon),
      order: num(row.order),
      unlocked: unlockedAt.has(String(row.code)),
      unlockedAt: unlockedAt.get(String(row.code)) ?? null,
    }))
    .sort(
      (a, b) =>
        (a.order ?? 999) - (b.order ?? 999) || a.name.localeCompare(b.name)
    );
}

// --------------------------------------------------------------- class & coach

/**
 * The next published class from today onwards.
 *
 * `ClassSession` is indexed by `date`, but that index can only be queried for
 * one exact day, so finding "the next one" needs a filtered list. The table
 * holds one row per class, which stays small for a single gym; `collect` caps
 * the sweep so a long history cannot turn this into an unbounded scan.
 */
export async function getNextClass(): Promise<ClassSessionRow | null> {
  const today = todayKey();
  const rows = await collect("Próxima clase", (nextToken) =>
    userClient.models.ClassSession.list({
      filter: { date: { ge: today } },
      limit: PAGE_SIZE,
      nextToken,
    })
  );

  const upcoming = rows
    // `published` unset counts as published: a row that simply never had the
    // flag written should still show up rather than silently disappearing.
    .filter((row) => row.published !== false)
    .map((row) => toClassSession(row as Raw))
    .filter((row) => row.status !== "completed")
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) || (a.time ?? "").localeCompare(b.time ?? "")
    );

  return upcoming[0] ?? null;
}

/** Today's classes, read straight off the `date` index. */
export async function getTodaysClasses(): Promise<ClassSessionRow[]> {
  const date = todayKey();
  const rows = await collect("Sesiones de hoy", (nextToken) =>
    userClient.models.ClassSession.listClassSessionByDate({ date }, {
      limit: PAGE_SIZE,
      nextToken,
    })
  );
  return rows
    .map((row) => toClassSession(row as Raw))
    .sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""));
}

/** Published coach cards, for the appointment picker. */
export async function getCoaches(): Promise<CoachRow[]> {
  const rows = await collect("Coaches", (nextToken) =>
    userClient.models.CoachProfile.list({
      filter: { published: { eq: true } },
      limit: PAGE_SIZE,
      nextToken,
    })
  );

  return rows
    .map((row) => ({
      id: String(row.id),
      userId: str(row.userId),
      name: String(row.name),
      discipline: (row.discipline as Discipline | null) ?? null,
      specialty: str(row.specialty),
      imageKey: str(row.imageKey ?? row.imageUrl),
    }))
    .sort(
      (a, b) => a.name.localeCompare(b.name)
    );
}

// ----------------------------------------------------------------- coach reads

/**
 * Every athlete, with the date of their latest session derived from their most
 * recent Workout or Evaluation.
 *
 * COACHES hold `read` on UserProfile, Workout and Evaluation, so this works
 * for a coach or an admin and fails authorization for anybody else. Callers
 * must still gate with `requireRole('coach')`.
 */
export async function getAthletes(): Promise<AthleteListRow[]> {
  const profiles = await collect("Atletas", (nextToken) =>
    userClient.models.UserProfile.list({ limit: PAGE_SIZE, nextToken })
  );

  const athletes = profiles.filter(
    (row) => row.role !== "COACH" && row.role !== "ADMIN"
  );

  const [workouts, evaluations] = await Promise.all([
    collect("Entrenamientos", (nextToken) =>
      userClient.models.Workout.list({ limit: PAGE_SIZE, nextToken })
    ),
    collect("Evaluaciones", (nextToken) =>
      userClient.models.Evaluation.list({ limit: PAGE_SIZE, nextToken })
    ),
  ]);

  const latest = new Map<string, string>();
  const note = (id: string | null | undefined, date: string) => {
    if (!id) return;
    const current = latest.get(id);
    if (!current || date > current) latest.set(id, date);
  };
  for (const row of workouts) note(row.userId, String(row.date));
  for (const row of evaluations) note(row.athleteId, String(row.date));

  return athletes
    .map((row) => ({
      userId: String(row.userId),
      name: String(row.name ?? ""),
      email: String(row.email ?? ""),
      discipline: (row.discipline as Discipline | null) ?? null,
      planTier: (row.planTier as AthleteListRow["planTier"]) ?? null,
      avatarKey: str(row.avatarKey),
      lastSessionDate: latest.get(String(row.userId)) ?? null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** One athlete's history, for the coach panel. Coach/admin only. */
export async function getAthleteDetail(
  athleteId: string
): Promise<AthleteDetail | null> {
  const profile = await getOne("Atleta", () =>
    userClient.models.UserProfile.get({ userId: athleteId })
  );
  if (!profile) return null;

  const [evaluations, progress, workouts, photoRows] = await Promise.all([
    getMyEvaluations(athleteId),
    getMyProgress(athleteId),
    getMyWorkouts(athleteId, 10),
    collect("Fotos", (nextToken) =>
      userClient.models.AthletePhoto.listAthletePhotoByAthleteId({ athleteId }, {
        limit: PAGE_SIZE,
        nextToken,
      })
    ),
  ]);

  const photos: AthletePhotoRow[] = photoRows
    .map((raw) => {
      const row = raw as Raw;
      return {
        id: String(row.id),
        key: String(row.key),
        caption: str(row.caption as string | null),
        takenAt: str(row.takenAt as string | null),
        coachId: str(row.coachId as string | null),
        coachName: null,
        evaluationId: str(row.evaluationId as string | null),
        createdAt: String(row.createdAt ?? ""),
      } satisfies AthletePhotoRow;
    })
    .sort((a, b) =>
      (b.takenAt ?? b.createdAt).localeCompare(a.takenAt ?? a.createdAt)
    );

  const lastSession = [
    workouts[0]?.date,
    evaluations[0]?.date,
  ]
    .filter((date): date is string => Boolean(date))
    .sort((a, b) => b.localeCompare(a))[0];

  return {
    athlete: {
      userId: String(profile.userId),
      name: String(profile.name ?? ""),
      email: String(profile.email ?? ""),
      discipline: (profile.discipline as Discipline | null) ?? null,
      planTier: (profile.planTier as AthleteListRow["planTier"]) ?? null,
      avatarKey: str(profile.avatarKey),
      lastSessionDate: lastSession ?? null,
    },
    evaluations,
    progress,
    workouts,
    photos,
  };
}
