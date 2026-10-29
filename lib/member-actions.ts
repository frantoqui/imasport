"use server";

import { refresh } from "next/cache";
import { userClient } from "./amplify-server";
import { requireRole, requireSession } from "./dal";
import { getAthleteDetail, withRetry } from "./member-queries";
import { MEDIA_PREFIXES } from "./media";
import { isKnownMetric, metricUnit, todayKey } from "@/components/member/metrics";
import type { AthleteDetail, Discipline } from "@/components/member/types";

/**
 * Server Actions for the member area.
 *
 * `proxy.ts` is only an optimistic pre-filter and rendering a form is not a
 * security boundary, so every action re-checks the session itself and then
 * verifies that the row it is about to touch belongs to the caller. Actions
 * take a reference plus the change, never a whole row from the client.
 *
 * They return a result object rather than throwing, so the UI can show the
 * real error instead of an error boundary.
 */

export type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? { data?: never } : { data: T }))
  | { ok: false; error: string };

const DISCIPLINES: Discipline[] = ["CrossFit", "Hyrox", "Calistenia"];
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function errorMessage(
  errors: readonly { message: string }[] | null | undefined
): string | null {
  if (!errors?.length) return null;
  return errors.map((e) => e.message).join("; ") || "Error desconocido";
}

function failure(message: string): { ok: false; error: string } {
  return { ok: false, error: message };
}

/** Clamps to the schema's 1-10 rating range; `null` for anything unusable. */
function rating(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.max(1, Math.min(10, Math.round(n)));
}

