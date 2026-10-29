import type { AppSyncResolverHandler } from "aws-lambda";
import {
  CognitoIdentityProviderClient,
  AdminAddUserToGroupCommand,
  AdminRemoveUserFromGroupCommand,
  AdminListGroupsForUserCommand,
  AdminDisableUserCommand,
  AdminEnableUserCommand,
  ListUsersCommand,
  ListUsersInGroupCommand,
  type UserType,
} from "@aws-sdk/client-cognito-identity-provider";

const client = new CognitoIdentityProviderClient();

const ROLE_GROUPS = ["ADMINS", "COACHES", "ATHLETES"] as const;
type RoleGroup = (typeof ROLE_GROUPS)[number];

/**
 * Amplify injects the pool id under a key derived from the auth resource's
 * internal name (currently `amplifyAuth_USERPOOL_ID`). Matching on the suffix
 * keeps this working if that prefix changes between Amplify releases.
 */
function userPoolId(): string {
  const key = Object.keys(process.env).find((k) => k.endsWith("_USERPOOL_ID"));
  const value = key ? process.env[key] : undefined;
  if (!value) {
    throw new Error(
      "User pool id not found in the function environment. Confirm that " +
        "amplify/auth/resource.ts grants this function access to auth."
    );
  }
  return value;
}

/** Cognito usernames are opaque; find the username that owns a given `sub`. */
async function findUsernameBySub(
  UserPoolId: string,
  sub: string
): Promise<string> {
  const result = await client.send(
    new ListUsersCommand({ UserPoolId, Filter: `sub = "${sub}"`, Limit: 1 })
  );
  const username = result.Users?.[0]?.Username;
  if (!username) throw new Error(`No Cognito user found for id ${sub}`);
  return username;
}

function attr(user: UserType, name: string): string | undefined {
  return user.Attributes?.find((a) => a.Name === name)?.Value;
}

type Args = {
  userId?: string;
  role?: string;
  enabled?: boolean;
};

/**
 * Resolves which custom operation was called.
 *
 * Amplify's custom-operation events do not reliably carry AppSync's `info`
 * block, so we fall back to the argument shape. The three operations have
 * mutually exclusive signatures, which makes that unambiguous:
 *   setUserRole    -> { userId, role }
 *   setUserEnabled -> { userId, enabled }
 *   listCognitoUsers -> no arguments
 */
function resolveField(event: {
  info?: { fieldName?: string };
  fieldName?: string;
  arguments?: Args;
}): string {
  const explicit = event.info?.fieldName ?? event.fieldName;
  if (explicit) return explicit;

  const args = event.arguments ?? {};
  if (typeof args.role === "string") return "setUserRole";
  if (typeof args.enabled === "boolean") return "setUserEnabled";
  return "listCognitoUsers";
}

export const handler: AppSyncResolverHandler<Args, unknown> = async (event) => {
  const field = resolveField(event);
  console.log(
    JSON.stringify({
      message: "user-admin invoked",
      field,
      eventKeys: Object.keys(event ?? {}),
      hasInfo: Boolean((event as { info?: unknown }).info),
    })
  );
  const UserPoolId = userPoolId();

  switch (field) {
    /**
     * Moves a user into exactly one role group, removing the others so a user
     * can never hold two roles at once.
     */
    case "setUserRole": {
      const { userId, role } = event.arguments;
      if (!userId) throw new Error("userId is required");
      if (!role || !ROLE_GROUPS.includes(role as RoleGroup)) {
        throw new Error(`role must be one of ${ROLE_GROUPS.join(", ")}`);
      }
      const Username = await findUsernameBySub(UserPoolId, userId);

      const current = await client.send(
        new AdminListGroupsForUserCommand({ UserPoolId, Username })
      );
      const currentNames = (current.Groups ?? [])
        .map((g) => g.GroupName)
        .filter((n): n is string => Boolean(n));

      for (const group of currentNames) {
        if (group !== role && ROLE_GROUPS.includes(group as RoleGroup)) {
          await client.send(
            new AdminRemoveUserFromGroupCommand({
              UserPoolId,
              Username,
              GroupName: group,
            })
          );
        }
      }
      if (!currentNames.includes(role)) {
        await client.send(
          new AdminAddUserToGroupCommand({
            UserPoolId,
            Username,
            GroupName: role,
          })
        );
      }
      return { userId, role, ok: true };
    }

    case "setUserEnabled": {
      const { userId, enabled } = event.arguments;
      if (!userId) throw new Error("userId is required");
      const Username = await findUsernameBySub(UserPoolId, userId);
      await client.send(
        enabled
          ? new AdminEnableUserCommand({ UserPoolId, Username })
          : new AdminDisableUserCommand({ UserPoolId, Username })
      );
      return { userId, enabled: Boolean(enabled), ok: true };
    }

    /**
     * Lists the pool itself rather than the UserProfile table, so the admin
     * panel still shows accounts whose profile row failed to be created.
     *
     * Group membership is resolved by listing each of the three role groups
     * once, rather than calling AdminListGroupsForUser per user. That keeps
     * this at a fixed handful of Cognito calls instead of one per account —
     * the per-user version was throttling the pool (`TooManyRequestsException`)
     * and taking the whole admin panel down with it.
     */
    case "listCognitoUsers": {
      const groupsByUsername = new Map<string, string[]>();
      for (const group of ROLE_GROUPS) {
        let NextToken: string | undefined;
        do {
          const page = await client.send(
            new ListUsersInGroupCommand({
              UserPoolId,
              GroupName: group,
              Limit: 60,
              NextToken,
            })
          );
          for (const member of page.Users ?? []) {
            if (!member.Username) continue;
            const existing = groupsByUsername.get(member.Username) ?? [];
            existing.push(group);
            groupsByUsername.set(member.Username, existing);
          }
          NextToken = page.NextToken;
        } while (NextToken);
      }

      const users: Array<Record<string, unknown>> = [];
      let PaginationToken: string | undefined;

      do {
        const page = await client.send(
          new ListUsersCommand({ UserPoolId, Limit: 60, PaginationToken })
        );
        for (const user of page.Users ?? []) {
          const sub = attr(user, "sub");
          if (!sub) continue;
          users.push({
            userId: sub,
            username: user.Username,
            email: attr(user, "email"),
            emailVerified: attr(user, "email_verified") === "true",
            name: attr(user, "name"),
            phone: attr(user, "phone_number"),
            enabled: user.Enabled ?? false,
            status: user.UserStatus,
            createdAt: user.UserCreateDate?.toISOString(),
            groups: groupsByUsername.get(user.Username ?? "") ?? [],
          });
        }
        PaginationToken = page.PaginationToken;
      } while (PaginationToken);

      return { users };
    }

    default:
      throw new Error(`Unsupported field: ${field}`);
  }
};
