import "server-only";

/**
 * Short-lived in-process cache for public (guest) reads.
 *
 * Why this exists: a guest read authorizes through the Cognito identity pool,
 * and Amplify's server runner builds a fresh context per request, so the
 * credential exchange (`GetId` + `GetCredentialsForIdentity`) is repeated on
 * every single page render with no reuse. Under even modest traffic Cognito
 * starts answering `TooManyRequestsException`, which Amplify surfaces as
 * "No current user" — public pages lose their data and, worse, signed-in
 * requests sharing the throttle get bounced to the login page.
 *
 * Caching the *results* collapses many renders into one credential exchange
 * per key per window. The trade-off is staleness: an admin publishing an event
 * may wait up to `TTL_MS` before it appears on the public site. That window is
 * deliberately small.
 *
 * This is per-instance (each Lambda/container keeps its own), which is fine —
 * it is a load shedder, not a source of truth.
 */

type Entry = { value: unknown; expires: number };

const entries = new Map<string, Entry>();
const inflight = new Map<string, Promise<unknown>>();

/** Keep the map bounded; public read shapes are few, but filters vary. */
const MAX_ENTRIES = 200;

export const TTL_MS = Number(process.env.PUBLIC_CACHE_TTL_MS ?? 20_000);

/** Drops the cache. Useful after a write that must be visible immediately. */
export function invalidatePublicCache(prefix?: string) {
  if (!prefix) {
    entries.clear();
    return;
  }
  for (const key of entries.keys()) {
    if (key.startsWith(prefix)) entries.delete(key);
  }
}

/**
 * Returns a cached value, or runs `load` and caches what it returns.
 *
 * `shouldCache` lets the caller refuse to cache a failed read — an Amplify
 * result carrying `errors` resolves successfully, and caching that would pin a
 * transient failure in place for the whole window.
 */
export async function cachedPublicRead<T>(
  key: string,
  load: () => Promise<T>,
  shouldCache: (value: T) => boolean = () => true
): Promise<T> {
  if (TTL_MS <= 0) return load();

  const now = Date.now();
  const hit = entries.get(key);
  if (hit && hit.expires > now) return hit.value as T;

  // Single-flight: concurrent renders of the same page share one request
  // instead of each starting its own credential exchange.
  const existing = inflight.get(key) as Promise<T> | undefined;
  if (existing) return existing;

  const promise = load()
    .then((value) => {
      if (shouldCache(value)) {
        if (entries.size >= MAX_ENTRIES) {
          // Cheap eviction: drop the oldest insertion.
          const oldest = entries.keys().next();
          if (!oldest.done) entries.delete(oldest.value);
        }
        entries.set(key, { value, expires: Date.now() + TTL_MS });
      }
      return value;
    })
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, promise);
  return promise;
}
