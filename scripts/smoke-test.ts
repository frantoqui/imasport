/**
 * Authorization smoke test against a deployed IMASPORT backend.
 *
 * Checks what each role can and — more importantly — cannot do, so a change to
 * the schema's auth rules cannot quietly open the data up. Creates throwaway
 * users and deletes the rows it creates.
 *
 *   npx tsx scripts/smoke-test.ts
 *
 * Needs AWS credentials with Cognito admin permissions (same ones that
 * deployed the backend) plus a seeded database (`npx tsx scripts/seed.ts`).
 */
import { readFileSync } from "node:fs";
import { Amplify } from "aws-amplify";
import { signIn, signOut } from "aws-amplify/auth";
import { cognitoUserPoolsTokenProvider } from "aws-amplify/auth/cognito";
import { generateClient } from "aws-amplify/data";
import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  AdminAddUserToGroupCommand,
  AdminGetUserCommand,
  AdminDeleteUserCommand,
  UsernameExistsException,
} from "@aws-sdk/client-cognito-identity-provider";
import type { Schema } from "../amplify/data/resource";

const outputs = JSON.parse(readFileSync("amplify_outputs.json", "utf8"));
const USER_POOL_ID: string = outputs.auth.user_pool_id;
const REGION: string = outputs.auth.aws_region ?? "us-east-1";
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

const asUser = generateClient<Schema>({ authMode: "userPool" });
const asGuest = generateClient<Schema>({ authMode: "identityPool" });

// ---------------------------------------------------------------------------
// Tiny assertion harness
// ---------------------------------------------------------------------------

let passed = 0;
const failures: string[] = [];

