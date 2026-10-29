import "server-only";

import { createServerRunner } from "@aws-amplify/adapter-nextjs";
import {
  generateServerClientUsingCookies,
  generateServerClientUsingReqRes,
} from "@aws-amplify/adapter-nextjs/data";
import { cookies } from "next/headers";
import type { ContextSpec } from "aws-amplify/adapter-core";
import outputs from "@/amplify_outputs.json";
import { cachedPublicRead } from "./public-cache";
import type { Schema } from "@/amplify/data/resource";

export const { runWithAmplifyServerContext } = createServerRunner({
  config: outputs,
});

/**
 * Data client that acts as the signed-in user, reading their Cognito tokens
 * from the request cookies. Every AppSync authorization rule therefore applies
 * exactly as it would on the client — a server component cannot accidentally
 * read data the viewer isn't entitled to.
 *
 * Using this makes the route dynamic, because it reads cookies. It is fully
 * typed; use it directly (`userClient.models.Workout.list({...})`).
 */
export const userClient = generateServerClientUsingCookies<Schema>({
  config: outputs,
  cookies,
  authMode: "userPool",
});

// --------------------------------------------------------------------------
// Guest (public) reads
// --------------------------------------------------------------------------

/** Row envelope returned by the guest helpers. */
export type ListAs<T> = {
  data: T[];
  errors?: { message: string }[];
  nextToken?: string | null;
};

/** Single-row envelope returned by the guest helpers. */
export type GetAs<T> = {
  data: T | null;
  errors?: { message: string }[];
};

/** Names of the models in the schema. */
export type ModelName = Extract<keyof Schema, string>;

/**
 * Minimal view of a model's query methods, deliberately returning `unknown`.
 *
 * Amplify's request/response SSR client types `list()` and `get()` with a
 * return type so deeply conditional that TypeScript cannot even compare it to
 * itself — merely touching `client.models` raises TS2321 ("Excessive stack
 * depth"). The cast below erases that type once, here, instead of every call
 * site hitting the same wall. Callers supply the row type explicitly via
 * `Schema["Model"]["type"]`, so field access stays fully checked; only the
 * envelope is loosened.
 */
type ShallowModel = {
  list: (
    contextSpec: ContextSpec,
    options?: Record<string, unknown>
  ) => Promise<unknown>;
  get: (
    contextSpec: ContextSpec,
    identifier: Record<string, unknown>
  ) => Promise<unknown>;
};

/**
 * Client for public marketing content, authorized as an unauthenticated
 * identity-pool guest. It takes no cookies, so pages that only use this can
 * still be prerendered and cached.
 *
 * Note this is for logged-OUT reads. A signed-in user must read public content
 * with their user-pool token instead — see `publicAuthMode` in
 * lib/amplify-client.ts for why. On the server that distinction rarely
 * matters, because these helpers run with no request context at all.
 */
const guestModels = (
  generateServerClientUsingReqRes<Schema>({
    config: outputs,
    authMode: "identityPool",
  }) as unknown as { models: Record<ModelName, ShallowModel> }
).models;

/**
 * Lists a public model as a guest.
 *
 * @example
 * const { data, errors } = await listAsGuest<Schema["Event"]["type"]>("Event", {
 *   filter: { published: { eq: true } },
 *   limit: 100,
 * });
 */
export function listAsGuest<T>(
  model: ModelName,
  options?: Record<string, unknown>
): Promise<ListAs<T>> {
  return cachedPublicRead(
    `list:${model}:${JSON.stringify(options ?? {})}`,
    () =>
      runWithAmplifyServerContext({
        nextServerContext: null,
        operation: async (contextSpec) =>
          (await guestModels[model].list(contextSpec, options)) as ListAs<T>,
      }),
    // Never cache a failed read; see lib/public-cache.ts.
    (result) => !result.errors?.length
  );
}

/**
 * Reads one row of a public model as a guest.
 *
 * @example
 * const { data } = await getAsGuest<Schema["SiteSetting"]["type"]>(
 *   "SiteSetting",
 *   { key: "contact" }
 * );
 */
export function getAsGuest<T>(
  model: ModelName,
  identifier: Record<string, unknown>
): Promise<GetAs<T>> {
  return cachedPublicRead(
    `get:${model}:${JSON.stringify(identifier)}`,
    () =>
      runWithAmplifyServerContext({
        nextServerContext: null,
        operation: async (contextSpec) =>
          (await guestModels[model].get(contextSpec, identifier)) as GetAs<T>,
      }),
    (result) => !result.errors?.length
  );
}
