/**
 * Plain, serializable view models for the public marketing site.
 *
 * The Amplify client hands back rows carrying lazy relationship loaders
 * (`event.albums()`), which cannot cross the server/client boundary, and its
 * dates and prices are raw. `lib/public-queries.ts` maps every row into one of
 * the shapes below, with display strings already formatted, so the boundary
 * only ever sees JSON.
 *
 * These types live here rather than in `lib/public-queries.ts` because client
 * components import them and that module is `server-only` — the same split as
 * `components/member/types.ts`.
 */

export type Discipline = "CrossFit" | "Hyrox" | "Calistenia";
export type AlbumVisibility = "PUBLIC" | "MEMBERS";

export type EventView = {
  id: string;
  title: string;
  slug: string | null;
  description: string | null;
  /** Raw "YYYY-MM-DD", kept for sorting and `<time dateTime>`. */
  date: string;
  dateLabel: string;
  dateLongLabel: string;
  time: string | null;
  location: string | null;
  category: Discipline | null;
  spots: number | null;
  spotsTaken: number;
  /** `null` when the event does not cap attendance. */
  spotsLeft: number | null;
  isFull: boolean;
  isPast: boolean;
  featured: boolean;
  imageSrc: string | null;
  priceMxn: number | null;
  priceLabel: string | null;
  href: string;
};

export type PlanView = {
  id: string;
  tier: "basic" | "pro" | "elite" | null;
  name: string;
  nameEn: string | null;
  features: string[];
  featuresEn: string[];
  priceMxn: number;
  /** Already grouped, e.g. "$1,299". The card appends "MXN/mes". */
  priceLabel: string;
  popular: boolean;
  order: number | null;
};

export type CoachView = {
  id: string;
  name: string;
  discipline: Discipline | null;
  certifications: string | null;
  bio: string | null;
  specialty: string | null;
  yearsExperience: number | null;
  imageSrc: string | null;
  instagramHandle: string;
  instagramUrl: string;
};

export type FaqView = {
  id: string;
  question: string;
  answer: string;
  questionEn: string | null;
  answerEn: string | null;
};

export type AlbumView = {
  id: string;
  title: string;
  slug: string | null;
  description: string | null;
  visibility: AlbumVisibility;
  coverSrc: string | null;
  photoCount: number;
  eventId: string | null;
  /** Uses the slug when present, the id otherwise (older rows have no slug). */
  href: string;
};

export type PhotoView = {
  id: string;
  key: string;
  src: string | null;
  caption: string | null;
  width: number | null;
  height: number | null;
};

export type HeroContent = {
  badge: string;
  athletes: string;
  coaches: string;
  disciplines: string;
};
