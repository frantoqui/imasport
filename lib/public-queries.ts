import "server-only";

import { cache } from "react";
import {
  getAsGuest,
  listAsGuest,
  userClient,
  type ModelName,
} from "./amplify-server";
import { mediaUrl } from "./media";
import type { Schema } from "@/amplify/data/resource";
import type {
  AlbumView,
  AlbumVisibility,
  CoachView,
  Discipline,
  EventView,
  FaqView,
  HeroContent,
  PhotoView,
  PlanView,
} from "./public-views";

/**
 * Server-side reads for the public marketing site.
 *
 * Four rules hold for everything in this file:
 *
 *  1. Reads go through `listAsGuest` / `getAsGuest`, so the page touches no
 *     cookies and stays cacheable. `userClient` appears only where a row
 *     genuinely requires a signed-in viewer (member-only albums).
 *  2. Nothing throws. A marketing page with an empty section is far better than
 *     a 500, so every query logs its `errors` server-side and degrades to
 *     `[]` / `null`.
 *  3. Every row is projected into a plain `*Row` DTO before it leaves its
 *     query. That drops the lazy relationship loaders (`event.albums()`) that
 *     cannot cross into a Client Component, and keeps the type checker on flat
 *     object types.
 *  4. What callers get back is a view model with display strings already
 *     formatted, so the date and price formatters stay out of the client
 *     bundle.
 */

const GYM_INSTAGRAM = "imasportsmx";

// The view models live in a separate, non-`server-only` module so client
// components can import them; re-exported here for server-side callers.
export type {
  AlbumView,
  AlbumVisibility,
  CoachView,
  Discipline,
  EventView,
  FaqView,
  HeroContent,
  PhotoView,
  PlanView,
} from "./public-views";

// ----------------------------------------------------------------- formatting

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
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

/**
 * Dates are stored as `a.date()`, i.e. the string "YYYY-MM-DD". We split the
 * string rather than going through `new Date()`, because parsing it as a Date
 * treats it as UTC midnight and shifts the day backwards west of Greenwich.
 */
function splitDate(date: string): [number, number, number] | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(date ?? "");
  if (!match) return null;
  const [, y, m, d] = match;
  const month = Number(m);
  if (month < 1 || month > 12) return null;
  return [Number(y), month, Number(d)];
}

/** "2025-09-14" -> "14 Sep 2025" */
export function formatEventDate(date: string): string {
  const parts = splitDate(date);
  if (!parts) return date ?? "";
  const [year, month, day] = parts;
  return `${day} ${MONTHS_SHORT[month - 1]} ${year}`;
}

/** "2025-09-14" -> "14 de septiembre de 2025" */
export function formatEventDateLong(date: string): string {
  const parts = splitDate(date);
  if (!parts) return date ?? "";
  const [year, month, day] = parts;
  return `${day} de ${MONTHS_LONG[month - 1]} de ${year}`;
}

const mxn = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  currencyDisplay: "symbol",
  maximumFractionDigits: 0,
});

/** 1299 -> "$1,299" (the "MXN" suffix is part of the plan card markup). */
export function formatPrice(value: number): string {
  // es-MX renders "$1,299.00"; we only want the grouped integer.
  return mxn.format(value).replace(/\s*MXN\s*/g, "").trim();
}

