/**
 * Removes UserProfile rows whose Cognito account no longer exists.
 *
 * These appear in the admin panel as "accounts with no login". They are
 * normally left behind by test runs, or by deleting a user from the Cognito
 * console without touching the data tables.
 *
 *   npx tsx scripts/prune-orphans.ts            # report only
 *   npx tsx scripts/prune-orphans.ts --delete    # actually delete
 *
 * Requires AWS credentials with Cognito read access and the admin password.
 */
import { readFileSync } from "node:fs";
import { Amplify } from "aws-amplify";
import { signIn, signOut } from "aws-amplify/auth";
import { cognitoUserPoolsTokenProvider } from "aws-amplify/auth/cognito";
import { generateClient } from "aws-amplify/data";
import {
  CognitoIdentityProviderClient,
  ListUsersCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import type { Schema } from "../amplify/data/resource";

const outputs = JSON.parse(readFileSync("amplify_outputs.json", "utf8"));
const USER_POOL_ID: string = outputs.auth.user_pool_id;
const REGION: string = outputs.auth.aws_region ?? "us-east-1";
const APPLY = process.argv.includes("--delete");

const cognito = new CognitoIdentityProviderClient({ region: REGION });

class MemoryStorage {
  private store = new Map<string, string>();
  async setItem(k: string, v: string) {
    this.store.set(k, v);
  }
  async getItem(k: string) {
    return this.store.get(k) ?? null;
  }
  async removeItem(k: string) {
    this.store.delete(k);
  }
  async clear() {
    this.store.clear();
  }
}

Amplify.configure(outputs);
cognitoUserPoolsTokenProvider.setKeyValueStorage(new MemoryStorage());
const client = generateClient<Schema>({ authMode: "userPool" });

async function cognitoSubs(): Promise<Set<string>> {
  const subs = new Set<string>();
  let PaginationToken: string | undefined;
  do {
    const page = await cognito.send(
      new ListUsersCommand({ UserPoolId: USER_POOL_ID, Limit: 60, PaginationToken })
    );
    for (const user of page.Users ?? []) {
      const sub = user.Attributes?.find((a) => a.Name === "sub")?.Value;
      if (sub) subs.add(sub);
    }
    PaginationToken = page.PaginationToken;
  } while (PaginationToken);
  return subs;
}

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@imasport.mx";
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!password) {
    console.error(
      "\nSEED_ADMIN_PASSWORD is not set; this script signs in as the admin.\n"
    );
    process.exit(1);
  }

  const signedIn = await signIn({ username: email, password });
  if (!signedIn.isSignedIn) {
    throw new Error(`Admin sign-in incomplete: ${signedIn.nextStep.signInStep}`);
  }

  const live = await cognitoSubs();
  const profiles = await client.models.UserProfile.list();
  if (profiles.errors?.length) {
    throw new Error(profiles.errors.map((e) => e.message).join("; "));
  }

  const orphans = profiles.data.filter((p) => !live.has(p.userId));

  console.log(`\nCognito users:   ${live.size}`);
  console.log(`UserProfile rows: ${profiles.data.length}`);
  console.log(`Orphans:          ${orphans.length}\n`);

  for (const orphan of orphans) {
    console.log(`  ${orphan.userId}  ${orphan.email}  ${orphan.name}`);
  }

  if (!orphans.length) {
    console.log("Nothing to do.\n");
  } else if (!APPLY) {
    console.log("\nRe-run with --delete to remove these rows.\n");
  } else {
    console.log("");
    for (const orphan of orphans) {
      const result = await client.models.UserProfile.delete({
        userId: orphan.userId,
      });
      const failed = result.errors?.length;
      console.log(
        `  ${failed ? "FAILED " : "deleted"}  ${orphan.email}${
          failed ? ` — ${result.errors!.map((e) => e.message).join("; ")}` : ""
        }`
      );
    }
    console.log("");
  }

  await signOut().catch(() => {});
}

main().catch((error) => {
  console.error("\nPrune failed:\n", error);
  process.exit(1);
});
