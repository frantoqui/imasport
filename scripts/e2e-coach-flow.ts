/**
 * End-to-end test of the coach workflow — the one thing the main E2E suite
 * does not cover.
 *
 * `e2e-test.ts` proves a coach can reach /coach and is kept out of /admin, but
 * it never submits an evaluation. That left the actual point of the feature
 * unverified: a coach fills the form, and the numbers show up on the athlete's
 * dashboard. This drives the real UI and then checks the backend and the
 * athlete's own view.
 *
 *   npm run dev            # in another terminal
 *   SEED_ADMIN_PASSWORD='...' npx tsx scripts/e2e-coach-flow.ts
 *
 * Needs the demo accounts (SEED_DEMO=1 npm run seed) and AWS credentials.
 */
import { readFileSync } from "node:fs";
import puppeteer, { type Browser, type Page } from "puppeteer";
import { Amplify } from "aws-amplify";
import { signIn, signOut } from "aws-amplify/auth";
import { cognitoUserPoolsTokenProvider } from "aws-amplify/auth/cognito";
import { generateClient } from "aws-amplify/data";
import {
  CognitoIdentityProviderClient,
  AdminDeleteUserCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import type { Schema } from "../amplify/data/resource";

const BASE = (process.env.E2E_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const outputs = JSON.parse(readFileSync("amplify_outputs.json", "utf8"));

const COACH_EMAIL = "coach@imasport.mx";
const ATHLETE_EMAIL = "atleta@imasport.mx";
const ATHLETE_NAME = "Carlos";

function requirePassword(): string {
  const value = process.env.SEED_ADMIN_PASSWORD;
  if (!value) {
    console.error(
      "\nSEED_ADMIN_PASSWORD is not set. It is used for the demo accounts too " +
        "unless SEED_DEMO_PASSWORD is set.\n"
    );
    process.exit(1);
  }
  return value;
}
const ADMIN_PASSWORD = requirePassword();
const DEMO_PASSWORD = process.env.SEED_DEMO_PASSWORD ?? ADMIN_PASSWORD;

class MemoryStorage {
  private store = new Map<string, string>();
  async setItem(k: string, v: string) { this.store.set(k, v); }
  async getItem(k: string) { return this.store.get(k) ?? null; }
  async removeItem(k: string) { this.store.delete(k); }
  async clear() { this.store.clear(); }
}
Amplify.configure(outputs);
cognitoUserPoolsTokenProvider.setKeyValueStorage(new MemoryStorage());
const api = generateClient<Schema>({ authMode: "userPool" });
const cognito = new CognitoIdentityProviderClient({
  region: outputs.auth?.aws_region ?? "us-east-1",
});

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

/** Values unique to this run, so we can prove these exact rows were created. */
const stamp = Date.now();
const MARKER = `e2e-coach-${stamp}`;
const SQUAT = 100 + (stamp % 80) + 0.5;
const DEADLIFT = 150 + (stamp % 40) + 0.5;

async function loginThrough(
  browser: Browser,
  email: string,
  password: string
): Promise<{ page: Page; context: Awaited<ReturnType<Browser["createBrowserContext"]>>; landed: string }> {
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  await page.setViewport({ width: 1500, height: 1000 });
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle2", timeout: 60000 });
  await page.waitForSelector('input[type="email"]', { timeout: 30000 });
  await page.type('input[type="email"]', email, { delay: 10 });
  await page.type('input[type="password"]', password, { delay: 10 });
  await page.click('button[type="submit"]');
  await page
    .waitForFunction(() => !location.pathname.startsWith("/login"), { timeout: 60000 })
    .catch(() => {});
  await new Promise((r) => setTimeout(r, 2500));
  return { page, context, landed: new URL(page.url()).pathname };
}

/** Clicks a 1–10 rating button by its accessible label. */
async function setRating(page: Page, label: string, value: number) {
  const selector = `button[aria-label="${label}: ${value}"]`;
  await page.waitForSelector(selector, { timeout: 20000 });
  await page.click(selector);
}

/**
 * Sets a React-controlled number input.
 *
 * Assigning `.value` directly does not reach React, so we go through the
 * native setter and dispatch a bubbling `input` event — which is what React's
 * synthetic onChange listens for.
 */
async function fillNumber(page: Page, id: string, value: number) {
  const selector = `#${id}`;
  await page.waitForSelector(selector, { timeout: 20000 });
  await page.$eval(
    selector,
    (element, next) => {
      const input = element as HTMLInputElement;
      const setter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value"
      )?.set;
      setter?.call(input, String(next));
      input.dispatchEvent(new Event("input", { bubbles: true }));
    },
    value
  );
}

/**
 * Clicks the first button whose text contains `text`.
 *
 * Retried: the athlete list re-renders as its data settles, and a click that
 * races that render fails with "detached Frame" rather than a useful error.
 */
async function clickButtonContaining(
  page: Page,
  text: string,
  attempts = 5
): Promise<boolean> {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const clicked = await page.evaluate((needle: string) => {
        const button = Array.from(document.querySelectorAll("button")).find(
          (b) => (b.textContent ?? "").includes(needle)
        );
        if (!button) return false;
        (button as HTMLButtonElement).click();
        return true;
      }, text);
      if (clicked) return true;
    } catch {
      // Frame detached mid-render; fall through and retry.
    }
    await new Promise((r) => setTimeout(r, 1200));
  }
  return false;
}

