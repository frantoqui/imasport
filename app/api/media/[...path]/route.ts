import { cookies } from "next/headers";
import { getUrl } from "aws-amplify/storage/server";
import { runWithAmplifyServerContext, userClient } from "@/lib/amplify-server";
import { getSession } from "@/lib/dal";
import { withAuthRetry } from "@/lib/retry";
import { cachedPublicRead } from "@/lib/public-cache";
import { MEDIA_PREFIXES } from "@/lib/media";

/**
 * Authorizing media gateway. See `lib/media.ts` for why reads go through here
 * rather than straight to S3.
 */

/** How long the browser may reuse our redirect, kept under the presign life. */
const BROWSER_CACHE_SECONDS = {
  public: 60 * 30,
  private: 60,
} as const;

const PRESIGN_SECONDS = 60 * 60;

type Decision = "guest" | "user" | "deny" | "unavailable";

async function authorize(key: string): Promise<Decision> {
  if (key.startsWith(MEDIA_PREFIXES.public)) return "guest";

  const session = await getSession();
  if (!session) return "deny";

  if (
    key.startsWith(MEDIA_PREFIXES.members) ||
    key.startsWith(MEDIA_PREFIXES.avatars)
  ) {
    return "user";
  }

  if (key.startsWith(MEDIA_PREFIXES.athletePhotos)) {
    // Coaches and admins may see any athlete's progress photos; an athlete may
    // only see photos that are recorded against them.
    if (session.role === "admin" || session.role === "coach") return "user";

    try {
      /**
       * Queried through the `athleteId` secondary index, not a filtered
       * `list`.
       *
       * AppSync applies a `filter` *after* DynamoDB's page limit, so the
       * obvious `list({ filter: { key, athleteId }, limit: 1 })` reads one
       * arbitrary row, filters it away, and reports "not found" — which denied
       * athletes their own photos. The index query reads only this athlete's
       * partition, so matching on the key is reliable; pagination covers an
       * athlete with more photos than fit in one page.
       *
       * A thrown error becomes "unavailable" rather than "deny": a transient
       * credential failure must not tell the athlete the photo isn't theirs.
       */
      let token: string | null = null;
      let pages = 0;
      do {
        const { data, nextToken } = await withAuthRetry(() =>
          userClient.models.AthletePhoto.listAthletePhotoByAthleteId(
            { athleteId: session.userId },
            { limit: 200, nextToken: token }
          )
        );
        if (data.some((photo) => photo.key === key)) return "user";
        token = nextToken ?? null;
        pages += 1;
      } while (token && pages < 20);

      return "deny";
    } catch {
      return "unavailable";
    }
  }

  return "deny";
}

export async function GET(
  _request: Request,
  context: RouteContext<"/api/media/[...path]">
) {
  const { path } = await context.params;
  const key = path.map(decodeURIComponent).join("/");

  let decision: Decision;
  try {
    decision = await authorize(key);
  } catch {
    // Nothing in the authorization path is allowed to 500 this route.
    decision = "unavailable";
  }

  if (decision === "deny") {
    return new Response("No autorizado", { status: 403 });
  }
  if (decision === "unavailable") {
    return new Response("Imagen temporalmente no disponible", {
      status: 503,
      headers: { "Cache-Control": "no-store", "Retry-After": "2" },
    });
  }

  try {
    /**
     * Public URLs are cached briefly.
     *
     * Presigning runs an identity-pool credential exchange, and this route is
     * hit once per image — a 20-photo album meant 20 round trips per page
     * view, which is what pushed Cognito into throttling under load. The
     * signed URL stays valid for an hour, so reusing it for a few minutes is
     * safe. Authenticated reads are deliberately not cached: they are signed
     * with the viewer's own credentials and must not be shared between users.
     */
    const presign = () =>
      withAuthRetry(() =>
        runWithAmplifyServerContext({
          // A guest read uses no cookies so it can be shared; an
          // authenticated read must be signed with the viewer's own
          // credentials.
          nextServerContext: decision === "guest" ? null : { cookies },
          operation: (contextSpec) =>
            getUrl(contextSpec, {
              path: key,
              options: {
                expiresIn: PRESIGN_SECONDS,
                validateObjectExistence: false,
              },
            }),
        })
      ).then((result) => result.url.toString());

    const url =
      decision === "guest"
        ? await cachedPublicRead(`media:${key}`, presign)
        : await presign();

    const maxAge =
      decision === "guest"
        ? BROWSER_CACHE_SECONDS.public
        : BROWSER_CACHE_SECONDS.private;

    return new Response(null, {
      status: 307,
      headers: {
        Location: url,
        "Cache-Control":
          decision === "guest"
            ? `public, max-age=${maxAge}`
            : `private, max-age=${maxAge}`,
      },
    });
  } catch {
    return new Response("Imagen no encontrada", { status: 404 });
  }
}
