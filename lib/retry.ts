import "server-only";

/**
 * Amplify's cookie-backed server client resolves credentials lazily. When
 * several server reads run concurrently in one request, the losers of that race
 * can throw "No current user" / "No federated jwt" even though the viewer is
 * perfectly signed in.
 *
 * This matters most for session checks: a transient throw that is mistaken for
 * "logged out" bounces a signed-in user to the login page.
 */
const TRANSIENT =
  /no current user|no federated jwt|credential|token|identity pool|network error|fetch failed/i;

/**
 * Cognito throttling. It arrives wrapped: Amplify reports "No current user"
 * with a `TooManyRequestsException` underneath, so the message alone can be
 * misleading and we check the nested cause too.
 */
const THROTTLED = /too ?many ?requests|rate exceeded|throttl/i;

function describe(error: unknown): string {
  if (!(error instanceof Error)) return String(error ?? "");
  const nested = (error as { underlyingError?: unknown }).underlyingError;
  const nestedText =
    nested instanceof Error ? `${nested.name} ${nested.message}` : "";
  return `${error.name} ${error.message} ${nestedText}`;
}

export function isThrottleError(error: unknown): boolean {
  return THROTTLED.test(describe(error));
}

export function isTransientAuthError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const text = describe(error);
  return TRANSIENT.test(text) || THROTTLED.test(text);
}

/**
 * Retries `operation` while it fails with a transient credential error.
 *
 * Genuine failures — an authorization denial, a malformed query — are returned
 * or thrown unchanged on the first attempt, so this never masks a real error.
 */
export async function withAuthRetry<T>(
  operation: () => Promise<T>,
  attempts = 3
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (!isTransientAuthError(error)) throw error;
      lastError = error;

      if (attempt < attempts - 1) {
        // A lost credential race clears in milliseconds, but Cognito
        // throttling needs real backoff — retrying immediately just spends
        // another unit of the quota we already exhausted. Jitter keeps
        // concurrent renders from retrying in lockstep.
        const base = isThrottleError(error) ? 250 : 25;
        const delay =
          base * 2 ** attempt + Math.floor(Math.random() * base * 0.5);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}
