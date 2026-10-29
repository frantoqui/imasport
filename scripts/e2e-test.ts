/**
 * End-to-end browser test for IMASPORT.
 *
 * Drives a real browser against a running dev/prod server and checks that
 * pages render, that role gating actually redirects, and — importantly — that
 * no page logs a console error or pulls a 5xx. A page that renders but throws
 * in the console is a broken page.
 *
 *   npm run dev            # in another terminal
 *   npx tsx scripts/e2e-test.ts
 *
 * Env:
 *   E2E_BASE_URL   default http://localhost:3000
 *   E2E_HEADFUL=1  watch it run
 *
 * Needs AWS credentials (to create throwaway confirmed users) and a seeded
 * database.
 */
import { readFileSync } from "node:fs";
import puppeteer, { type Browser, type Page, type ConsoleMessage } from "puppeteer";
import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  AdminAddUserToGroupCommand,
  AdminDeleteUserCommand,
  ListUsersCommand,
  UsernameExistsException,
} from "@aws-sdk/client-cognito-identity-provider";

const BASE = (process.env.E2E_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const outputs = JSON.parse(readFileSync("amplify_outputs.json", "utf8"));
const USER_POOL_ID: string = outputs.auth.user_pool_id;
const REGION: string = outputs.auth.aws_region ?? "us-east-1";
const cognito = new CognitoIdentityProviderClient({ region: REGION });

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

/** Throwaway accounts get a fresh password each run. */
const PASSWORD = generatePassword();
const stamp = Date.now();
const ATHLETE = `e2e-athlete-${stamp}@imasport.test`;
const COACH = `e2e-coach-${stamp}@imasport.test`;
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@imasport.mx";
const ADMIN_PASSWORD = requireAdminPassword();
const throwaway: string[] = [];

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

// ---------------------------------------------------------------------------
// Throwaway users
// ---------------------------------------------------------------------------

async function makeUser(email: string, group: "COACHES" | "ATHLETES") {
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
  throwaway.push(email);
}

/**
 * Deletes the throwaway Cognito accounts.
 *
 * Logging in through the UI also creates a UserProfile row (that is what
 * `ensureProfile` is for), so those rows are pruned afterwards by
 * `scripts/prune-orphans.ts`, which is run for us at the end of the suite.
 */
async function cleanup() {
  for (const email of throwaway) {
    await cognito
      .send(
        new AdminDeleteUserCommand({ UserPoolId: USER_POOL_ID, Username: email })
      )
      .catch(() => {});
  }
}

// ---------------------------------------------------------------------------
// Page instrumentation
// ---------------------------------------------------------------------------

type PageProblems = { consoleErrors: string[]; badResponses: string[] };

/**
 * Next.js dev and React emit a lot of benign noise. We only want genuine
 * application failures, so known-harmless messages are filtered out.
 */
const IGNORED_CONSOLE = [
  /Download the React DevTools/i,
  /\[Fast Refresh\]/i,
  /was preloaded using link preload but not used/i,
  /Failed to load resource: the server responded with a status of 404.*favicon/i,
  /React Router Future Flag/i,
];

function watch(page: Page): PageProblems {
  const problems: PageProblems = { consoleErrors: [], badResponses: [] };

  page.on("console", (message: ConsoleMessage) => {
    if (message.type() !== "error") return;
    const text = message.text();
    if (IGNORED_CONSOLE.some((pattern) => pattern.test(text))) return;
    problems.consoleErrors.push(text);
  });

  page.on("pageerror", (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    problems.consoleErrors.push(`uncaught: ${message}`);
  });

  page.on("response", (response) => {
    const status = response.status();
    if (status >= 500) {
      problems.badResponses.push(`${status} ${response.url()}`);
    }
  });

  return problems;
}

async function freshPage(browser: Browser) {
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  return { page, context };
}

/** Visits a URL and asserts it renders cleanly and contains `expectText`. */
async function checkPage(
  browser: Browser,
  path: string,
  expectText: string | RegExp | null,
  label = path
) {
  const { page, context } = await freshPage(browser);
  const problems = watch(page);
  try {
    const response = await page.goto(`${BASE}${path}`, {
      waitUntil: "networkidle2",
      timeout: 45000,
    });
    const status = response?.status() ?? 0;
    // Give client-side data fetches a moment to settle.
    await new Promise((r) => setTimeout(r, 1200));
    const body = await page.evaluate(() => document.body.innerText);

    const statusOk = status < 400;
    const textOk =
      expectText == null
        ? true
        : typeof expectText === "string"
          ? body.includes(expectText)
          : expectText.test(body);

    const detail: string[] = [];
    if (!statusOk) detail.push(`status ${status}`);
    if (!textOk) detail.push(`missing ${String(expectText)}`);
    if (problems.consoleErrors.length) {
      detail.push(`console: ${problems.consoleErrors.slice(0, 2).join(" | ")}`);
    }
    if (problems.badResponses.length) {
      detail.push(`5xx: ${problems.badResponses.slice(0, 2).join(" | ")}`);
    }

    record(
      statusOk &&
        textOk &&
        problems.consoleErrors.length === 0 &&
        problems.badResponses.length === 0,
      label,
      detail.join("; ")
    );
  } catch (error) {
    record(false, label, (error as Error).message);
  } finally {
    await context.close();
  }
}

/** Signs in through the real login form and returns the landing path. */
async function loginAs(
  browser: Browser,
  email: string,
  password: string
): Promise<{ page: Page; context: Awaited<ReturnType<typeof freshPage>>["context"]; landed: string }> {
  const { page, context } = await freshPage(browser);
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle2", timeout: 45000 });

  await page.waitForSelector('input[type="email"]', { timeout: 20000 });
  await page.type('input[type="email"]', email, { delay: 10 });
  await page.type('input[type="password"]', password, { delay: 10 });

  await Promise.all([
    page.click('button[type="submit"]'),
    page
      .waitForFunction(() => !location.pathname.startsWith("/login"), {
        timeout: 45000,
      })
      .catch(() => {}),
  ]);
  await new Promise((r) => setTimeout(r, 2000));

  return { page, context, landed: new URL(page.url()).pathname };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log(`\nIMASPORT E2E  (${BASE})\n`);

  // Fail fast with a clear message if nothing is listening.
  try {
    const probe = await fetch(`${BASE}/api/health`);
    const health = (await probe.json()) as { ok?: boolean; checks?: unknown };
    record(health.ok === true, "GET /api/health reports ok", JSON.stringify(health.checks));
  } catch (error) {
    console.error(
      `\nCould not reach ${BASE}. Start the server first (npm run dev).\n`,
      (error as Error).message
    );
    process.exit(1);
  }

  await makeUser(ATHLETE, "ATHLETES");
  await makeUser(COACH, "COACHES");

  const browser = await puppeteer.launch({
    headless: process.env.E2E_HEADFUL !== "1",
    args: ["--no-sandbox"],
  });

  try {
    console.log("\nPáginas públicas (sin sesión):");
    await checkPage(browser, "/", "IMASPORT");
    await checkPage(browser, "/planes", /Plan|Básico|Pro|Elite/);
    await checkPage(browser, "/galeria", /Galer|Álbum|album/i);
    await checkPage(browser, "/eventos", /Evento/i);
    await checkPage(browser, "/login", /Iniciar|Correo/i);
    await checkPage(browser, "/register", /Registr/i);
    await checkPage(browser, "/register-coach", /Coach|Registr/i);
    await checkPage(browser, "/confirmar", /dig|código|Confirm/i);
    await checkPage(browser, "/recuperar", /contrase|Recuper/i);
    await checkPage(browser, "/terminos", /rmino/i);
    await checkPage(browser, "/privacidad", /Privacidad/i);

    console.log("\nProtección de rutas (sin sesión):");
    for (const path of ["/admin", "/dashboard", "/profile", "/coach", "/mis-fotos"]) {
      const { page, context } = await freshPage(browser);
      try {
        await page.goto(`${BASE}${path}`, {
          waitUntil: "networkidle2",
          timeout: 45000,
        });
        const landed = new URL(page.url()).pathname;
        record(
          landed.startsWith("/login"),
          `${path} redirects anonymous visitor to /login`,
          `landed on ${landed}`
        );
      } catch (error) {
        record(false, `${path} redirect check`, (error as Error).message);
      } finally {
        await context.close();
      }
    }

    console.log("\nAdmin:");
    {
      const { page, context, landed } = await loginAs(
        browser,
        ADMIN_EMAIL,
        ADMIN_PASSWORD
      );
      record(landed === "/admin", "admin login lands on /admin", `landed on ${landed}`);
      const problems = watch(page);
      for (const path of [
        "/admin",
        "/admin/eventos",
        "/admin/galeria",
        "/admin/usuarios",
        "/admin/planes",
        "/admin/coaches",
        "/admin/faq",
        "/admin/contenido",
      ]) {
        try {
          const response = await page.goto(`${BASE}${path}`, {
            waitUntil: "networkidle2",
            timeout: 45000,
          });
          await new Promise((r) => setTimeout(r, 1000));
          const status = response?.status() ?? 0;
          const errorsBefore = problems.consoleErrors.length;
          record(
            status < 400 && problems.consoleErrors.length === errorsBefore,
            `admin can open ${path}`,
            status >= 400
              ? `status ${status}`
              : problems.consoleErrors.slice(-1).join("")
          );
        } catch (error) {
          record(false, `admin can open ${path}`, (error as Error).message);
        }
      }
      await context.close();
    }

    console.log("\nAtleta:");
    {
      const { page, context, landed } = await loginAs(browser, ATHLETE, PASSWORD);
      record(
        landed === "/dashboard",
        "athlete login lands on /dashboard",
        `landed on ${landed}`
      );

      await page.goto(`${BASE}/admin`, { waitUntil: "networkidle2", timeout: 45000 });
      const afterAdmin = new URL(page.url()).pathname;
      record(
        !afterAdmin.startsWith("/admin"),
        "athlete is kept out of /admin",
        `landed on ${afterAdmin}`
      );

      await page.goto(`${BASE}/coach`, { waitUntil: "networkidle2", timeout: 45000 });
      const afterCoach = new URL(page.url()).pathname;
      record(
        !afterCoach.startsWith("/coach"),
        "athlete is kept out of /coach",
        `landed on ${afterCoach}`
      );

      for (const path of ["/dashboard", "/profile", "/mis-fotos"]) {
        const response = await page.goto(`${BASE}${path}`, {
          waitUntil: "networkidle2",
          timeout: 45000,
        });
        await new Promise((r) => setTimeout(r, 800));
        record(
          (response?.status() ?? 0) < 400 &&
            new URL(page.url()).pathname === path,
          `athlete can open ${path}`,
          `status ${response?.status()}, at ${new URL(page.url()).pathname}`
        );
      }
      await context.close();
    }

    console.log("\nCoach:");
    {
      const { page, context, landed } = await loginAs(browser, COACH, PASSWORD);
      record(landed === "/coach", "coach login lands on /coach", `landed on ${landed}`);

      await page.goto(`${BASE}/admin`, { waitUntil: "networkidle2", timeout: 45000 });
      const afterAdmin = new URL(page.url()).pathname;
      record(
        !afterAdmin.startsWith("/admin"),
        "coach is kept out of /admin",
        `landed on ${afterAdmin}`
      );
      await context.close();
    }

    /**
     * Exercises the seed → ProgressEntry → chart chain end to end, which the
     * throwaway users above cannot: they have no history, so they only prove
     * the empty states work. Skipped when the demo data is absent (production
     * is seeded without `SEED_DEMO=1`).
     */
    const demoEmail = "atleta@imasport.mx";
    const demoPassword = process.env.SEED_DEMO_PASSWORD ?? ADMIN_PASSWORD;
    const demoExists = await cognito
      .send(
        new ListUsersCommand({
          UserPoolId: USER_POOL_ID,
          Filter: `email = "${demoEmail}"`,
          Limit: 1,
        })
      )
      .then((r) => (r.Users?.length ?? 0) > 0)
      .catch(() => false);

    if (!demoExists) {
      console.log("\nDatos demo: omitido (no existe atleta@imasport.mx)");
    } else {
      console.log("\nDatos demo (atleta con historial):");
      const { page, context } = await loginAs(browser, demoEmail, demoPassword);
      const problems = watch(page);

      await page.goto(`${BASE}/dashboard`, {
        waitUntil: "networkidle2",
        timeout: 45000,
      });
      await new Promise((r) => setTimeout(r, 2500));
      const body = await page.evaluate(() => document.body.innerText);

      record(
        body.includes("Carlos"),
        "dashboard greets the seeded athlete by name"
      );
      // 5 workouts were seeded into the current week, so the month cannot be 0.
      record(
        /\b[1-9]\d*\b/.test(body),
        "dashboard shows non-zero activity stats"
      );
      // Recharts renders to SVG; a chart with data has plotted paths.
      const plotted = await page.evaluate(
        () =>
          document.querySelectorAll(
            ".recharts-line-curve, .recharts-bar-rectangle, .recharts-radar-polygon, .recharts-area-area"
          ).length
      );
      record(
        plotted > 0,
        "dashboard charts plot seeded ProgressEntry data",
        `${plotted} plotted series`
      );
      record(
        problems.consoleErrors.length === 0,
        "dashboard renders without console errors",
        problems.consoleErrors.slice(0, 2).join(" | ")
      );

      await page.goto(`${BASE}/mis-fotos`, {
        waitUntil: "networkidle2",
        timeout: 45000,
      });
      await new Promise((r) => setTimeout(r, 800));
      record(
        new URL(page.url()).pathname === "/mis-fotos",
        "seeded athlete can open /mis-fotos"
      );
      await context.close();
    }
  } finally {
    await browser.close();
    await cleanup();
  }

  console.log(`\n${passed} passed, ${failures.length} failed`);
  if (failures.length) {
    console.log("\nFailures:");
    for (const failure of failures) console.log(`  - ${failure}`);
  }
  console.log("");
  process.exit(failures.length ? 1 : 0);
}

main().catch(async (error) => {
  console.error("\nE2E crashed:\n", error);
  await cleanup();
  process.exit(1);
});
