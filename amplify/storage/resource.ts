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
export const storage = defineStorage({
  name: "imasportMedia",
  access: (allow) => ({
    "public/*": [
      allow.guest.to(["get"]),
      allow.authenticated.to(["get"]),
      allow.groups(["ADMINS"]).to(["get", "list", "write", "delete"]),
    ],
    "members/*": [
      allow.authenticated.to(["get"]),
      allow.groups(["ADMINS"]).to(["get", "list", "write", "delete"]),
    ],
    "avatars/{entity_id}/*": [
      allow.entity("identity").to(["get", "write", "delete"]),
      allow.authenticated.to(["get"]),
      allow.groups(["ADMINS"]).to(["get", "list", "write", "delete"]),
    ],
    "athlete-photos/*": [
      allow.authenticated.to(["get"]),
      allow.groups(["COACHES"]).to(["get", "write"]),
      allow.groups(["ADMINS"]).to(["get", "list", "write", "delete"]),
    ],
  }),
});
