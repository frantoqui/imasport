import "server-only";

/**
 * Read helpers shared by the admin pages.
 *
 * Everything here goes through `userClient`, which acts as the signed-in user,
 * so the ADMINS authorization rules in `amplify/data/resource.ts` are what
 * actually permit these reads — a page that forgot its `requireRole` check
 * would still not be able to read anything a normal user cannot.
 *
 * `selectionSet` is deliberately not used: narrowing it makes the generated
 * Amplify types blow the TypeScript instantiation depth limit in this project.
 */

import { userClient } from "@/lib/amplify-server";
import { withAuthRetry } from "@/lib/retry";
import type { Schema } from "@/amplify/data/resource";
import { parseJsonValue, type CognitoUser } from "@/components/admin/types";

export type EventRow = Schema["Event"]["type"];
export type RegistrationRow = Schema["EventRegistration"]["type"];
export type AlbumRow = Schema["Album"]["type"];
export type PhotoRow = Schema["Photo"]["type"];
export type PlanRow = Schema["Plan"]["type"];
export type CoachRow = Schema["CoachProfile"]["type"];
export type FaqRow = Schema["Faq"]["type"];
export type ProfileRow = Schema["UserProfile"]["type"];

type GqlErrors = readonly { readonly message?: string | null }[] | null | undefined;

export type Loaded<T> = {
  items: T[];
  /** Non-null when AppSync returned errors; always surfaced in the UI. */
  error: string | null;
  /** True when the pagination cap was hit, so the list is incomplete. */
  truncated: boolean;
};

function errorText(errors: GqlErrors): string | null {
  if (!errors || errors.length === 0) return null;
  const messages = errors
    .map((e) => e?.message)
    .filter((m): m is string => typeof m === "string" && m.length > 0);
  return messages.length > 0 ? messages.join(" · ") : "Error desconocido de AppSync.";
}

/**
 * Follows `nextToken` to the end of a list.
 *
 * The 25-page cap is a guard against an unbounded loop, not an expected limit;
 * when it is reached the caller reports the list as incomplete rather than
 * quietly showing a partial table.
 *
 * Reads are retried and a throw is converted into `error`, never allowed to
 * escape. Admin pages run several of these concurrently, and Amplify's
 * cookie-backed client resolves credentials lazily: the losers of that race —
 * or any request caught by Cognito throttling — throw "No current user" even
 * though the admin is signed in. Letting that propagate turned the whole page
 * into a 500 instead of a table with a warning on it.
 */
