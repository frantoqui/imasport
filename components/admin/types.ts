/**
 * Shared vocabulary for the admin panel.
 *
 * The enum literals here mirror `amplify/data/resource.ts` exactly — AppSync
 * rejects anything else — and every select in the panel is built from these
 * arrays so a schema change surfaces as a type error rather than a 400.
 *
 * This file deliberately lives outside `lib/admin-actions.ts`: a `"use server"`
 * module may only export async functions, so the constants and input types the
 * actions share with the forms have to live somewhere else.
 */

export const DISCIPLINES = ["CrossFit", "Hyrox", "Calistenia"] as const;
export type Discipline = (typeof DISCIPLINES)[number];

export const ROLES = ["ATHLETE", "COACH", "ADMIN"] as const;
export type ProfileRole = (typeof ROLES)[number];

export const APPROVAL_STATUSES = [
  "NONE",
  "PENDING",
  "APPROVED",
  "REJECTED",
] as const;
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];

export const PLAN_TIERS = ["basic", "pro", "elite"] as const;
export type PlanTier = (typeof PLAN_TIERS)[number];

export const PAYMENT_STATUSES = [
  "PENDING",
  "ACTIVE",
  "PAST_DUE",
  "CANCELLED",
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const ALBUM_VISIBILITIES = ["PUBLIC", "MEMBERS"] as const;
export type AlbumVisibility = (typeof ALBUM_VISIBILITIES)[number];

export const REGISTRATION_STATUSES = [
  "REGISTERED",
  "WAITLIST",
  "CANCELLED",
  "ATTENDED",
] as const;
export type RegistrationStatus = (typeof REGISTRATION_STATUSES)[number];

/** Cognito groups, as accepted by the `setUserRole` mutation. */
export const COGNITO_GROUPS = ["ADMINS", "COACHES", "ATHLETES"] as const;
export type CognitoGroup = (typeof COGNITO_GROUPS)[number];

/** Spanish labels for the enums, so the UI never shows a raw literal. */
export const REGISTRATION_STATUS_LABELS: Record<RegistrationStatus, string> = {
  REGISTERED: "Inscrito",
  WAITLIST: "Lista de espera",
  CANCELLED: "Cancelado",
  ATTENDED: "Asistió",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: "Pendiente",
  ACTIVE: "Activo",
  PAST_DUE: "Vencido",
  CANCELLED: "Cancelado",
};

export const GROUP_LABELS: Record<CognitoGroup, string> = {
  ADMINS: "Administrador",
  COACHES: "Coach",
  ATHLETES: "Atleta",
};

export const VISIBILITY_LABELS: Record<AlbumVisibility, string> = {
  PUBLIC: "Pública",
  MEMBERS: "Solo miembros",
};

export const APPROVAL_LABELS: Record<ApprovalStatus, string> = {
  NONE: "Sin solicitud",
  PENDING: "Pendiente",
  APPROVED: "Aprobada",
  REJECTED: "Rechazada",
};

/** The Cognito group that corresponds to a denormalized `UserProfile.role`. */
export const GROUP_FOR_ROLE: Record<ProfileRole, CognitoGroup> = {
  ADMIN: "ADMINS",
  COACH: "COACHES",
  ATHLETE: "ATHLETES",
};

export const ROLE_FOR_GROUP: Record<CognitoGroup, ProfileRole> = {
  ADMINS: "ADMIN",
  COACHES: "COACH",
  ATHLETES: "ATHLETE",
};

// ---------------------------------------------------------------------------
// Server Action results
// ---------------------------------------------------------------------------

/**
 * Every admin Server Action returns this instead of throwing, so a failed
 * AppSync call can be rendered next to the control that caused it rather than
 * blowing up the whole route.
 */
export type ActionResult<T = null> =
  | { ok: true; data: T; message?: string }
  | { ok: false; error: string };

// ---------------------------------------------------------------------------
// Action inputs
// ---------------------------------------------------------------------------

export type EventInput = {
  title: string;
  slug: string | null;
  description: string | null;
  /** ISO date, `YYYY-MM-DD` (AWSDate). */
  date: string;
  time: string | null;
  location: string | null;
  category: Discipline | null;
  spots: number | null;
  priceMxn: number | null;
  imageKey: string | null;
  imageUrl: string | null;
  featured: boolean;
  published: boolean;
};

export type AlbumInput = {
  title: string;
  slug: string | null;
  description: string | null;
  coverKey: string | null;
  visibility: AlbumVisibility;
  published: boolean;
  order: number | null;
  eventId: string | null;
};

export type PhotoInput = {
  key: string;
  caption: string | null;
  order: number | null;
};

export type PlanInput = {
  tier: PlanTier;
  name: string;
  nameEn: string | null;
  priceMxn: number;
  features: string[];
  featuresEn: string[];
  popular: boolean;
  order: number | null;
  active: boolean;
};

export type CoachInput = {
  userId: string | null;
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
  published: boolean;
};

export type FaqInput = {
  question: string;
  answer: string;
  questionEn: string | null;
  answerEn: string | null;
  order: number | null;
  published: boolean;
};

// ---------------------------------------------------------------------------
// Cognito
// ---------------------------------------------------------------------------

/** One entry of the `listCognitoUsers` JSON payload. */
export type CognitoUser = {
  userId: string;
  email: string;
  emailVerified: boolean;
  name: string;
  phone: string;
  enabled: boolean;
  status: string;
  createdAt: string | null;
  groups: string[];
};

// ---------------------------------------------------------------------------
// SiteSetting shapes
// ---------------------------------------------------------------------------

/**
 * `SiteSetting.value` is `a.json()`, so these are a convention rather than
 * something the backend enforces. The editor writes exactly these shapes.
 */
export const SETTING_KEYS = {
  contact: "contact",
  heroStats: "heroStats",
  hero: "hero",
} as const;

export type ContactSetting = {
  phone: string;
  email: string;
  address: string;
  instagram: string;
  facebook: string;
};

export type HeroStatsSetting = {
  athletes: string;
  coaches: string;
  disciplines: string;
};

export type HeroSetting = {
  badge: string;
};

export const EMPTY_CONTACT: ContactSetting = {
  phone: "",
  email: "",
  address: "",
  instagram: "",
  facebook: "",
};

export const EMPTY_HERO_STATS: HeroStatsSetting = {
  athletes: "",
  coaches: "",
  disciplines: "",
};

export const EMPTY_HERO: HeroSetting = {
  badge: "",
};

/**
 * `a.json()` round-trips as a JSON string through AppSync in some code paths
 * and as an already-parsed value in others, so everything that reads one of
 * these fields goes through here.
 */
export function parseJsonValue<T>(value: unknown): T | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }
  return value as T;
}

/** Narrows an unknown string to one of a literal tuple, or `null`. */
export function asEnum<T extends string>(
  options: readonly T[],
  value: unknown
): T | null {
  return typeof value === "string" && (options as readonly string[]).includes(value)
    ? (value as T)
    : null;
}

/** `"  "` and `""` both mean "not set" for an optional AppSync string. */
export function nullIfBlank(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

/** Parses a number out of an `<input type="number">`, treating "" as unset. */
export function numberOrNull(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

/** URL-safe slug from a title, used as the default when the field is empty. */
export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
