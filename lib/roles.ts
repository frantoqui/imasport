/**
 * Role vocabulary shared by the server, the client and the Amplify backend.
 *
 * The authoritative role for a signed-in user is their Cognito group, which
 * arrives in the `cognito:groups` claim of the access token. `UserProfile.role`
 * is only a denormalized copy for listing and filtering.
 */
export const GROUPS = {
  admin: "ADMINS",
  coach: "COACHES",
  athlete: "ATHLETES",
} as const;

export type AppRole = keyof typeof GROUPS;
export type GroupName = (typeof GROUPS)[AppRole];

/** Most-privileged group wins, so an admin who is also a coach lands on /admin. */
const PRECEDENCE: AppRole[] = ["admin", "coach", "athlete"];

export function roleFromGroups(groups: readonly string[] | undefined): AppRole {
  for (const role of PRECEDENCE) {
    if (groups?.includes(GROUPS[role])) return role;
  }
  return "athlete";
}

/** Where a user should land straight after signing in. */
export function homeForRole(role: AppRole): string {
  switch (role) {
    case "admin":
      return "/admin";
    case "coach":
      return "/coach";
    default:
      return "/dashboard";
  }
}

export function isAtLeast(role: AppRole, required: AppRole): boolean {
  return PRECEDENCE.indexOf(role) <= PRECEDENCE.indexOf(required);
}