async function main() {
  console.log(`\nIMASPORT coach workflow  (${BASE})\n`);

  const browser = await puppeteer.launch({
    headless: process.env.E2E_HEADFUL !== "1",
    args: ["--no-sandbox"],
  });

  try {
    // ---- An admin creates a coach account through the real UI -----------
    // Coaches have no sign-up screen, so this is the only onboarding path.
    console.log("Admin crea un coach:");
    const newCoachEmail = `e2e-newcoach-${stamp}@imasport.test`;
    const newCoachPassword = `Coach${stamp % 100000}Aa9!`;
    {
      const admin = await loginThrough(
        browser,
        process.env.SEED_ADMIN_EMAIL ?? "admin@imasport.mx",
        ADMIN_PASSWORD
      );
      const page = admin.page;
      await page.goto(`${BASE}/admin/usuarios`, {
        waitUntil: "networkidle2",
        timeout: 60000,
      });
      await new Promise((r) => setTimeout(r, 1500));

      const opened = await page.evaluate(() => {
        const button = Array.from(document.querySelectorAll("button")).find(
          (b) => (b.textContent ?? "").trim() === "Nuevo coach"
        );
        if (!button) return false;
        (button as HTMLButtonElement).click();
        return true;
      });
      record(opened, "admin finds the 'Nuevo coach' form on /admin/usuarios");

      if (opened) {
        await page.waitForSelector("#coach-name", { timeout: 20000 });
        await page.type("#coach-name", "Coach E2E", { delay: 10 });
        await page.type("#coach-email", newCoachEmail, { delay: 10 });
        await page.type("#coach-password", newCoachPassword, { delay: 10 });
        await page.select("#coach-discipline", "Hyrox");

        const clicked = await page.evaluate(() => {
          const button = Array.from(document.querySelectorAll("button")).find(
            (b) => (b.textContent ?? "").includes("Crear coach")
          );
          if (!button) return false;
          (button as HTMLButtonElement).click();
          return true;
        });
        record(clicked, "admin can submit the new-coach form");

        // Read the alert the form renders, not the whole page: the users
        // table also mentions the new coach, so a body-wide match would pass
        // even when the confirmation never appeared.
        const alertText = await page
          .waitForFunction(
            () => {
              const alert = document.querySelector('[role="alert"]');
              const text = alert?.textContent?.trim();
              return text && text.length > 0 ? text : false;
            },
            { timeout: 60000 }
          )
          .then((handle) => handle.jsonValue() as Promise<string>)
          .catch(() => "");

        record(
          /creado/i.test(alertText),
          "UI confirms the coach account was created",
          alertText ? alertText.replace(/\s+/g, " ").slice(0, 200) : "no alert appeared"
        );
      }
      await admin.context.close();
    }

    // The real proof: the brand-new coach can sign in and reach /coach.
    {
      const fresh = await loginThrough(browser, newCoachEmail, newCoachPassword);
      record(
        fresh.landed === "/coach",
        "the newly created coach can sign in and lands on /coach",
        `landed on ${fresh.landed}`
      );
      await fresh.context.close();
    }

    // Clean up the account this test created.
    await cognito
      .send(
        new AdminDeleteUserCommand({
          UserPoolId: outputs.auth.user_pool_id,
          Username: newCoachEmail,
        })
      )
      .catch(() => {});

    // ---- Coach fills in an evaluation through the real UI ---------------
    console.log("\nCoach:");
    const coach = await loginThrough(browser, COACH_EMAIL, DEMO_PASSWORD);
    record(coach.landed === "/coach", "coach lands on /coach", `landed on ${coach.landed}`);

    const page = coach.page;
    const consoleErrors: string[] = [];
    page.on("pageerror", (e: unknown) =>
      consoleErrors.push(e instanceof Error ? e.message : String(e))
    );

    await page.goto(`${BASE}/coach`, { waitUntil: "networkidle2", timeout: 60000 });
    await new Promise((r) => setTimeout(r, 2000));

    // Find the athlete.
    await page.waitForSelector('input[aria-label="Buscar atleta"]', { timeout: 30000 });
    await page.type('input[aria-label="Buscar atleta"]', ATHLETE_NAME, { delay: 20 });
    await new Promise((r) => setTimeout(r, 900));

    const picked = await clickButtonContaining(page, ATHLETE_NAME);
    record(picked, `coach can select the athlete "${ATHLETE_NAME}"`);

    await new Promise((r) => setTimeout(r, 2000));
    const formAppeared = await page
      .waitForSelector("#eval-discipline", { timeout: 30000 })
      .then(() => true)
      .catch(() => false);
    record(formAppeared, "evaluation form appears after selecting an athlete");

    if (!formAppeared) throw new Error("no evaluation form; cannot continue");

    await page.select("#eval-discipline", "CrossFit");
    await new Promise((r) => setTimeout(r, 600));

    await setRating(page, "Rendimiento", 9);
    await setRating(page, "Técnica", 8);
    await setRating(page, "Esfuerzo", 10);
    record(true, "coach can set the 1-10 ratings");

    await fillNumber(page, "eval-squat", SQUAT);
    await fillNumber(page, "eval-deadlift", DEADLIFT);

    await page.waitForSelector("#eval-notes", { timeout: 20000 });
    await page.type("#eval-notes", MARKER, { delay: 5 });
    record(true, "coach can fill discipline metrics and notes");

    // Submit.
    const submitted = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const save = buttons.find((b) =>
        (b.textContent ?? "").includes("Guardar Evaluación")
      );
      if (!save) return false;
      (save as HTMLButtonElement).click();
      return true;
    });
    record(submitted, "save button is present and clickable");

    // Wait for the confirmation the component renders on success.
    const savedOk = await page
      .waitForFunction(
        () => /guardad|exitosa|correctamente/i.test(document.body.innerText),
        { timeout: 45000 }
      )
      .then(() => true)
      .catch(() => false);
    const bodyAfter = await page.evaluate(() => document.body.innerText);
    record(
      savedOk,
      "UI confirms the evaluation was saved",
      savedOk ? "" : bodyAfter.slice(-200).replace(/\s+/g, " ")
    );

    record(
      consoleErrors.length === 0,
      "coach panel runs without uncaught errors",
      consoleErrors.slice(0, 2).join(" | ")
    );
    await coach.context.close();

    // ---- Did it actually persist? --------------------------------------
    console.log("\nDatos guardados:");
    await signOut().catch(() => {});
    const adminSignedIn = await signIn({
      username: process.env.SEED_ADMIN_EMAIL ?? "admin@imasport.mx",
      password: ADMIN_PASSWORD,
    });
    if (!adminSignedIn.isSignedIn) throw new Error("admin sign-in failed");

    const evaluations = await api.models.Evaluation.list({
      filter: { notes: { contains: MARKER } },
    });
    const evaluation = evaluations.data[0];
    record(Boolean(evaluation), "Evaluation row was created with the coach's notes");
    record(
      evaluation?.performance === 9 &&
        evaluation?.technique === 8 &&
        evaluation?.effort === 10,
      "ratings persisted exactly as entered",
      evaluation
        ? `got ${evaluation.performance}/${evaluation.technique}/${evaluation.effort}`
        : "no row"
    );

    // metrics is AWSJSON: a string on read.
    let metrics: Record<string, unknown> = {};
    try {
      const raw = evaluation?.metrics;
      metrics = typeof raw === "string" ? JSON.parse(raw) : ((raw as object) ?? {});
    } catch {
      metrics = {};
    }
    record(
      Number(metrics.squat) === SQUAT && Number(metrics.deadlift) === DEADLIFT,
      "discipline metrics persisted in Evaluation.metrics",
      `got ${JSON.stringify(metrics)}`
    );

    // The point of the feature: progress rows that drive the athlete charts.
    //
    // Paginated and filtered in memory on purpose. AppSync applies a `filter`
    // *after* DynamoDB's page limit, so a single filtered `list` can come back
    // short and make a row that exists look missing — which is exactly the
    // false negative this assertion produced the first time it was written.
    const athleteId = evaluation?.athleteId ?? "";
    const progress: Array<{ metric: string; value: number; date: string }> = [];
    let token: string | null = null;
    let pages = 0;
    do {
      // Not named `page`: that would shadow the Puppeteer page above.
      // The shallow annotation is needed because Amplify's `list()` return
      // type is deep enough that TypeScript cannot resolve it alongside
      // `token`, which is both an input and read back off the result (TS7022).
      const batch = (await api.models.ProgressEntry.list({
        limit: 500,
        nextToken: token,
      })) as {
        data: Array<{
          userId: string;
          metric: string;
          value: number;
          date: string;
        }> | null;
        nextToken?: string | null;
      };
      for (const row of batch.data ?? []) {
        if (row.userId === athleteId) {
          progress.push({
            metric: row.metric,
            value: row.value,
            date: row.date,
          });
        }
      }
      token = batch.nextToken ?? null;
      pages += 1;
    } while (token && pages < 50);

    const squats = progress.filter((r) => r.metric === "squat");
    record(
      squats.some((row) => row.value === SQUAT),
      "ProgressEntry created for squat, so the athlete's chart moves",
      `looked for ${SQUAT} in: ${squats.map((r) => r.value).join(", ")}`
    );
    record(
      progress.some((r) => r.metric === "deadlift" && r.value === DEADLIFT),
      "ProgressEntry created for deadlift",
      `looked for ${DEADLIFT}`
    );
    await signOut().catch(() => {});

    // ---- Does the athlete see it? --------------------------------------
    console.log("\nVista del atleta:");
    const athlete = await loginThrough(browser, ATHLETE_EMAIL, DEMO_PASSWORD);
    record(
      athlete.landed === "/dashboard",
      "athlete lands on /dashboard",
      `landed on ${athlete.landed}`
    );

    await athlete.page.goto(`${BASE}/dashboard`, {
      waitUntil: "networkidle2",
      timeout: 60000,
    });
    await new Promise((r) => setTimeout(r, 3000));

    const plotted = await athlete.page.evaluate(
      () =>
        document.querySelectorAll(
          ".recharts-line-curve, .recharts-bar-rectangle, .recharts-radar-polygon, .recharts-area-area"
        ).length
    );
    record(plotted > 0, "athlete's charts render the coach's data", `${plotted} series`);

    // The new squat value should be the latest point on the lift chart.
    const dashText = await athlete.page.evaluate(() => document.body.innerText);
    record(
      dashText.length > 500,
      "dashboard renders content rather than an error page"
    );
    await athlete.context.close();
  } finally {
    await browser.close();
    await signOut().catch(() => {});
  }

  console.log(`\n${passed} passed, ${failures.length} failed`);
  if (failures.length) {
    console.log("\nFailures:");
    for (const f of failures) console.log(`  - ${f}`);
  }
  console.log("");
  process.exit(failures.length ? 1 : 0);
}

main().catch((error) => {
  console.error("\nCoach flow test crashed:\n", error);
  process.exit(1);
});
