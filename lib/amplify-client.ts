"use client";

import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import outputs from "@/amplify_outputs.json";
import type { Schema } from "@/amplify/data/resource";

/**
 * `ssr: true` makes amplify-js keep tokens in cookies instead of
 * localStorage, which is what lets the server read the session in
 * `lib/dal.ts`. Without it, a client sign-in would be invisible to every
 * server component and the whole app would look signed out.
 */
Amplify.configure(outputs, { ssr: true });

/** Data client for client components, acting as the signed-in user. */
export const client = generateClient<Schema>({ authMode: "userPool" });

/**
 * Data client for public content read by a **logged-out** visitor only.
 *
 * Do not use this once a user is signed in. Signing in puts the user into a
 * Cognito group, and the identity pool then issues that group's role
 * (ATHLETES/COACHES/ADMINS) instead of the default authenticated role. Amplify
 * only attaches AppSync IAM permissions to the default roles, so an
 * identity-pool read by a signed-in user comes back `Unauthorized`.
 *
 * Use `publicAuthMode()` instead of picking a client by hand.
 */
export const guestClient = generateClient<Schema>({
  authMode: "identityPool",
});

/**
 * The auth mode to read public content with, given whether anyone is signed in.
 *
 * Public models grant read to both `guest` and `authenticated` (user pool), so
 * this picks whichever one the visitor can actually present. Pass it per call:
 *
 *   const { viewer } = useAuth();
 *   await client.models.Plan.list({ authMode: publicAuthMode(!!viewer) });
 */
export function publicAuthMode(isSignedIn: boolean): "userPool" | "identityPool" {
  return isSignedIn ? "userPool" : "identityPool";
}