function todayIso(): string {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

// ------------------------------------------------------------------ DTO layer

type EventRaw = Schema["Event"]["type"];
type AlbumRaw = Schema["Album"]["type"];
type PlanRaw = Schema["Plan"]["type"];
type CoachRaw = Schema["CoachProfile"]["type"];
type FaqRaw = Schema["Faq"]["type"];
type PhotoRaw = Schema["Photo"]["type"];
type SiteSettingRaw = Schema["SiteSetting"]["type"];

type EventRow = {
  id: string;
  title: string;
  slug: string | null;
  description: string | null;
  date: string;
  time: string | null;
  location: string | null;
  category: Discipline | null;
  spots: number | null;
  spotsTaken: number | null;
  imageKey: string | null;
  imageUrl: string | null;
  featured: boolean | null;
  published: boolean | null;
  priceMxn: number | null;
};

type AlbumRow = {
  id: string;
  title: string;
  slug: string | null;
  description: string | null;
  coverKey: string | null;
  visibility: AlbumVisibility | null;
  published: boolean | null;
  order: number | null;
  eventId: string | null;
};

type PlanRow = {
  id: string;
  tier: "basic" | "pro" | "elite" | null;
  name: string;
  nameEn: string | null;
  priceMxn: number;
  features: string[];
  featuresEn: string[];
  popular: boolean | null;
  order: number | null;
};

type CoachRow = {
  id: string;
  name: string;
  discipline: Discipline | null;
  certifications: string | null;
  bio: string | null;
  imageKey: string | null;
  imageUrl: string | null;
  instagram: string | null;
  specialty: string | null;
  yearsExperience: number | null;
  order: number | null;
};

type FaqRow = {
  id: string;
  question: string;
  answer: string;
  questionEn: string | null;
  answerEn: string | null;
  order: number | null;
};

type PhotoRow = {
  id: string;
  key: string;
  caption: string | null;
  order: number | null;
  width: number | null;
  height: number | null;
};

/** Drops the nulls DynamoDB leaves in an `a.string().array()` column. */
function toStringArray(list: readonly (string | null)[] | null | undefined) {
  return (list ?? []).filter(
    (item): item is string => typeof item === "string" && item.length > 0
  );
}

function readEventRow(row: EventRaw): EventRow {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug ?? null,
    description: row.description ?? null,
    date: row.date,
    time: row.time ?? null,
    location: row.location ?? null,
    category: row.category ?? null,
    spots: row.spots ?? null,
    spotsTaken: row.spotsTaken ?? null,
    imageKey: row.imageKey ?? null,
    imageUrl: row.imageUrl ?? null,
    featured: row.featured ?? null,
    published: row.published ?? null,
    priceMxn: row.priceMxn ?? null,
  };
}

function readAlbumRow(row: AlbumRaw): AlbumRow {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug ?? null,
    description: row.description ?? null,
    coverKey: row.coverKey ?? null,
    visibility: row.visibility ?? null,
    published: row.published ?? null,
    order: row.order ?? null,
    eventId: row.eventId ?? null,
  };
}

function readPlanRow(row: PlanRaw): PlanRow {
  return {
    id: row.id,
    tier: row.tier ?? null,
    name: row.name,
    nameEn: row.nameEn ?? null,
    priceMxn: row.priceMxn,
    features: toStringArray(row.features),
    featuresEn: toStringArray(row.featuresEn),
    popular: row.popular ?? null,
    order: row.order ?? null,
  };
}

function readCoachRow(row: CoachRaw): CoachRow {
  return {
    id: row.id,
    name: row.name,
    discipline: row.discipline ?? null,
    certifications: row.certifications ?? null,
    bio: row.bio ?? null,
    imageKey: row.imageKey ?? null,
    imageUrl: row.imageUrl ?? null,
    instagram: row.instagram ?? null,
    specialty: row.specialty ?? null,
    yearsExperience: row.yearsExperience ?? null,
    order: row.order ?? null,
  };
}

function readFaqRow(row: FaqRaw): FaqRow {
  return {
    id: row.id,
    question: row.question,
    answer: row.answer,
    questionEn: row.questionEn ?? null,
    answerEn: row.answerEn ?? null,
    order: row.order ?? null,
  };
}

function readPhotoRow(row: PhotoRaw): PhotoRow {
  return {
    id: row.id,
    key: row.key,
    caption: row.caption ?? null,
    order: row.order ?? null,
    width: row.width ?? null,
    height: row.height ?? null,
  };
}

