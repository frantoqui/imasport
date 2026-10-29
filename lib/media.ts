/**
 * Media URLs.
 *
 * The S3 bucket is private, so nothing links to it directly. Every image is
 * requested through `/api/media/<key>`, a gateway that authorizes the viewer
 * and then redirects to a short-lived presigned URL. That keeps the URLs in
 * our HTML stable and cacheable (presigned URLs are neither) and gives private
 * photos a real ownership check instead of relying on an unguessable key.
 */

export const MEDIA_PREFIXES = {
  /** Marketing media: gallery, event covers, coach cards. Readable by anyone. */
  public: "public/",
  /** Member-only albums. Any signed-in user. */
  members: "members/",
  /** Profile pictures. Any signed-in user may view; only the owner writes. */
  avatars: "avatars/",
  /** Progress photos from a coaching session. Owner, their coach, or an admin. */
  athletePhotos: "athlete-photos/",
} as const;

/** Turns a stored S3 key into a URL the browser can load. */
export function mediaUrl(key: string | null | undefined): string | null {
  if (!key) return null;
  // Already an absolute URL (seeded Unsplash images, external avatars).
  if (/^https?:\/\//i.test(key)) return key;
  const encoded = key.split("/").map(encodeURIComponent).join("/");
  return `/api/media/${encoded}`;
}

export function isPublicKey(key: string): boolean {
  return key.startsWith(MEDIA_PREFIXES.public);
}

/**
 * Builds the key for a newly uploaded object. A random suffix keeps uploads
 * with the same filename from overwriting each other.
 */
export function buildMediaKey(
  prefix: string,
  filename: string,
  random: string = crypto.randomUUID()
): string {
  const safe = filename
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(-60);
  return `${prefix}${random}-${safe || "archivo"}`;
}