async function loadAll<T>(
  fetchPage: (token: string | null) => Promise<{
    data: T[] | null;
    nextToken?: string | null;
    errors?: GqlErrors;
  }>
): Promise<Loaded<T>> {
  const items: T[] = [];
  let token: string | null = null;
  let pages = 0;

  try {
    do {
      const page = await withAuthRetry(() => fetchPage(token));
      const error = errorText(page.errors);
      if (error) return { items, error, truncated: false };
      if (page.data) items.push(...page.data);
      token = page.nextToken ?? null;
      pages += 1;
    } while (token && pages < 25);
  } catch (error) {
    return {
      items,
      error:
        error instanceof Error
          ? error.message
          : "No se pudo leer la información.",
      truncated: Boolean(token),
    };
  }

  return { items, error: null, truncated: Boolean(token) };
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

/** Every event, soonest first. Drafts are included — this is the admin view. */
export async function loadEvents(): Promise<Loaded<EventRow>> {
  const result = await loadAll<EventRow>((nextToken) =>
    userClient.models.Event.list({ limit: 200, nextToken })
  );
  result.items.sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
  return result;
}

export async function loadEvent(
  id: string
): Promise<{ event: EventRow | null; error: string | null }> {
  try {
    const { data, errors } = await withAuthRetry(() =>
      userClient.models.Event.get({ id })
    );
    return { event: data ?? null, error: errorText(errors) };
  } catch (error) {
    return {
      event: null,
      error: error instanceof Error ? error.message : "No se pudo leer el evento.",
    };
  }
}

export async function loadRegistrations(
  eventId: string
): Promise<Loaded<RegistrationRow>> {
  const result = await loadAll<RegistrationRow>((nextToken) =>
    userClient.models.EventRegistration.list({
      filter: { eventId: { eq: eventId } },
      limit: 200,
      nextToken,
    })
  );
  result.items.sort((a, b) =>
    (b.createdAt ?? "").localeCompare(a.createdAt ?? "")
  );
  return result;
}

/** Every registration across all events, for per-event counts in the list. */
export async function loadAllRegistrations(): Promise<Loaded<RegistrationRow>> {
  return loadAll<RegistrationRow>((nextToken) =>
    userClient.models.EventRegistration.list({ limit: 200, nextToken })
  );
}

// ---------------------------------------------------------------------------
// Gallery
// ---------------------------------------------------------------------------

export async function loadAlbums(): Promise<Loaded<AlbumRow>> {
  const result = await loadAll<AlbumRow>((nextToken) =>
    userClient.models.Album.list({ limit: 200, nextToken })
  );
  result.items.sort(
    (a, b) =>
      (a.order ?? 999) - (b.order ?? 999) ||
      (a.title ?? "").localeCompare(b.title ?? "")
  );
  return result;
}

export async function loadAlbum(
  id: string
): Promise<{ album: AlbumRow | null; error: string | null }> {
  try {
    const { data, errors } = await withAuthRetry(() =>
      userClient.models.Album.get({ id })
    );
    return { album: data ?? null, error: errorText(errors) };
  } catch (error) {
    return {
      album: null,
      error: error instanceof Error ? error.message : "No se pudo leer el álbum.",
    };
  }
}

export async function loadPhotos(albumId: string): Promise<Loaded<PhotoRow>> {
  const result = await loadAll<PhotoRow>((nextToken) =>
    userClient.models.Photo.list({
      filter: { albumId: { eq: albumId } },
      limit: 200,
      nextToken,
    })
  );
  result.items.sort(
    (a, b) =>
      (a.order ?? 999) - (b.order ?? 999) ||
      (a.createdAt ?? "").localeCompare(b.createdAt ?? "")
  );
  return result;
}

/** Every photo across all albums, for per-album counts in the list. */
export async function loadAllPhotos(): Promise<Loaded<PhotoRow>> {
  return loadAll<PhotoRow>((nextToken) =>
    userClient.models.Photo.list({ limit: 200, nextToken })
  );
}

// ---------------------------------------------------------------------------
// Plans, coaches, FAQ
// ---------------------------------------------------------------------------

export async function loadPlans(): Promise<Loaded<PlanRow>> {
  const result = await loadAll<PlanRow>((nextToken) =>
    userClient.models.Plan.list({ limit: 200, nextToken })
  );
  result.items.sort(
    (a, b) => (a.order ?? 999) - (b.order ?? 999) || a.priceMxn - b.priceMxn
  );
  return result;
}

export async function loadCoaches(): Promise<Loaded<CoachRow>> {
  const result = await loadAll<CoachRow>((nextToken) =>
    userClient.models.CoachProfile.list({ limit: 200, nextToken })
  );
  result.items.sort(
    (a, b) => (a.order ?? 999) - (b.order ?? 999) || a.name.localeCompare(b.name)
  );
  return result;
}

export async function loadFaqs(): Promise<Loaded<FaqRow>> {
  const result = await loadAll<FaqRow>((nextToken) =>
    userClient.models.Faq.list({ limit: 200, nextToken })
  );
  result.items.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
  return result;
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export async function loadProfiles(): Promise<Loaded<ProfileRow>> {
  const result = await loadAll<ProfileRow>((nextToken) =>
    userClient.models.UserProfile.list({ limit: 200, nextToken })
  );
  result.items.sort((a, b) => a.name.localeCompare(b.name));
  return result;
}

/**
 * The Cognito side of the user list.
 *
 * Returns `a.json()`, which can arrive either already parsed or as a JSON
 * string depending on the transport, and the Lambda's shape is not typed by
 * the schema — so everything is narrowed defensively and a malformed entry is
 * dropped rather than crashing the page.
 */
export async function loadCognitoUsers(): Promise<{
  users: CognitoUser[];
  error: string | null;
}> {
  let data: unknown = null;
  let error: string | null = null;
  try {
    const result = await withAuthRetry(() =>
      userClient.queries.listCognitoUsers()
    );
    data = result.data;
    error = errorText(result.errors);
  } catch (caught) {
    error =
      caught instanceof Error
        ? caught.message
        : "No se pudo consultar Cognito.";
  }

  // The Lambda returns `{ users: [...] }`, but a bare array is tolerated too
  // rather than silently rendering an empty list.
  const payload = parseJsonValue<{ users?: unknown } | unknown[]>(data);
  const rawUsers = Array.isArray(payload)
    ? payload
    : payload && Array.isArray(payload.users)
      ? payload.users
      : [];

  const users = rawUsers.flatMap((raw): CognitoUser[] => {
    if (typeof raw !== "object" || raw === null) return [];
    const r = raw as Record<string, unknown>;
    const userId = typeof r.userId === "string" ? r.userId : null;
    if (!userId) return [];
    return [
      {
        userId,
        email: typeof r.email === "string" ? r.email : "",
        emailVerified: r.emailVerified === true,
        name: typeof r.name === "string" ? r.name : "",
        phone: typeof r.phone === "string" ? r.phone : "",
        // A missing `enabled` is treated as enabled, which is Cognito's own
        // default for a newly created user.
        enabled: r.enabled !== false,
        status: typeof r.status === "string" ? r.status : "",
        createdAt: typeof r.createdAt === "string" ? r.createdAt : null,
        groups: Array.isArray(r.groups)
          ? r.groups.filter((g): g is string => typeof g === "string")
          : [],
      },
    ];
  });

  return { users, error };
}

// ---------------------------------------------------------------------------
// Overview counters
// ---------------------------------------------------------------------------

export type AdminCounts = {
  profiles: number;
  coaches: number;
  pendingCoachRequests: number;
  events: number;
  publishedEvents: number;
  upcomingEvents: number;
  albums: number;
  photos: number;
  registrations: number;
  plans: number;
  faqs: number;
  coachCards: number;
  errors: string[];
  truncated: boolean;
};

/** Today as `YYYY-MM-DD` in local time, to compare against an AWSDate. */
export function todayIso(): string {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

/**
 * One pass over the models the overview card needs.
 *
 * These are full list reads rather than server-side counts, because AppSync
 * does not expose a count: for a gym-sized dataset that is cheaper than it
 * looks, and it is the same data the sections themselves read.
 */
export async function loadAdminCounts(): Promise<AdminCounts> {
  const [profiles, events, albums, photos, registrations, plans, faqs, coachCards] =
    await Promise.all([
      loadProfiles(),
      loadEvents(),
      loadAlbums(),
      loadAllPhotos(),
      loadAllRegistrations(),
      loadPlans(),
      loadFaqs(),
      loadCoaches(),
    ]);

  const today = todayIso();
  const sources = [
    profiles,
    events,
    albums,
    photos,
    registrations,
    plans,
    faqs,
    coachCards,
  ];

  return {
    profiles: profiles.items.length,
    coaches: profiles.items.filter((p) => p.role === "COACH").length,
    pendingCoachRequests: profiles.items.filter((p) => p.coachStatus === "PENDING")
      .length,
    events: events.items.length,
    publishedEvents: events.items.filter((e) => e.published === true).length,
    upcomingEvents: events.items.filter((e) => (e.date ?? "") >= today).length,
    albums: albums.items.length,
    photos: photos.items.length,
    registrations: registrations.items.length,
    plans: plans.items.length,
    faqs: faqs.items.length,
    coachCards: coachCards.items.length,
    errors: sources
      .map((s) => s.error)
      .filter((e): e is string => typeof e === "string"),
    truncated: sources.some((s) => s.truncated),
  };
}