// --------------------------------------------------------------- query plumbing

type ErrorLike = { message?: string };

type Page<T> = {
  data: T[];
  nextToken?: string;
  errors?: ErrorLike[];
};

/** Copies GraphQL errors into a shape that is safe to pass around and log. */
function toErrors(errors: readonly ErrorLike[] | null | undefined) {
  return errors?.length
    ? errors.map((e) => ({ message: e.message }))
    : undefined;
}

function logErrors(label: string, errors: readonly ErrorLike[]) {
  console.error(
    `[public-queries] ${label}:`,
    errors.map((e) => e.message ?? "error desconocido").join(" | ")
  );
}

/**
 * Drains a paginated Amplify list. A `filter` is applied *after* DynamoDB's
 * page limit, so a single page can come back empty while more rows remain —
 * following `nextToken` is the only correct way to read a filtered list.
 */
async function collect<T>(
  label: string,
  page: (nextToken?: string) => Promise<Page<T>>
): Promise<T[]> {
  const rows: T[] = [];
  let nextToken: string | undefined;

  try {
    // Bounded so a pathological dataset can never hang a page render.
    for (let i = 0; i < 10; i += 1) {
      const result = await page(nextToken);
      if (result.errors?.length) logErrors(label, result.errors);
      rows.push(...result.data);
      nextToken = result.nextToken;
      if (!nextToken) break;
    }
  } catch (error) {
    console.error(`[public-queries] ${label} falló:`, error);
  }

  return rows;
}

/** Turns one guest list call into a `Page` of DTOs. */
function guestPage<Raw, Row>(
  model: ModelName,
  read: (row: Raw) => Row,
  options: Record<string, unknown>
): Promise<Page<Row>> {
  return listAsGuest<Raw>(model, options).then((result) => ({
    data: (result.data ?? []).map(read),
    nextToken: result.nextToken ?? undefined,
    errors: toErrors(result.errors),
  }));
}

const PAGE_SIZE = 200;

// -------------------------------------------------------------------- mappers

function toEventView(row: EventRow, today = todayIso()): EventView {
  const spots = row.spots;
  const spotsTaken = Math.max(0, row.spotsTaken ?? 0);
  const spotsLeft = spots === null ? null : Math.max(0, spots - spotsTaken);

  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    date: row.date,
    dateLabel: formatEventDate(row.date),
    dateLongLabel: formatEventDateLong(row.date),
    time: row.time,
    location: row.location,
    category: row.category,
    spots,
    spotsTaken,
    spotsLeft,
    isFull: spotsLeft === 0,
    isPast: row.date < today,
    featured: row.featured === true,
    imageSrc: mediaUrl(row.imageKey ?? row.imageUrl),
    priceMxn: row.priceMxn,
    priceLabel:
      typeof row.priceMxn === "number" && row.priceMxn > 0
        ? `${formatPrice(row.priceMxn)} MXN`
        : null,
    href: `/eventos/${row.id}`,
  };
}

function byOrder(a: { order: number | null }, b: { order: number | null }) {
  return (
    (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER)
  );
}

/** Upcoming events first (soonest first), then past events (most recent first). */
function sortEvents(events: EventView[]): EventView[] {
  return [...events].sort((a, b) => {
    if (a.isPast !== b.isPast) return a.isPast ? 1 : -1;
    return a.isPast
      ? b.date.localeCompare(a.date)
      : a.date.localeCompare(b.date);
  });
}

function instagramOf(raw: string | null) {
  const value = (raw ?? "").trim();
  if (!value) {
    return {
      instagramHandle: `@${GYM_INSTAGRAM}`,
      instagramUrl: `https://www.instagram.com/${GYM_INSTAGRAM}/`,
    };
  }
  if (/^https?:\/\//i.test(value)) {
    const handle = value.replace(/\/+$/, "").split("/").pop() || GYM_INSTAGRAM;
    return { instagramHandle: `@${handle}`, instagramUrl: value };
  }
  const handle = value.replace(/^@/, "");
  return {
    instagramHandle: `@${handle}`,
    instagramUrl: `https://www.instagram.com/${handle}/`,
  };
}

