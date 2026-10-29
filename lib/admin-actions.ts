"use server";

/**
 * Server Actions for every admin mutation.
 *
 * Three rules hold for all of them:
 *
 *   1. They start with `await requireRole("admin")`. `proxy.ts` is an
 *      optimistic pre-filter and Server Actions are reachable by direct POST,
 *      so this is the check that actually guards the data.
 *   2. They return an `ActionResult` instead of throwing, so an AppSync error
 *      is rendered next to the control that caused it. Nothing is swallowed.
 *   3. After a successful write they call `invalidate(...)`, which refreshes
 *      the admin router and expires the cache tags the public marketing pages
 *      read their content under.
 *
 * File uploads are not here: S3 writes happen in the browser with
 * `uploadData`, and the resulting key is handed to one of these actions.
 *
 * A `"use server"` module may only export async functions, which is why the
 * shared constants and input types live in `components/admin/types.ts`.
 */

import { refresh, updateTag } from "next/cache";
import { requireRole } from "@/lib/dal";
import { userClient } from "@/lib/amplify-server";
import {
  ROLE_FOR_GROUP,
  type ActionResult,
  type AlbumInput,
  type CoachInput,
  type CognitoGroup,
  type EventInput,
  type FaqInput,
  type PaymentStatus,
  type PhotoInput,
  type PlanInput,
  type PlanTier,
  type RegistrationStatus,
} from "@/components/admin/types";

// ---------------------------------------------------------------------------
// Plumbing
// ---------------------------------------------------------------------------

type GqlErrors = readonly { readonly message?: string | null }[] | null | undefined;

/** Collapses an Amplify `errors` array into one message, or `null` if clean. */
function errorText(errors: GqlErrors): string | null {
  if (!errors || errors.length === 0) return null;
  const messages = errors
    .map((e) => e?.message)
    .filter((m): m is string => typeof m === "string" && m.length > 0);
  return messages.length > 0 ? messages.join(" · ") : "Error desconocido de AppSync.";
}

function fail(error: string): { ok: false; error: string } {
  return { ok: false, error };
}

function ok<T>(data: T, message?: string): { ok: true; data: T; message?: string } {
  return message === undefined ? { ok: true, data } : { ok: true, data, message };
}

/**
 * Cache tags the public pages are expected to read their content under. They
 * are plain strings on purpose: tagging is additive, so expiring a tag nobody
 * has registered yet is a harmless no-op, and the moment a public page adopts
 * `cacheTag("events")` these actions already keep it fresh.
 */
type ContentTag =
  | "events"
  | "registrations"
  | "albums"
  | "photos"
  | "plans"
  | "coaches"
  | "faq"
  | "settings"
  | "users";

/**
 * `refresh()` first, then `updateTag()`: `refresh` only marks the client router
 * dirty, while `updateTag` marks both the static cache and the router, and the
 * stronger of the two has to be recorded last.
 */
function invalidate(...tags: ContentTag[]): void {
  refresh();
  for (const tag of tags) updateTag(tag);
}

