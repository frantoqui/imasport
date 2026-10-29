import { defineStorage } from "@aws-amplify/backend";

/**
 * Media bucket.
 *
 * Readers are only ever granted `get`, never `list`: the app always discovers
 * which objects exist by querying the `Photo` / `Album` / `AthletePhoto`
 * models, so nothing needs to enumerate the bucket and nobody can crawl it.
 *
 *   public/*            marketing media — gallery, event covers, coach cards
 *   members/*           member-only albums
 *   avatars/{id}/*      profile pictures, each user writing only their own
 *   athlete-photos/*    progress photos captured by a coach in a session
 */
/**
 * Important: every grant below is spelled out per group.
 *
 * `allow.authenticated` is NOT sufficient here. Signing in puts a user into a
 * Cognito group, and the identity pool then issues that group's role
 * (ATHLETES / COACHES / ADMINS) rather than the default authenticated role —
 * which is the only role Amplify attaches an `authenticated` policy to. So an
 * `allow.authenticated` rule grants nothing to anyone who has a role, i.e. to
 * everyone. The `authenticated` entries are kept only as a fallback for a user
 * who somehow belongs to no group.
 *
 * The same mechanism breaks `identityPool` reads on the data API; see the note
 * in `amplify/data/resource.ts`.
 */
export const storage = defineStorage({
  name: "imasportMedia",
  access: (allow) => ({
    "public/*": [
      allow.guest.to(["get"]),
      allow.authenticated.to(["get"]),
      allow.groups(["ATHLETES", "COACHES"]).to(["get"]),
      allow.groups(["ADMINS"]).to(["get", "list", "write", "delete"]),
    ],
    "members/*": [
      allow.authenticated.to(["get"]),
      allow.groups(["ATHLETES", "COACHES"]).to(["get"]),
      allow.groups(["ADMINS"]).to(["get", "list", "write", "delete"]),
    ],
    /**
     * Profile pictures. `entity` scopes a user to their own folder, and the
     * group grants cover viewing other people's avatars (a coach seeing an
     * athlete's photo in the roster, for instance).
     */
    "avatars/{entity_id}/*": [
      allow.entity("identity").to(["get", "write", "delete"]),
      allow.authenticated.to(["get"]),
      allow.groups(["ATHLETES", "COACHES"]).to(["get", "write"]),
      allow.groups(["ADMINS"]).to(["get", "list", "write", "delete"]),
    ],
    /**
     * Progress photos. Athletes are granted `get` but never `list`, so they
     * cannot enumerate the prefix; `/api/media` additionally checks that the
     * requested key is recorded against the requesting athlete before it
     * hands back a signed URL.
     */
    "athlete-photos/*": [
      allow.authenticated.to(["get"]),
      allow.groups(["ATHLETES"]).to(["get"]),
      allow.groups(["COACHES"]).to(["get", "write"]),
      allow.groups(["ADMINS"]).to(["get", "list", "write", "delete"]),
    ],
  }),
});