// --------------------------------------------------------------------- events

export const getPublishedEvents = cache(async (): Promise<EventView[]> => {
  const rows = await collect<EventRow>("getPublishedEvents", (nextToken) =>
    guestPage<EventRaw, EventRow>("Event", readEventRow, {
      filter: { published: { eq: true } },
      limit: PAGE_SIZE,
      nextToken,
    })
  );

  const today = todayIso();
  return sortEvents(rows.map((row) => toEventView(row, today)));
});

/**
 * The event for the home-page banner: the one flagged `featured` if it is still
 * ahead of us, otherwise simply the next event on the calendar.
 */
export const getFeaturedEvent = cache(async (): Promise<EventView | null> => {
  const events = await getPublishedEvents();
  const upcoming = events.filter((e) => !e.isPast);
  return (
    upcoming.find((e) => e.featured) ??
    upcoming[0] ??
    events.find((e) => e.featured) ??
    null
  );
});

export const getEvent = cache(async (id: string): Promise<EventView | null> => {
  if (!id) return null;
  try {
    const { data, errors } = await getAsGuest<EventRaw>("Event", { id });
    if (errors?.length) logErrors(`getEvent(${id})`, errors);
    if (!data) return null;

    const row = readEventRow(data);
    // An unpublished event is invisible on the public site, exactly as it is
    // absent from the published list.
    if (row.published !== true) return null;
    return toEventView(row);
  } catch (error) {
    console.error(`[public-queries] getEvent(${id}) falló:`, error);
    return null;
  }
});

// ---------------------------------------------------------------------- plans

export const getActivePlans = cache(async (): Promise<PlanView[]> => {
  const rows = await collect<PlanRow>("getActivePlans", (nextToken) =>
    guestPage<PlanRaw, PlanRow>("Plan", readPlanRow, {
      filter: { active: { eq: true } },
      limit: PAGE_SIZE,
      nextToken,
    })
  );

  return rows.sort(byOrder).map((row) => ({
    id: row.id,
    tier: row.tier,
    name: row.name,
    nameEn: row.nameEn,
    features: row.features,
    featuresEn: row.featuresEn,
    priceMxn: row.priceMxn,
    priceLabel: formatPrice(row.priceMxn ?? 0),
    popular: row.popular === true,
    order: row.order,
  }));
});

// -------------------------------------------------------------------- coaches

export const getPublishedCoaches = cache(async (): Promise<CoachView[]> => {
  const rows = await collect<CoachRow>("getPublishedCoaches", (nextToken) =>
    guestPage<CoachRaw, CoachRow>("CoachProfile", readCoachRow, {
      filter: { published: { eq: true } },
      limit: PAGE_SIZE,
      nextToken,
    })
  );

  return rows.sort(byOrder).map((row) => ({
    id: row.id,
    name: row.name,
    discipline: row.discipline,
    certifications: row.certifications,
    bio: row.bio,
    specialty: row.specialty,
    yearsExperience: row.yearsExperience,
    imageSrc: mediaUrl(row.imageKey ?? row.imageUrl),
    ...instagramOf(row.instagram),
  }));
});

// ------------------------------------------------------------------------ faq

export const getPublishedFaqs = cache(async (): Promise<FaqView[]> => {
  const rows = await collect<FaqRow>("getPublishedFaqs", (nextToken) =>
    guestPage<FaqRaw, FaqRow>("Faq", readFaqRow, {
      filter: { published: { eq: true } },
      limit: PAGE_SIZE,
      nextToken,
    })
  );

  return rows.sort(byOrder).map((row) => ({
    id: row.id,
    question: row.question,
    answer: row.answer,
    questionEn: row.questionEn,
    answerEn: row.answerEn,
  }));
});