function optionalNumber(value: unknown): number | null {
  if (value === "" || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function optionalText(value: unknown, max = 2000): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

function isDate(value: unknown): value is string {
  return typeof value === "string" && DATE_PATTERN.test(value);
}

// ------------------------------------------------------------------- profile

export type ProfileInput = {
  name: string;
  phone?: string | null;
  age?: number | null;
  weightKg?: number | null;
  heightCm?: number | null;
  bodyFatPct?: number | null;
  goals?: string[];
  notifyClasses?: boolean;
  notifyWorkouts?: boolean;
  notifyWeekly?: boolean;
};

/**
 * Saves the viewer's own profile. The identifier always comes from the
 * session, never from the form, so this cannot be pointed at someone else.
 */
export async function saveProfile(
  input: ProfileInput
): Promise<ActionResult> {
  const session = await requireSession();

  const name = optionalText(input.name, 120);
  if (!name) return failure("El nombre es obligatorio.");

  const age = optionalNumber(input.age);
  if (age !== null && (age < 10 || age > 100)) {
    return failure("La edad debe estar entre 10 y 100 años.");
  }

  const goals = Array.isArray(input.goals)
    ? [
        ...new Set(
          input.goals
            .filter((g): g is string => typeof g === "string")
            .map((g) => g.trim())
            .filter(Boolean)
            .slice(0, 12)
        ),
      ]
    : undefined;

  const fields = {
    name,
    phone: optionalText(input.phone, 40),
    age: age === null ? null : Math.round(age),
    weightKg: optionalNumber(input.weightKg),
    heightCm: optionalNumber(input.heightCm),
    bodyFatPct: optionalNumber(input.bodyFatPct),
    ...(goals ? { goals } : {}),
    notifyClasses: input.notifyClasses === true,
    notifyWorkouts: input.notifyWorkouts === true,
    notifyWeekly: input.notifyWeekly === true,
  };

  const existing = await userClient.models.UserProfile.get({
    userId: session.userId,
  });
  const readError = errorMessage(existing.errors);
  if (readError) return failure(`No se pudo leer tu perfil: ${readError}`);

  // A user whose row was never created (e.g. sign-up interrupted before
  // confirmation) still needs to be able to save, so this upserts.
  const result = existing.data
    ? await userClient.models.UserProfile.update({
        userId: session.userId,
        ...fields,
      })
    : await userClient.models.UserProfile.create({
        userId: session.userId,
        email: session.email,
        memberSince: todayKey(),
        ...fields,
      });

  const writeError = errorMessage(result.errors);
  if (writeError) return failure(`No se pudo guardar: ${writeError}`);

  refresh();
  return { ok: true };
}

/**
 * Records the avatar the client just uploaded. Only the resolved S3 key
 * crosses the wire; the write is still scoped to the viewer's own row.
 */
export async function saveAvatarKey(key: string): Promise<ActionResult> {
  const session = await requireSession();

  if (typeof key !== "string" || !key.startsWith(MEDIA_PREFIXES.avatars)) {
    return failure("La ruta de la imagen no es válida.");
  }

  const result = await userClient.models.UserProfile.update({
    userId: session.userId,
    avatarKey: key,
  });

  const error = errorMessage(result.errors);
  if (error) return failure(`No se pudo guardar la foto: ${error}`);

  refresh();
  return { ok: true };
}

export type CoachRequestInput = {
  certifications?: string | null;
  yearsExperience?: number | null;
  specialty?: string | null;
  bio?: string | null;
};

/**
 * Re-submits a coach application from the profile page.
 *
 * `/register-coach` stashes the coach intent in localStorage and only consumes
 * it at first sign-in, so confirming the e-mail on another device loses it.
 * This gives that user a way to ask again.
 *
 * Setting your own `coachStatus` grants nothing: it is a request flag that an
 * admin reviews, and the privilege that actually matters is the Cognito group,
 * which only the ADMINS-only `setUserRole` mutation can change. The write is
 * still scoped to `session.userId` — no userId is accepted from the client.
 */
export async function requestCoachRole(
  input: CoachRequestInput
): Promise<ActionResult> {
  const session = await requireSession();

  const existing = await userClient.models.UserProfile.get({
    userId: session.userId,
  });
  const readError = errorMessage(existing.errors);
  if (readError) return failure(`No se pudo leer tu perfil: ${readError}`);
  if (!existing.data) {
    return failure("Guarda primero tu perfil para poder solicitar ser coach.");
  }

  const status = existing.data.coachStatus;
  if (status === "PENDING") {
    return failure("Ya tienes una solicitud en revisión.");
  }
  if (status === "APPROVED") {
    return failure("Tu solicitud ya fue aprobada.");
  }

  const years = optionalNumber(input.yearsExperience);
  if (years !== null && (years < 0 || years > 60)) {
    return failure("Los años de experiencia no parecen válidos.");
  }

  const certifications = optionalText(input.certifications, 500);
  if (!certifications) {
    return failure("Cuéntanos tus certificaciones.");
  }

  const result = await userClient.models.UserProfile.update({
    userId: session.userId,
    coachStatus: "PENDING",
    certifications,
    yearsExperience: years === null ? null : Math.round(years),
    specialty: optionalText(input.specialty, 120),
    bio: optionalText(input.bio, 1500),
  });

  const error = errorMessage(result.errors);
  if (error) return failure(`No se pudo enviar la solicitud: ${error}`);

  refresh();
  return { ok: true };
}

// --------------------------------------------------------------- appointments

export type AppointmentInput = {
  coachId?: string | null;
  coachName?: string | null;
  sessionType: string;
  date: string;
  time: string;
  notes?: string | null;
};

/** Books a PENDING appointment for the viewer. A coach confirms it later. */
export async function createAppointment(
  input: AppointmentInput
): Promise<ActionResult> {
  const session = await requireSession();

  if (!isDate(input.date)) return failure("Selecciona una fecha válida.");
  if (input.date < todayKey()) {
    return failure("La fecha debe ser hoy o posterior.");
  }

  const sessionType = optionalText(input.sessionType, 80);
  if (!sessionType) return failure("Selecciona el tipo de sesión.");

  const profile = await userClient.models.UserProfile.get({
    userId: session.userId,
  });

  const result = await userClient.models.Appointment.create({
    athleteId: session.userId,
    athleteName: profile.data?.name ?? session.email,
    coachId: optionalText(input.coachId, 80),
    coachName: optionalText(input.coachName, 120),
    sessionType,
    date: input.date,
    time: optionalText(input.time, 20),
    status: "PENDING",
    notes: optionalText(input.notes),
  });

  const error = errorMessage(result.errors);
  if (error) return failure(`No se pudo agendar: ${error}`);

  refresh();
  return { ok: true };
}

/**
 * Cancels an appointment. The row is re-read server side and the caller must
 * own it (or be a coach/admin) before the status changes.
 */
export async function cancelAppointment(
  appointmentId: string
): Promise<ActionResult> {
  const session = await requireSession();

  if (typeof appointmentId !== "string" || !appointmentId) {
    return failure("Cita no válida.");
  }

  const existing = await userClient.models.Appointment.get({
    id: appointmentId,
  });
  const readError = errorMessage(existing.errors);
  if (readError) return failure(`No se pudo leer la cita: ${readError}`);
  if (!existing.data) return failure("La cita ya no existe.");

  const isOwner = existing.data.athleteId === session.userId;
  const isStaff = session.role === "coach" || session.role === "admin";
  if (!isOwner && !isStaff) return failure("Esta cita no es tuya.");

  const result = await userClient.models.Appointment.update({
    id: appointmentId,
    status: "CANCELLED",
  });

  const error = errorMessage(result.errors);
  if (error) return failure(`No se pudo cancelar: ${error}`);

  refresh();
  return { ok: true };
}

// ---------------------------------------------------------------- coach panel

/** Loads one athlete's history for the coach panel's detail pane. */
export async function loadAthleteDetail(
  athleteId: string
): Promise<ActionResult<AthleteDetail>> {
  await requireRole("coach");

  if (typeof athleteId !== "string" || !athleteId) {
    return failure("Atleta no válido.");
  }

  try {
    const detail = await getAthleteDetail(athleteId);
    if (!detail) return failure("No se encontró el atleta.");
    return { ok: true, data: detail };
  } catch (error) {
    return failure(
      error instanceof Error ? error.message : "No se pudo cargar el atleta."
    );
  }
}

export type PhotoInput = {
  key: string;
  caption?: string | null;
};

export type EvaluationInput = {
  athleteId: string;
  date: string;
  discipline: Discipline;
  performance: number;
  technique: number;
  effort: number;
  notes?: string | null;
  /**
   * Numeric readings keyed by the documented ProgressEntry vocabulary (see
   * `components/member/metrics.ts`). Each one also becomes a ProgressEntry so
   * the athlete's charts move.
   */
  metrics: Record<string, number>;
  /** Context stored on the evaluation only, e.g. `{ wodName: "Fran" }`. */
  extras?: Record<string, string>;
  /** Keys the client already uploaded to `athlete-photos/`. */
  photos?: PhotoInput[];
};

/**
 * Creates an Evaluation, the matching ProgressEntry rows, and any photos taken
 * alongside it.
 *
 * Writing the ProgressEntry rows is the point of the feature: without them the
 * athlete's dashboard charts would never move. Unknown metric keys are dropped
 * rather than stored, because a row no chart reads is invisible dead data.
 */
export async function saveEvaluation(
  input: EvaluationInput
): Promise<ActionResult<{ evaluationId: string; progressCreated: number }>> {
  const session = await requireRole("coach");

  if (typeof input.athleteId !== "string" || !input.athleteId) {
    return failure("Selecciona un atleta.");
  }
  if (!isDate(input.date)) return failure("Selecciona una fecha válida.");
  if (!DISCIPLINES.includes(input.discipline)) {
    return failure("Disciplina no válida.");
  }

  const performance = rating(input.performance);
  const technique = rating(input.technique);
  const effort = rating(input.effort);
  if (performance === null || technique === null || effort === null) {
    return failure("Califica rendimiento, técnica y esfuerzo.");
  }

  // The athlete has to exist before we hang rows off their id.
  const athlete = await userClient.models.UserProfile.get({
    userId: input.athleteId,
  });
  const athleteError = errorMessage(athlete.errors);
  if (athleteError) return failure(`No se pudo leer el atleta: ${athleteError}`);
  if (!athlete.data) return failure("El atleta no existe.");

  const numeric: Record<string, number> = {};
  for (const [metric, raw] of Object.entries(input.metrics ?? {})) {
    const value = optionalNumber(raw);
    if (value === null || !isKnownMetric(metric)) continue;
    numeric[metric] = value;
  }

  const extras: Record<string, string> = {};
  for (const [key, raw] of Object.entries(input.extras ?? {})) {
    const text = optionalText(raw, 120);
    if (text) extras[key] = text;
  }

  const coach = await userClient.models.UserProfile.get({
    userId: session.userId,
  });
  const coachName = coach.data?.name ?? session.email;

  const photos = (input.photos ?? []).filter(
    (photo) =>
      typeof photo?.key === "string" &&
      photo.key.startsWith(MEDIA_PREFIXES.athletePhotos)
  );

  const created = await userClient.models.Evaluation.create({
    athleteId: input.athleteId,
    coachId: session.userId,
    coachName,
    date: input.date,
    discipline: input.discipline,
    performance,
    technique,
    effort,
    notes: optionalText(input.notes),
    // `a.json()` is the AWSJSON scalar: it takes a JSON *string*, not an object.
    metrics: JSON.stringify({ ...numeric, ...extras }),
    photoKey: photos[0]?.key ?? null,
  });

  const createError = errorMessage(created.errors);
  if (createError) {
    return failure(`No se pudo guardar la evaluación: ${createError}`);
  }
  const evaluationId = created.data?.id;
  if (!evaluationId) {
    return failure("No se pudo guardar la evaluación.");
  }

  const problems: string[] = [];

  // Each create is retried on a transient credential race: the cookie-backed
  // client refreshes lazily and concurrent writes can otherwise lose one,
  // which would silently drop a metric the coach just recorded.
  const progressResults = await Promise.all(
    Object.entries(numeric).map(([metric, value]) =>
      withRetry(() =>
        userClient.models.ProgressEntry.create({
          userId: input.athleteId,
          discipline: input.discipline,
          metric,
          value,
          unit: metricUnit(metric) || null,
          date: input.date,
        })
      )
    )
  );
  for (const result of progressResults) {
    const error = errorMessage(result.errors);
    if (error) problems.push(error);
  }

  const photoResults = await Promise.all(
    photos.map((photo) =>
      withRetry(() =>
        userClient.models.AthletePhoto.create({
          athleteId: input.athleteId,
          coachId: session.userId,
          key: photo.key,
          caption: optionalText(photo.caption, 240),
          takenAt: input.date,
          evaluationId,
        })
      )
    )
  );
  for (const result of photoResults) {
    const error = errorMessage(result.errors);
    if (error) problems.push(error);
  }

  refresh();

  if (problems.length > 0) {
    return failure(
      `Evaluación guardada, pero algunos datos fallaron: ${problems.join("; ")}`
    );
  }

  return {
    ok: true,
    data: {
      evaluationId,
      progressCreated: progressResults.length,
    },
  };
}

/**
 * Saves progress photos on their own, for a coach who snapped a picture
 * without filling in a full evaluation.
 */
export async function createAthletePhotos(
  athleteId: string,
  photos: PhotoInput[],
  takenAt?: string
): Promise<ActionResult<{ created: number }>> {
  const session = await requireRole("coach");

  if (typeof athleteId !== "string" || !athleteId) {
    return failure("Selecciona un atleta.");
  }

  const valid = (photos ?? []).filter(
    (photo) =>
      typeof photo?.key === "string" &&
      photo.key.startsWith(MEDIA_PREFIXES.athletePhotos)
  );
  if (valid.length === 0) return failure("No hay fotos que guardar.");

  const athlete = await userClient.models.UserProfile.get({ userId: athleteId });
  if (!athlete.data) return failure("El atleta no existe.");

  const date = isDate(takenAt) ? takenAt : todayKey();

  const results = await Promise.all(
    valid.map((photo) =>
      withRetry(() =>
        userClient.models.AthletePhoto.create({
          athleteId,
          coachId: session.userId,
          key: photo.key,
          caption: optionalText(photo.caption, 240),
          takenAt: date,
        })
      )
    )
  );

  const problems = results
    .map((result) => errorMessage(result.errors))
    .filter((message): message is string => Boolean(message));

  if (problems.length > 0) {
    return failure(`No se pudieron guardar las fotos: ${problems.join("; ")}`);
  }

  refresh();
  return { ok: true, data: { created: results.length } };
}