/** Walks `nextToken` so a count or a cascade never silently stops at page 1. */
async function listEveryPage<T>(
  fetchPage: (token: string | null) => Promise<{
    data: T[] | null;
    nextToken?: string | null;
    errors?: GqlErrors;
  }>
): Promise<{ items: T[]; error: string | null; truncated: boolean }> {
  const items: T[] = [];
  let token: string | null = null;
  let pages = 0;

  do {
    const page = await fetchPage(token);
    const error = errorText(page.errors);
    if (error) return { items, error, truncated: false };
    if (page.data) items.push(...page.data);
    token = page.nextToken ?? null;
    pages += 1;
  } while (token && pages < 50);

  return { items, error: null, truncated: Boolean(token) };
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export async function createEvent(
  input: EventInput
): Promise<ActionResult<string>> {
  await requireRole("admin");

  const { data, errors } = await userClient.models.Event.create({
    title: input.title,
    slug: input.slug,
    description: input.description,
    date: input.date,
    time: input.time,
    location: input.location,
    category: input.category,
    spots: input.spots,
    spotsTaken: 0,
    imageKey: input.imageKey,
    imageUrl: input.imageUrl,
    featured: input.featured,
    published: input.published,
    priceMxn: input.priceMxn,
  });

  const error = errorText(errors);
  if (error) return fail(error);
  if (!data) return fail("El evento no se creó y AppSync no devolvió un motivo.");

  invalidate("events");
  return ok(data.id, "Evento creado.");
}

export async function updateEvent(
  id: string,
  input: EventInput
): Promise<ActionResult<null>> {
  await requireRole("admin");

  const { errors } = await userClient.models.Event.update({
    id,
    title: input.title,
    slug: input.slug,
    description: input.description,
    date: input.date,
    time: input.time,
    location: input.location,
    category: input.category,
    spots: input.spots,
    imageKey: input.imageKey,
    imageUrl: input.imageUrl,
    featured: input.featured,
    published: input.published,
    priceMxn: input.priceMxn,
  });

  const error = errorText(errors);
  if (error) return fail(error);

  invalidate("events");
  return ok(null, "Cambios guardados.");
}

/** Inline publish / feature toggles from the events table. */
export async function setEventFlags(
  id: string,
  flags: { published?: boolean; featured?: boolean }
): Promise<ActionResult<null>> {
  await requireRole("admin");

  const { errors } = await userClient.models.Event.update({ id, ...flags });
  const error = errorText(errors);
  if (error) return fail(error);

  invalidate("events");
  return ok(null, "Evento actualizado.");
}

/**
 * Deletes an event.
 *
 * There is no cascade in DynamoDB, so registrations have to be removed
 * explicitly. Rather than silently destroying them, the action refuses unless
 * the caller ticked "borrar también las inscripciones" in the confirm step.
 * Albums that pointed at the event are kept and unlinked — a gallery is worth
 * more than its link to a past event.
 */
export async function deleteEvent(
  id: string,
  options: { deleteRegistrations: boolean }
): Promise<ActionResult<null>> {
  await requireRole("admin");

  const registrations = await listEveryPage((nextToken) =>
    userClient.models.EventRegistration.list({
      filter: { eventId: { eq: id } },
      limit: 200,
      nextToken,
    })
  );
  if (registrations.error) return fail(registrations.error);

  if (registrations.items.length > 0 && !options.deleteRegistrations) {
    return fail(
      `Este evento tiene ${registrations.items.length} inscripción(es). ` +
        "Marca la casilla para borrarlas junto con el evento, o cancélalas desde la pantalla de inscripciones."
    );
  }

  for (const registration of registrations.items) {
    const { errors } = await userClient.models.EventRegistration.delete({
      id: registration.id,
    });
    const error = errorText(errors);
    if (error) return fail(`No se pudo borrar una inscripción: ${error}`);
  }

  const albums = await listEveryPage((nextToken) =>
    userClient.models.Album.list({
      filter: { eventId: { eq: id } },
      limit: 200,
      nextToken,
    })
  );
  if (albums.error) return fail(albums.error);

  for (const album of albums.items) {
    const { errors } = await userClient.models.Album.update({
      id: album.id,
      eventId: null,
    });
    const error = errorText(errors);
    if (error) return fail(`No se pudo desvincular un álbum: ${error}`);
  }

  const { errors } = await userClient.models.Event.delete({ id });
  const error = errorText(errors);
  if (error) return fail(error);

  invalidate("events", "registrations", "albums");

  const parts = ["Evento borrado"];
  if (registrations.items.length > 0) {
    parts.push(`${registrations.items.length} inscripción(es) borrada(s)`);
  }
  if (albums.items.length > 0) {
    parts.push(`${albums.items.length} álbum(es) desvinculado(s)`);
  }
  return ok(null, `${parts.join(", ")}.`);
}

/**
 * Recomputes `Event.spotsTaken` from the registration rows.
 *
 * The counter is denormalized for the public page; every admin change to a
 * registration runs this so the two never drift. Waitlisted and cancelled
 * people do not occupy a spot.
 */
async function recountEventSpots(eventId: string): Promise<string | null> {
  const registrations = await listEveryPage((nextToken) =>
    userClient.models.EventRegistration.list({
      filter: { eventId: { eq: eventId } },
      limit: 200,
      nextToken,
    })
  );
  if (registrations.error) return registrations.error;

  const taken = registrations.items.filter(
    (r) => r.status === "REGISTERED" || r.status === "ATTENDED"
  ).length;

  const { errors } = await userClient.models.Event.update({
    id: eventId,
    spotsTaken: taken,
  });
  return errorText(errors);
}

export async function setRegistrationStatus(
  id: string,
  eventId: string,
  status: RegistrationStatus
): Promise<ActionResult<null>> {
  await requireRole("admin");

  const { errors } = await userClient.models.EventRegistration.update({
    id,
    status,
  });
  const error = errorText(errors);
  if (error) return fail(error);

  const recountError = await recountEventSpots(eventId);
  invalidate("events", "registrations");

  if (recountError) {
    return ok(
      null,
      `Estatus actualizado, pero no se pudo recalcular los lugares ocupados: ${recountError}`
    );
  }
  return ok(null, "Estatus actualizado.");
}

export async function deleteRegistration(
  id: string,
  eventId: string
): Promise<ActionResult<null>> {
  await requireRole("admin");

  const { errors } = await userClient.models.EventRegistration.delete({ id });
  const error = errorText(errors);
  if (error) return fail(error);

  const recountError = await recountEventSpots(eventId);
  invalidate("events", "registrations");

  if (recountError) {
    return ok(
      null,
      `Inscripción borrada, pero no se pudo recalcular los lugares ocupados: ${recountError}`
    );
  }
  return ok(null, "Inscripción borrada.");
}

// ---------------------------------------------------------------------------
// Gallery: albums
// ---------------------------------------------------------------------------

export async function createAlbum(
  input: AlbumInput
): Promise<ActionResult<string>> {
  await requireRole("admin");

  const { data, errors } = await userClient.models.Album.create({
    title: input.title,
    slug: input.slug,
    description: input.description,
    coverKey: input.coverKey,
    visibility: input.visibility,
    published: input.published,
    order: input.order,
    eventId: input.eventId,
  });

  const error = errorText(errors);
  if (error) return fail(error);
  if (!data) return fail("El álbum no se creó y AppSync no devolvió un motivo.");

  invalidate("albums");
  return ok(data.id, "Álbum creado.");
}

export async function updateAlbum(
  id: string,
  input: AlbumInput
): Promise<ActionResult<null>> {
  await requireRole("admin");

  const { errors } = await userClient.models.Album.update({
    id,
    title: input.title,
    slug: input.slug,
    description: input.description,
    coverKey: input.coverKey,
    visibility: input.visibility,
    published: input.published,
    order: input.order,
    eventId: input.eventId,
  });

  const error = errorText(errors);
  if (error) return fail(error);

  invalidate("albums", "photos");
  return ok(null, "Cambios guardados.");
}

/**
 * Deletes an album and its photo rows.
 *
 * There is no cascade, so orphaned `Photo` rows would keep showing up in any
 * query that lists photos. The S3 objects themselves are left in place: they
 * are cheap, and deleting them would make an accidental album delete
 * unrecoverable.
 */
export async function deleteAlbum(id: string): Promise<ActionResult<number>> {
  await requireRole("admin");

  const photos = await listEveryPage((nextToken) =>
    userClient.models.Photo.list({
      filter: { albumId: { eq: id } },
      limit: 200,
      nextToken,
    })
  );
  if (photos.error) return fail(photos.error);

  let deleted = 0;
  for (const photo of photos.items) {
    const { errors } = await userClient.models.Photo.delete({ id: photo.id });
    const error = errorText(errors);
    if (error) {
      return fail(
        `Se borraron ${deleted} de ${photos.items.length} fotos y luego falló: ${error}. El álbum no se borró.`
      );
    }
    deleted += 1;
  }

  const { errors } = await userClient.models.Album.delete({ id });
  const error = errorText(errors);
  if (error) return fail(error);

  invalidate("albums", "photos");
  return ok(
    deleted,
    deleted === 0
      ? "Álbum borrado (no tenía fotos)."
      : `Álbum borrado junto con ${deleted} foto(s). Los archivos siguen en S3.`
  );
}

// ---------------------------------------------------------------------------
// Gallery: photos
// ---------------------------------------------------------------------------

/** Registers already-uploaded S3 keys as photos of an album. */
export async function addPhotos(
  albumId: string,
  photos: PhotoInput[]
): Promise<ActionResult<number>> {
  await requireRole("admin");

  if (photos.length === 0) return fail("No se recibió ninguna foto.");

  let created = 0;
  const failures: string[] = [];

  for (const photo of photos) {
    const { errors } = await userClient.models.Photo.create({
      albumId,
      key: photo.key,
      caption: photo.caption,
      order: photo.order,
    });
    const error = errorText(errors);
    if (error) failures.push(`${photo.key}: ${error}`);
    else created += 1;
  }

  invalidate("photos", "albums");

  if (failures.length > 0 && created === 0) {
    return fail(`Ninguna foto se guardó. ${failures.join(" | ")}`);
  }
  if (failures.length > 0) {
    return ok(
      created,
      `${created} foto(s) guardada(s), ${failures.length} con error: ${failures.join(" | ")}`
    );
  }
  return ok(created, `${created} foto(s) agregada(s).`);
}

export async function updatePhoto(
  id: string,
  input: { caption: string | null; order: number | null }
): Promise<ActionResult<null>> {
  await requireRole("admin");

  const { errors } = await userClient.models.Photo.update({
    id,
    caption: input.caption,
    order: input.order,
  });
  const error = errorText(errors);
  if (error) return fail(error);

  invalidate("photos");
  return ok(null, "Foto actualizada.");
}

export async function deletePhoto(id: string): Promise<ActionResult<null>> {
  await requireRole("admin");

  const { errors } = await userClient.models.Photo.delete({ id });
  const error = errorText(errors);
  if (error) return fail(error);

  invalidate("photos", "albums");
  return ok(null, "Foto borrada.");
}

/** Persists a new display order for several photos at once. */
export async function reorderPhotos(
  items: { id: string; order: number }[]
): Promise<ActionResult<null>> {
  await requireRole("admin");

  for (const item of items) {
    const { errors } = await userClient.models.Photo.update({
      id: item.id,
      order: item.order,
    });
    const error = errorText(errors);
    if (error) return fail(`No se pudo reordenar: ${error}`);
  }

  invalidate("photos");
  return ok(null, "Orden guardado.");
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

/**
 * Moves a user into exactly one Cognito group and keeps the denormalized
 * `UserProfile.role` copy in step.
 *
 * The group is authoritative; the profile copy only exists so the admin list
 * can filter without hitting Cognito. A Cognito-only account (no profile row
 * yet) is not an error — the group change still applies.
 */
export async function setUserRole(
  userId: string,
  group: CognitoGroup
): Promise<ActionResult<null>> {
  await requireRole("admin");

  const { errors } = await userClient.mutations.setUserRole({ userId, role: group });
  const error = errorText(errors);
  if (error) return fail(error);

  const profileError = await syncProfileRole(userId, group);
  invalidate("users");

  if (profileError) {
    return ok(
      null,
      `Grupo de Cognito actualizado, pero la copia en el perfil no: ${profileError}`
    );
  }
  return ok(null, "Rol actualizado.");
}

/** Updates `UserProfile.role` when the row exists. Returns an error message. */
async function syncProfileRole(
  userId: string,
  group: CognitoGroup
): Promise<string | null> {
  const { data: profile, errors: getErrors } =
    await userClient.models.UserProfile.get({ userId });
  const getError = errorText(getErrors);
  if (getError) return getError;
  if (!profile) return null; // Cognito-only account, nothing to mirror.

  const { errors } = await userClient.models.UserProfile.update({
    userId,
    role: ROLE_FOR_GROUP[group],
  });
  return errorText(errors);
}

export async function setUserEnabled(
  userId: string,
  enabled: boolean
): Promise<ActionResult<null>> {
  await requireRole("admin");

  const { errors } = await userClient.mutations.setUserEnabled({ userId, enabled });
  const error = errorText(errors);
  if (error) return fail(error);

  // Mirror onto the profile when there is one, so lists agree with Cognito.
  const { data: profile } = await userClient.models.UserProfile.get({ userId });
  if (profile) {
    await userClient.models.UserProfile.update({ userId, isActive: enabled });
  }

  invalidate("users");
  return ok(null, enabled ? "Cuenta habilitada." : "Cuenta deshabilitada.");
}

/**
 * Sets a user's plan by hand. There are no payments in this build, so an admin
 * marks a transfer as received here.
 */
export async function updateUserPlan(
  userId: string,
  planTier: PlanTier | null,
  planStatus: PaymentStatus | null
): Promise<ActionResult<null>> {
  await requireRole("admin");

  const { errors } = await userClient.models.UserProfile.update({
    userId,
    planTier,
    planStatus,
  });
  const error = errorText(errors);
  if (error) return fail(error);

  invalidate("users");
  return ok(null, "Plan actualizado.");
}

/**
 * Approves a coach application: marks the profile APPROVED, moves the account
 * into the COACHES group, mirrors the role onto the profile and — optionally —
 * creates the public coach card prefilled from the application.
 */
export async function approveCoach(
  userId: string,
  options: { createCoachProfile: boolean }
): Promise<ActionResult<null>> {
  await requireRole("admin");

  const { data: profile, errors: getErrors } =
    await userClient.models.UserProfile.get({ userId });
  const getError = errorText(getErrors);
  if (getError) return fail(getError);
  if (!profile) {
    return fail("Este usuario no tiene perfil, no hay solicitud que aprobar.");
  }

  const { errors: updateErrors } = await userClient.models.UserProfile.update({
    userId,
    coachStatus: "APPROVED",
    role: "COACH",
  });
  const updateError = errorText(updateErrors);
  if (updateError) return fail(updateError);

  const { errors: groupErrors } = await userClient.mutations.setUserRole({
    userId,
    role: "COACHES",
  });
  const groupError = errorText(groupErrors);
  if (groupError) {
    return fail(
      `Se marcó la solicitud como aprobada, pero el grupo de Cognito no cambió: ${groupError}`
    );
  }

  let cardNote = "";
  if (options.createCoachProfile) {
    const { errors: cardErrors } = await userClient.models.CoachProfile.create({
      userId,
      name: profile.name,
      discipline: profile.discipline ?? null,
      certifications: profile.certifications ?? null,
      bio: profile.bio ?? null,
      specialty: profile.specialty ?? null,
      yearsExperience: profile.yearsExperience ?? null,
      published: false,
      order: 99,
    });
    const cardError = errorText(cardErrors);
    cardNote = cardError
      ? ` La ficha pública no se creó: ${cardError}`
      : " Se creó su ficha pública como borrador (revísala en Coaches).";
  }

  invalidate("users", "coaches");
  return ok(null, `Solicitud aprobada.${cardNote}`);
}

export async function rejectCoach(userId: string): Promise<ActionResult<null>> {
  await requireRole("admin");

  const { errors } = await userClient.models.UserProfile.update({
    userId,
    coachStatus: "REJECTED",
  });
  const error = errorText(errors);
  if (error) return fail(error);

  invalidate("users");
  return ok(null, "Solicitud rechazada.");
}

// ---------------------------------------------------------------------------
// Plans
// ---------------------------------------------------------------------------

/**
 * `features` / `featuresEn` are `a.string().array()`. An empty list is sent as
 * `null` rather than `[]` so the public page can tell "no features configured"
 * from "an empty list on purpose".
 */
function arrayOrNull(values: string[]): string[] | null {
  const cleaned = values.map((v) => v.trim()).filter((v) => v.length > 0);
  return cleaned.length > 0 ? cleaned : null;
}

export async function createPlan(
  input: PlanInput
): Promise<ActionResult<string>> {
  await requireRole("admin");

  const { data, errors } = await userClient.models.Plan.create({
    tier: input.tier,
    name: input.name,
    nameEn: input.nameEn,
    priceMxn: input.priceMxn,
    features: arrayOrNull(input.features),
    featuresEn: arrayOrNull(input.featuresEn),
    popular: input.popular,
    order: input.order,
    active: input.active,
  });

  const error = errorText(errors);
  if (error) return fail(error);
  if (!data) return fail("El plan no se creó y AppSync no devolvió un motivo.");

  invalidate("plans");
  return ok(data.id, "Plan creado.");
}

export async function updatePlan(
  id: string,
  input: PlanInput
): Promise<ActionResult<null>> {
  await requireRole("admin");

  const { errors } = await userClient.models.Plan.update({
    id,
    tier: input.tier,
    name: input.name,
    nameEn: input.nameEn,
    priceMxn: input.priceMxn,
    features: arrayOrNull(input.features),
    featuresEn: arrayOrNull(input.featuresEn),
    popular: input.popular,
    order: input.order,
    active: input.active,
  });

  const error = errorText(errors);
  if (error) return fail(error);

  invalidate("plans");
  return ok(null, "Plan guardado.");
}

export async function deletePlan(id: string): Promise<ActionResult<null>> {
  await requireRole("admin");

  const { errors } = await userClient.models.Plan.delete({ id });
  const error = errorText(errors);
  if (error) return fail(error);

  invalidate("plans");
  return ok(null, "Plan borrado.");
}

/** Clears `popular` on every other plan, so only one card is highlighted. */
export async function setPopularPlan(id: string): Promise<ActionResult<null>> {
  await requireRole("admin");

  const plans = await listEveryPage((nextToken) =>
    userClient.models.Plan.list({ limit: 200, nextToken })
  );
  if (plans.error) return fail(plans.error);

  for (const plan of plans.items) {
    const shouldBePopular = plan.id === id;
    if (Boolean(plan.popular) === shouldBePopular) continue;
    const { errors } = await userClient.models.Plan.update({
      id: plan.id,
      popular: shouldBePopular,
    });
    const error = errorText(errors);
    if (error) return fail(error);
  }

  invalidate("plans");
  return ok(null, "Plan destacado actualizado.");
}

// ---------------------------------------------------------------------------
// Coaches (public cards)
// ---------------------------------------------------------------------------

export async function createCoach(
  input: CoachInput
): Promise<ActionResult<string>> {
  await requireRole("admin");

  const { data, errors } = await userClient.models.CoachProfile.create({
    userId: input.userId,
    name: input.name,
    discipline: input.discipline,
    certifications: input.certifications,
    bio: input.bio,
    imageKey: input.imageKey,
    imageUrl: input.imageUrl,
    instagram: input.instagram,
    specialty: input.specialty,
    yearsExperience: input.yearsExperience,
    order: input.order,
    published: input.published,
  });

  const error = errorText(errors);
  if (error) return fail(error);
  if (!data) return fail("La ficha no se creó y AppSync no devolvió un motivo.");

  invalidate("coaches");
  return ok(data.id, "Coach creado.");
}

export async function updateCoach(
  id: string,
  input: CoachInput
): Promise<ActionResult<null>> {
  await requireRole("admin");

  const { errors } = await userClient.models.CoachProfile.update({
    id,
    userId: input.userId,
    name: input.name,
    discipline: input.discipline,
    certifications: input.certifications,
    bio: input.bio,
    imageKey: input.imageKey,
    imageUrl: input.imageUrl,
    instagram: input.instagram,
    specialty: input.specialty,
    yearsExperience: input.yearsExperience,
    order: input.order,
    published: input.published,
  });

  const error = errorText(errors);
  if (error) return fail(error);

  invalidate("coaches");
  return ok(null, "Coach guardado.");
}

export async function deleteCoach(id: string): Promise<ActionResult<null>> {
  await requireRole("admin");

  const { errors } = await userClient.models.CoachProfile.delete({ id });
  const error = errorText(errors);
  if (error) return fail(error);

  invalidate("coaches");
  return ok(null, "Coach borrado.");
}

// ---------------------------------------------------------------------------
// FAQ
// ---------------------------------------------------------------------------

export async function createFaq(input: FaqInput): Promise<ActionResult<string>> {
  await requireRole("admin");

  const { data, errors } = await userClient.models.Faq.create({
    question: input.question,
    answer: input.answer,
    questionEn: input.questionEn,
    answerEn: input.answerEn,
    order: input.order,
    published: input.published,
  });

  const error = errorText(errors);
  if (error) return fail(error);
  if (!data) return fail("La pregunta no se creó y AppSync no devolvió un motivo.");

  invalidate("faq");
  return ok(data.id, "Pregunta creada.");
}

export async function updateFaq(
  id: string,
  input: FaqInput
): Promise<ActionResult<null>> {
  await requireRole("admin");

  const { errors } = await userClient.models.Faq.update({
    id,
    question: input.question,
    answer: input.answer,
    questionEn: input.questionEn,
    answerEn: input.answerEn,
    order: input.order,
    published: input.published,
  });

  const error = errorText(errors);
  if (error) return fail(error);

  invalidate("faq");
  return ok(null, "Pregunta guardada.");
}

export async function deleteFaq(id: string): Promise<ActionResult<null>> {
  await requireRole("admin");

  const { errors } = await userClient.models.Faq.delete({ id });
  const error = errorText(errors);
  if (error) return fail(error);

  invalidate("faq");
  return ok(null, "Pregunta borrada.");
}

// ---------------------------------------------------------------------------
// Site settings
// ---------------------------------------------------------------------------

/**
 * Upserts a `SiteSetting`.
 *
 * The model is identified by `key`, so there is no id to track: we read it,
 * update when present and create only when missing — the seeded `contact`,
 * `heroStats` and `hero` rows must be edited in place, not duplicated.
 *
 * `value` is `a.json()`, which maps to the AppSync `AWSJSON` scalar and takes
 * a JSON *string* as a GraphQL variable. Passing the object itself is rejected
 * with "Variable 'value' has an invalid value", so it is stringified here;
 * readers parse it back (see `parseJsonValue`).
 */
export async function saveSiteSetting(
  key: string,
  value: Record<string, string>
): Promise<ActionResult<null>> {
  await requireRole("admin");

  const { data: existing, errors: getErrors } =
    await userClient.models.SiteSetting.get({ key });
  const getError = errorText(getErrors);
  if (getError) return fail(getError);

  const encoded = JSON.stringify(value);

  const errors = existing
    ? (await userClient.models.SiteSetting.update({ key, value: encoded })).errors
    : (await userClient.models.SiteSetting.create({ key, value: encoded })).errors;

  const error = errorText(errors);
  if (error) return fail(error);

  invalidate("settings");
  return ok(null, existing ? "Contenido actualizado." : "Contenido creado.");
}