// --------------------------------------------------------------------- albums

function toAlbumView(
  row: AlbumRow,
  photoCount: number,
  coverFallbackKey: string | null
): AlbumView {
  const slug = row.slug?.trim() || null;
  return {
    id: row.id,
    title: row.title,
    slug,
    description: row.description,
    visibility: row.visibility === "MEMBERS" ? "MEMBERS" : "PUBLIC",
    coverSrc: mediaUrl(row.coverKey ?? coverFallbackKey),
    photoCount,
    eventId: row.eventId,
    href: `/galeria/${encodeURIComponent(slug ?? row.id)}`,
  };
}

/**
 * Fills in each album's photo count, and a cover taken from the first photo
 * when the album has no explicit `coverKey`.
 */
function withPhotoSummaries(rows: AlbumRow[]): Promise<AlbumView[]> {
  return Promise.all(
    rows.map(async (row) => {
      const photos = await getAlbumPhotos(row.id);
      return toAlbumView(row, photos.length, photos[0]?.key ?? null);
    })
  );
}

export const getPublicAlbums = cache(async (): Promise<AlbumView[]> => {
  const rows = await collect<AlbumRow>("getPublicAlbums", (nextToken) =>
    guestPage<AlbumRaw, AlbumRow>("Album", readAlbumRow, {
      filter: { published: { eq: true }, visibility: { eq: "PUBLIC" } },
      limit: PAGE_SIZE,
      nextToken,
    })
  );
  return withPhotoSummaries(rows.sort(byOrder));
});

/**
 * Member-only albums.
 *
 * `asUser` reads them with the viewer's own credentials, which is what we want
 * once somebody is signed in. For a logged-out visitor we still list them as a
 * guest — the schema allows reading album metadata — so the gallery can show a
 * locked teaser instead of pretending the albums do not exist. The photos
 * themselves stay behind the server-side visibility check in the album page.
 */
export const getMemberAlbums = cache(
  async (asUser: boolean): Promise<AlbumView[]> => {
    const page = async (nextToken?: string): Promise<Page<AlbumRow>> => {
      const options = {
        filter: {
          published: { eq: true },
          visibility: { eq: "MEMBERS" as const },
        },
        limit: PAGE_SIZE,
        nextToken,
      };

      if (!asUser) {
        return guestPage<AlbumRaw, AlbumRow>(
          "Album",
          readAlbumRow,
          options
        );
      }

      // `userClient` is the cookie-based client, which is fully typed — no
      // envelope widening needed here.
      const result = await userClient.models.Album.list(options);

      return {
        data: (result.data ?? []).map(readAlbumRow),
        nextToken: result.nextToken ?? undefined,
        errors: toErrors(result.errors),
      };
    };

    const rows = await collect<AlbumRow>("getMemberAlbums", page);

    if (!asUser) {
      // No photo lookups for a locked teaser: the covers live under
      // `members/` and the media gateway would refuse them anyway.
      return rows.sort(byOrder).map((row) => toAlbumView(row, 0, null));
    }
    return withPhotoSummaries(rows.sort(byOrder));
  }
);

/**
 * Looks an album up by slug, falling back to the id so links keep working for
 * rows seeded before `slug` existed. Returns `null` for anything unpublished.
 */
