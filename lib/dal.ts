import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { fetchAuthSession } from "aws-amplify/auth/server";
import { runWithAmplifyServerContext, userClient } from "./amplify-server";
import { withAuthRetry } from "./retry";
import { roleFromGroups, isAtLeast, type AppRole } from "./roles";
import type { Schema } from "@/amplify/data/resource";

export type Session = {
  userId: string;
  email: string;
  role: AppRole;
  groups: string[];
};

export type Profile = Schema["UserProfile"]["type"];

/**
 * Reads and validates the viewer's session from the request cookies.
 *
 * Wrapped in React `cache` so the many components that need the viewer in a
 * single render share one token verification rather than repeating it.
 *
 * Returns `null` when nobody is signed in — callers that require a user should
 * use `requireSession` / `requireRole` instead.
 */
export const getSession = cache(async (): Promise<Session | null> => {
  try {
    return await withAuthRetry(() =>
      runWithAmplifyServerContext({
        nextServerContext: { cookies },
        operation: async (contextSpec) => {
          const session = await fetchAuthSession(contextSpec);
          const idToken = session.tokens?.idToken;

          // Being signed out is NOT an error: fetchAuthSession resolves with
          // no tokens. A *thrown* error is therefore exceptional (usually a
          // lost race for lazily-resolved credentials), which is why
          // withAuthRetry wraps this instead of us reading it as "logged out"
          // and bouncing a signed-in user to the login page.
          if (!idToken) return null;

          const payload = idToken.payload;
          const userId = typeof payload.sub === "string" ? payload.sub : null;
          if (!userId) return null;

          const rawGroups = payload["cognito:groups"];
          const groups = Array.isArray(rawGroups)
            ? rawGroups.filter((g): g is string => typeof g === "string")
            : [];

          return {
            userId,
            email: typeof payload.email === "string" ? payload.email : "",
            role: roleFromGroups(groups),
            groups,
          };
        },
      })
    );
  } catch {
    // Retries are exhausted, or the token is expired/malformed. Treat the
    // viewer as anonymous rather than crashing the page.
    return null;
  }
});

export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

/**
 * Gate a page or server action on a minimum role. Sends signed-out visitors to
 * login and under-privileged users to their own home rather than showing them
 * an error they can do nothing about.
 */
export async function requireRole(required: AppRole): Promise<Session> {
  const session = await requireSession();
  if (!isAtLeast(session.role, required)) redirect("/dashboard");
  return session;
}

/** The viewer's own profile row, or `null` if it has not been created yet. */
export const getMyProfile = cache(async (): Promise<Profile | null> => {
  const session = await getSession();
  if (!session) return null;

  try {
    const { data } = await withAuthRetry(() =>
      userClient.models.UserProfile.get({ userId: session.userId })
    );
    return data ?? null;
  } catch {
    return null;
  }
});
