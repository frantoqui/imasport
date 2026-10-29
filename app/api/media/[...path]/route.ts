import { cookies } from "next/headers";
import { getUrl } from "aws-amplify/storage/server";
import { runWithAmplifyServerContext, userClient } from "@/lib/amplify-server";
import { getSession } from "@/lib/dal";
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

async function authorize(key: string): Promise<"guest" | "user" | "deny"> {
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

    const { data } = await userClient.models.AthletePhoto.list({
      filter: { key: { eq: key }, athleteId: { eq: session.userId } },
      limit: 1,
    });
    return data.length > 0 ? "user" : "deny";
  }

  return "deny";
}

export async function GET(
  _request: Request,
  context: RouteContext<"/api/media/[...path]">
) {
  const { path } = await context.params;
  const key = path.map(decodeURIComponent).join("/");

  const decision = await authorize(key);
  if (decision === "deny") {
    return new Response("No autorizado", { status: 403 });
  }

  try {
    const { url } = await runWithAmplifyServerContext({
      // A guest read uses no cookies so it can be served from cache; an
      // authenticated read must presign with the viewer's own credentials.
      nextServerContext: decision === "guest" ? null : { cookies },
      operation: (contextSpec) =>
        getUrl(contextSpec, {
          path: key,
          options: {
            expiresIn: PRESIGN_SECONDS,
            validateObjectExistence: false,
          },
        }),
    });

    const maxAge =
      decision === "guest"
        ? BROWSER_CACHE_SECONDS.public
        : BROWSER_CACHE_SECONDS.private;

    return new Response(null, {
      status: 307,
      headers: {
        Location: url.toString(),
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