export const getAlbum = cache(
  async (slugOrId: string): Promise<AlbumView | null> => {
    if (!slugOrId) return null;

    const bySlug = await collect<AlbumRow>(
      `getAlbum(${slugOrId})`,
      (nextToken) =>
        guestPage<AlbumRaw, AlbumRow>("Album", readAlbumRow, {
          filter: { slug: { eq: slugOrId } },
          limit: PAGE_SIZE,
          nextToken,
        })
    );

    let row: AlbumRow | undefined = bySlug[0];

    if (!row) {
      try {
        const { data, errors } = await getAsGuest<AlbumRaw>("Album", {
          id: slugOrId,
        });
        if (errors?.length) logErrors(`getAlbum(${slugOrId})`, errors);
        row = data ? readAlbumRow(data) : undefined;
      } catch (error) {
        console.error(`[public-queries] getAlbum(${slugOrId}) falló:`, error);
        return null;
      }
    }

    if (!row || row.published !== true) return null;

    // A member album's photos are not read here — the page decides whether the
    // viewer may see them.
    const photos =
      row.visibility === "MEMBERS" ? [] : await getAlbumPhotos(row.id);
    return toAlbumView(row, photos.length, photos[0]?.key ?? null);
  }
);

/** Published public albums attached to an event, for the event detail page. */
export const getEventAlbums = cache(
  async (eventId: string): Promise<AlbumView[]> => {
    if (!eventId) return [];

    const rows = await collect<AlbumRow>(
      `getEventAlbums(${eventId})`,
      (nextToken) =>
        guestPage<AlbumRaw, AlbumRow>("Album", readAlbumRow, {
          filter: {
            published: { eq: true },
            eventId: { eq: eventId },
            visibility: { eq: "PUBLIC" },
          },
          limit: PAGE_SIZE,
          nextToken,
        })
    );
    return withPhotoSummaries(rows.sort(byOrder));
  }
);

export const getAlbumPhotos = cache(
  async (albumId: string): Promise<PhotoView[]> => {
    if (!albumId) return [];

    const rows = await collect<PhotoRow>(
      `getAlbumPhotos(${albumId})`,
      (nextToken) =>
        guestPage<PhotoRaw, PhotoRow>("Photo", readPhotoRow, {
          filter: { albumId: { eq: albumId } },
          limit: PAGE_SIZE,
          nextToken,
        })
    );

    return rows.sort(byOrder).map((row) => ({
      id: row.id,
      key: row.key,
      src: mediaUrl(row.key),
      caption: row.caption,
      width: row.width,
      height: row.height,
    }));
  }
);

// -------------------------------------------------------------- site settings

/**
 * One editable singleton, e.g. `heroStats`. `null` when unset or malformed.
 *
 * `a.json()` columns come back as a JSON *string*, not an object, so the string
 * case is the normal one rather than a fallback.
 */
export const getSiteSetting = cache(
  async (key: string): Promise<Record<string, unknown> | null> => {
    if (!key) return null;
    try {
      const { data, errors } = await getAsGuest<SiteSettingRaw>("SiteSetting", {
        key,
      });
      if (errors?.length) logErrors(`getSiteSetting(${key})`, errors);

      const raw: unknown = data?.value;
      const parsed: unknown =
        typeof raw === "string" ? JSON.parse(raw) : (raw ?? null);

      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
      return null;
    } catch (error) {
      console.error(`[public-queries] getSiteSetting(${key}) falló:`, error);
      return null;
    }
  }
);

const HERO_FALLBACK: HeroContent = {
  badge: "Hyrox & CrossFit Affiliate",
  athletes: "500+",
  coaches: "15+",
  disciplines: "3",
};

function asLabel(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

/**
 * Hero copy and counters, with the current hardcoded values as the fallback so
 * an empty database never leaves a hole in the first screen visitors see.
 */
export const getHeroContent = cache(async (): Promise<HeroContent> => {
  const [stats, hero] = await Promise.all([
    getSiteSetting("heroStats"),
    getSiteSetting("hero"),
  ]);

  return {
    badge: asLabel(hero?.badge) ?? HERO_FALLBACK.badge,
    athletes: asLabel(stats?.athletes) ?? HERO_FALLBACK.athletes,
    coaches: asLabel(stats?.coaches) ?? HERO_FALLBACK.coaches,
    disciplines: asLabel(stats?.disciplines) ?? HERO_FALLBACK.disciplines,
  };
});