function record(ok: boolean, label: string, detail = "") {
  if (ok) {
    passed += 1;
    console.log(`  PASS  ${label}`);
  } else {
    failures.push(`${label}${detail ? ` — ${detail}` : ""}`);
    console.log(`  FAIL  ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

type Result = { data?: unknown; errors?: readonly { message: string }[] };

/** Asserts an operation succeeded and returned data. */
async function allowed(label: string, op: () => Promise<Result>) {
  try {
    const result = await op();
    const hasErrors = Boolean(result.errors?.length);
    record(
      !hasErrors,
      label,
      hasErrors ? result.errors!.map((e) => e.message).join("; ") : ""
    );
    return result.data;
  } catch (error) {
    record(false, label, (error as Error).message);
    return undefined;
  }
}

/**
 * Asserts an operation was REFUSED. A silent success here is a security hole,
 * so an unexpected pass is reported as a failure.
 */
async function denied(label: string, op: () => Promise<Result>) {
  try {
    const result = await op();
    const refused = Boolean(result.errors?.length) || result.data == null;
    record(refused, label, refused ? "" : "operation was allowed");
  } catch {
    // A thrown GraphQL/auth error is also a refusal.
    record(true, label);
  }
}

// ---------------------------------------------------------------------------
// Throwaway users
// ---------------------------------------------------------------------------

/**
 * Throwaway users get a freshly generated password each run, so no credential
 * is ever written into the repository. The admin password must come from the
 * environment for the same reason.
 */
function generatePassword(): string {
  const pick = (set: string, n: number) =>
    Array.from(
      { length: n },
      () => set[Math.floor(Math.random() * set.length)]
    ).join("");
  return (
    pick("ABCDEFGHJKLMNPQRSTUVWXYZ", 4) +
    pick("abcdefghijkmnopqrstuvwxyz", 6) +
    pick("23456789", 3) +
    pick("!@#$%&*?", 2)
  );
}

/**
 * The admin credentials are never embedded. Supply them via the environment:
 *   SEED_ADMIN_EMAIL (optional)  SEED_ADMIN_PASSWORD (required)
 */
function requireAdminPassword(): string {
  const value = process.env.SEED_ADMIN_PASSWORD;
  if (!value) {
    console.error(
      "\nSEED_ADMIN_PASSWORD is not set.\n" +
        "This script signs in as the administrator, so it needs that password.\n" +
        "Run it like:\n" +
        "  SEED_ADMIN_PASSWORD='...' npm run <script>\n"
    );
    process.exit(1);
  }
  return value;
}

const PASSWORD = generatePassword();
const stamp = Date.now();
const ATHLETE_A = `smoke-a-${stamp}@imasport.test`;
const ATHLETE_B = `smoke-b-${stamp}@imasport.test`;
const COACH = `smoke-coach-${stamp}@imasport.test`;
const createdUsers: string[] = [];

async function makeUser(
  email: string,
  group: "ADMINS" | "COACHES" | "ATHLETES"
): Promise<string> {
  try {
    await cognito.send(
      new AdminCreateUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: email,
        MessageAction: "SUPPRESS",
        UserAttributes: [
          { Name: "email", Value: email },
          { Name: "email_verified", Value: "true" },
          { Name: "name", Value: email.split("@")[0] },
        ],
      })
    );
  } catch (error) {
    if (!(error instanceof UsernameExistsException)) throw error;
  }
  await cognito.send(
    new AdminSetUserPasswordCommand({
      UserPoolId: USER_POOL_ID,
      Username: email,
      Password: PASSWORD,
      Permanent: true,
    })
  );
  await cognito.send(
    new AdminAddUserToGroupCommand({
      UserPoolId: USER_POOL_ID,
      Username: email,
      GroupName: group,
    })
  );
  const detail = await cognito.send(
    new AdminGetUserCommand({ UserPoolId: USER_POOL_ID, Username: email })
  );
  createdUsers.push(email);
  const sub = detail.UserAttributes!.find((a) => a.Name === "sub")!.Value!;
  createdSubs.push(sub);
  return sub;
}

async function loginAs(email: string) {
  await signOut().catch(() => {});
  const result = await signIn({ username: email, password: PASSWORD });
  if (!result.isSignedIn) {
    throw new Error(`sign-in incomplete for ${email}: ${result.nextStep.signInStep}`);
  }
}

/** Cognito subs of the throwaway users, so their data rows can be removed. */
const createdSubs: string[] = [];

/**
 * Removes both the Cognito accounts and the rows they created.
 *
 * Deleting only the Cognito users would leave orphaned UserProfile rows that
 * show up in the admin panel as accounts with no login.
 */
async function cleanup() {
  // Row deletion needs admin rights, so sign in as the admin first.
  try {
    await signOut().catch(() => {});
    const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@imasport.mx";
    const adminPassword = requireAdminPassword();
    const result = await signIn({
      username: adminEmail,
      password: adminPassword,
    });

    if (result.isSignedIn) {
      for (const sub of createdSubs) {
        const owned = [
          () => asUser.models.UserProfile.delete({ userId: sub }),
        ];
        for (const remove of owned) await remove().catch(() => {});

        // Child rows have generated ids, so find them by their owner field.
        const evaluations = await asUser.models.Evaluation.list({
          filter: { athleteId: { eq: sub } },
        }).catch(() => ({ data: [] }));
        for (const row of evaluations.data ?? []) {
          await asUser.models.Evaluation.delete({ id: row.id }).catch(() => {});
        }

        const photos = await asUser.models.AthletePhoto.list({
          filter: { athleteId: { eq: sub } },
        }).catch(() => ({ data: [] }));
        for (const row of photos.data ?? []) {
          await asUser.models.AthletePhoto.delete({ id: row.id }).catch(() => {});
        }

        const workouts = await asUser.models.Workout.list({
          filter: { userId: { eq: sub } },
        }).catch(() => ({ data: [] }));
        for (const row of workouts.data ?? []) {
          await asUser.models.Workout.delete({ id: row.id }).catch(() => {});
        }

        const progress = await asUser.models.ProgressEntry.list({
          filter: { userId: { eq: sub } },
        }).catch(() => ({ data: [] }));
        for (const row of progress.data ?? []) {
          await asUser.models.ProgressEntry.delete({ id: row.id }).catch(() => {});
        }

        const registrations = await asUser.models.EventRegistration.list({
          filter: { userId: { eq: sub } },
        }).catch(() => ({ data: [] }));
        for (const row of registrations.data ?? []) {
          await asUser.models.EventRegistration.delete({ id: row.id }).catch(
            () => {}
          );
        }
      }
    } else {
      console.warn(
        "\nCould not sign in as admin to clean up data rows; " +
          `${createdSubs.length} UserProfile row(s) may be left behind.`
      );
    }
  } catch (error) {
    console.warn("\nData cleanup failed:", (error as Error).message);
  }

  await signOut().catch(() => {});
  for (const email of createdUsers) {
    await cognito
      .send(
        new AdminDeleteUserCommand({
          UserPoolId: USER_POOL_ID,
          Username: email,
        })
      )
      .catch(() => {});
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

async function main() {
  console.log("\nIMASPORT authorization smoke test");
  console.log(`  pool ${USER_POOL_ID}\n`);

  // --- Guest: the logged-out public website ------------------------------
  console.log("Visitante anónimo (guest / identity pool):");
  await signOut().catch(() => {});

  await allowed("guest reads Plan", () => asGuest.models.Plan.list());
  await allowed("guest reads Event", () => asGuest.models.Event.list());
  await allowed("guest reads CoachProfile", () =>
    asGuest.models.CoachProfile.list()
  );
  await allowed("guest reads Faq", () => asGuest.models.Faq.list());
  await allowed("guest reads Album", () => asGuest.models.Album.list());
  await allowed("guest reads Photo", () => asGuest.models.Photo.list());
  await allowed("guest reads SiteSetting", () =>
    asGuest.models.SiteSetting.list()
  );

  await denied("guest CANNOT create Event", () =>
    asGuest.models.Event.create({ title: "hack", date: "2030-01-01" })
  );
  await denied("guest CANNOT create Plan", () =>
    asGuest.models.Plan.create({ name: "hack", priceMxn: 0 })
  );
  await denied("guest CANNOT read UserProfile", () =>
    asGuest.models.UserProfile.list()
  );
  await denied("guest CANNOT read Evaluation", () =>
    asGuest.models.Evaluation.list()
  );
  await denied("guest CANNOT read AthletePhoto", () =>
    asGuest.models.AthletePhoto.list()
  );

  // --- Athlete ----------------------------------------------------------
  console.log("\nAtleta:");
  const subA = await makeUser(ATHLETE_A, "ATHLETES");
  const subB = await makeUser(ATHLETE_B, "ATHLETES");
  await loginAs(ATHLETE_A);

  await allowed("athlete creates own UserProfile", () =>
    asUser.models.UserProfile.create({
      userId: subA,
      email: ATHLETE_A,
      name: "Atleta A",
      role: "ATHLETE",
    })
  );
  await allowed("athlete reads own UserProfile", () =>
    asUser.models.UserProfile.get({ userId: subA })
  );
  await allowed("athlete updates own UserProfile", () =>
    asUser.models.UserProfile.update({ userId: subA, weightKg: 75 })
  );

  await denied("athlete CANNOT create a profile owned by someone else", () =>
    asUser.models.UserProfile.create({
      userId: subB,
      email: ATHLETE_B,
      name: "Suplantado",
      role: "ATHLETE",
    })
  );
  await denied("athlete CANNOT create Event", () =>
    asUser.models.Event.create({ title: "hack", date: "2030-01-01" })
  );
  await denied("athlete CANNOT create Plan", () =>
    asUser.models.Plan.create({ name: "hack", priceMxn: 0 })
  );
  await denied("athlete CANNOT create Evaluation for themselves", () =>
    asUser.models.Evaluation.create({ athleteId: subA, date: "2025-01-01" })
  );
  await denied("athlete CANNOT create AthletePhoto", () =>
    asUser.models.AthletePhoto.create({ athleteId: subA, key: "x" })
  );
  await denied("athlete CANNOT call setUserRole", () =>
    asUser.mutations.setUserRole({ userId: subA, role: "ADMINS" })
  );
  await denied("athlete CANNOT call listCognitoUsers", () =>
    asUser.queries.listCognitoUsers()
  );

  await allowed("athlete logs own Workout", () =>
    asUser.models.Workout.create({
      userId: subA,
      date: "2025-01-02",
      name: "Murph",
      type: "CrossFit",
      durationSec: 2535,
      calories: 620,
    })
  );
  await allowed("athlete registers for an event", async () => {
    // Read as the signed-in user, not via asGuest: identity-pool credentials
    // become *authenticated* once signed in, which is a different rule.
    const events = await asUser.models.Event.list({ limit: 1 });
    const eventId = events.data[0]?.id;
    if (!eventId) return { errors: [{ message: "no seeded events" }] };
    return asUser.models.EventRegistration.create({
      eventId,
      userId: subA,
      name: "Atleta A",
      email: ATHLETE_A,
      status: "REGISTERED",
    });
  });

  // A signed-in user must read public content with their user-pool token.
  // Identity-pool auth cannot work for them: signing in puts them in a Cognito
  // group, and the identity pool issues that group's role, which Amplify does
  // not grant AppSync permissions to. `publicAuthMode()` encodes this rule for
  // client components; these two assertions pin the behaviour down.
  await allowed("signed-in user reads public Event via userPool", () =>
    asUser.models.Event.list({ limit: 1 })
  );
  await denied(
    "signed-in user CANNOT read Event via identityPool (group role has no AppSync IAM)",
    () => asGuest.models.Event.list({ limit: 1 })
  );

  // Cross-tenant read: B's data must be invisible to A.
  await loginAs(ATHLETE_B);
  await allowed("athlete B creates own profile", () =>
    asUser.models.UserProfile.create({
      userId: subB,
      email: ATHLETE_B,
      name: "Atleta B",
      role: "ATHLETE",
    })
  );
  const bSeesA = await asUser.models.UserProfile.get({ userId: subA });
  record(
    bSeesA.data == null || Boolean(bSeesA.errors?.length),
    "athlete B CANNOT read athlete A's profile",
    bSeesA.data ? "profile was returned" : ""
  );
  const bWorkouts = await asUser.models.Workout.list();
  record(
    bWorkouts.data.every((w) => w.userId === subB),
    "athlete B's Workout list excludes other athletes",
    `saw ${bWorkouts.data.length} rows`
  );

  // --- Coach ------------------------------------------------------------
  console.log("\nCoach:");
  const subCoach = await makeUser(COACH, "COACHES");
  await loginAs(COACH);

  await allowed("coach reads athlete profiles", () =>
    asUser.models.UserProfile.list()
  );
  await allowed("coach creates Evaluation for an athlete", () =>
    asUser.models.Evaluation.create({
      athleteId: subA,
      coachId: subCoach,
      date: "2025-01-03",
      discipline: "CrossFit",
      performance: 8,
      technique: 7,
      effort: 9,
      metrics: JSON.stringify({ backSquat: 120 }),
    })
  );
  await allowed("coach creates AthletePhoto", () =>
    asUser.models.AthletePhoto.create({
      athleteId: subA,
      coachId: subCoach,
      key: "athlete-photos/smoke-test.jpg",
      takenAt: "2025-01-03",
    })
  );
  await allowed("coach writes ProgressEntry for an athlete", () =>
    asUser.models.ProgressEntry.create({
      userId: subA,
      discipline: "CrossFit",
      metric: "squat",
      value: 120,
      unit: "kg",
      date: "2025-01-03",
    })
  );
  await denied("coach CANNOT create Event", () =>
    asUser.models.Event.create({ title: "hack", date: "2030-01-01" })
  );
  await denied("coach CANNOT create Plan", () =>
    asUser.models.Plan.create({ name: "hack", priceMxn: 0 })
  );
  await denied("coach CANNOT call setUserRole", () =>
    asUser.mutations.setUserRole({ userId: subA, role: "ADMINS" })
  );

  // Athlete can now READ what the coach wrote about them.
  await loginAs(ATHLETE_A);
  const ownEvals = await asUser.models.Evaluation.list();
  record(
    ownEvals.data.length > 0 && ownEvals.data.every((e) => e.athleteId === subA),
    "athlete reads their own Evaluation written by the coach",
    `saw ${ownEvals.data.length} rows`
  );
  const ownPhotos = await asUser.models.AthletePhoto.list();
  record(
    ownPhotos.data.every((p) => p.athleteId === subA),
    "athlete's AthletePhoto list is scoped to them",
    `saw ${ownPhotos.data.length} rows`
  );

  // --- Admin ------------------------------------------------------------
  console.log("\nAdmin:");
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@imasport.mx";
  const adminPassword = requireAdminPassword();
  await signOut().catch(() => {});
  const adminSignIn = await signIn({
    username: adminEmail,
    password: adminPassword,
  });
  if (!adminSignIn.isSignedIn) {
    record(false, "admin sign-in", adminSignIn.nextStep.signInStep);
  } else {
    record(true, "admin sign-in");

    const created = (await allowed("admin creates Event", () =>
      asUser.models.Event.create({
        title: `Smoke test ${stamp}`,
        date: "2030-01-01",
        category: "Hyrox",
        spots: 10,
        published: false,
      })
    )) as { id?: string } | undefined;

    await allowed("admin reads all UserProfiles", () =>
      asUser.models.UserProfile.list()
    );
    await allowed("admin lists Cognito users", () =>
      asUser.queries.listCognitoUsers()
    );
    await allowed("admin promotes an athlete to COACHES", () =>
      asUser.mutations.setUserRole({ userId: subB, role: "COACHES" })
    );
    await allowed("admin disables an account", () =>
      asUser.mutations.setUserEnabled({ userId: subB, enabled: false })
    );
    await allowed("admin edits a Plan", async () => {
      const plans = await asUser.models.Plan.list({ limit: 1 });
      const id = plans.data[0]?.id;
      if (!id) return { errors: [{ message: "no seeded plans" }] };
      return asUser.models.Plan.update({ id, order: plans.data[0].order ?? 1 });
    });

    if (created?.id) {
      await allowed("admin deletes the Event", () =>
        asUser.models.Event.delete({ id: created.id! })
      );
    }
  }

  // --- Report -----------------------------------------------------------
  console.log(`\n${passed} passed, ${failures.length} failed`);
  if (failures.length) {
    console.log("\nFailures:");
    for (const failure of failures) console.log(`  - ${failure}`);
  }
  console.log("");

  await cleanup();
  process.exit(failures.length ? 1 : 0);
}

main().catch(async (error) => {
  console.error("\nSmoke test crashed:\n", error);
  await cleanup();
  process.exit(1);
});
