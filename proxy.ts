import { NextResponse, type NextRequest } from "next/server";
import { fetchAuthSession } from "aws-amplify/auth/server";
import { runWithAmplifyServerContext } from "@/lib/amplify-server";
import { withAuthRetry } from "@/lib/retry";
import { roleFromGroups, homeForRole, isAtLeast, type AppRole } from "@/lib/roles";

/**
 * Route gating.
 *
 * This is the optimistic pass the Next.js docs recommend: it keeps users out of
 * areas they have no business loading and sends signed-in users away from the
 * auth pages. It is deliberately *not* the only check — every protected page
 * and server action calls `requireRole` from `lib/dal.ts`, which is what
 * actually guards the data.
 */
const RULES: Array<{ prefix: string; required: AppRole }> = [
  { prefix: "/admin", required: "admin" },
  { prefix: "/coach", required: "coach" },
  { prefix: "/dashboard", required: "athlete" },
  { prefix: "/profile", required: "athlete" },
  { prefix: "/mis-fotos", required: "athlete" },
];

/** Pages a signed-in user should be bounced off of. */
const AUTH_PAGES = ["/login", "/register", "/register-coach"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const rule = RULES.find(
    (r) => pathname === r.prefix || pathname.startsWith(`${r.prefix}/`)
  );
  const isAuthPage = AUTH_PAGES.includes(pathname);

  if (!rule && !isAuthPage) return NextResponse.next();

  const response = NextResponse.next();

  /**
   * Retried for the same reason as `getSession` in lib/dal.ts: Amplify
   * resolves credentials lazily, and a transient throw read as "logged out"
   * would redirect a signed-in user to the login page mid-navigation.
   */
  let session: { role: AppRole } | null = null;
  try {
    session = await withAuthRetry(() =>
      runWithAmplifyServerContext({
        nextServerContext: { request, response },
        operation: async (contextSpec) => {
          const { tokens } = await fetchAuthSession(contextSpec);
          if (!tokens?.idToken) return null;
          const groups = tokens.idToken.payload["cognito:groups"];
          return {
            role: roleFromGroups(
              Array.isArray(groups)
                ? groups.filter((g): g is string => typeof g === "string")
                : []
            ),
          };
        },
      })
    );
  } catch {
    session = null;
  }

  /**
   * Amplify may have refreshed the session and written new token cookies onto
   * `response` while we were reading it. A fresh redirect response would drop
   * them and make the user look signed out, so carry them across.
   */
  function redirectTo(url: URL) {
    const redirect = NextResponse.redirect(url);
    for (const cookie of response.cookies.getAll()) {
      redirect.cookies.set(cookie);
    }
    return redirect;
  }

  if (isAuthPage) {
    return session
      ? redirectTo(new URL(homeForRole(session.role), request.nextUrl))
      : response;
  }

  if (!session) {
    const login = new URL("/login", request.nextUrl);
    // Preserve where they were headed so login can send them back.
    login.searchParams.set("next", pathname);
    return redirectTo(login);
  }

  if (rule && !isAtLeast(session.role, rule.required)) {
    return redirectTo(new URL(homeForRole(session.role), request.nextUrl));
  }

  return response;
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/coach/:path*",
    "/dashboard/:path*",
    "/profile/:path*",
    "/mis-fotos/:path*",
    "/login",
    "/register",
    "/register-coach",
  ],
};
