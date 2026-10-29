/**
 * End-to-end test of the S3 upload paths.
 *
 * These were the last untested surfaces: every other suite exercises data
 * writes, but nothing had ever actually put a file in the bucket. Uploads are
 * also the one browser feature that genuinely needs identity-pool
 * credentials, so they fail in a way nothing else does when Cognito throttles.
 *
 * Covers the coach photographing an athlete (athlete-photos/), and then reads
 * the file back through /api/media as the athlete to prove the authorizing
 * gateway serves it.
 *
 *   npm run dev
 *   SEED_ADMIN_PASSWORD='...' npx tsx scripts/e2e-upload.ts
 *
 * Needs the demo accounts (SEED_DEMO=1 npm run seed).
 */
import { readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import puppeteer, { type Browser, type Page } from "puppeteer";
import { Amplify } from "aws-amplify";
import { signIn, signOut } from "aws-amplify/auth";
import { cognitoUserPoolsTokenProvider } from "aws-amplify/auth/cognito";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "../amplify/data/resource";

const BASE = (process.env.E2E_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const outputs = JSON.parse(readFileSync("amplify_outputs.json", "utf8"));

const COACH_EMAIL = "coach@imasport.mx";
const ATHLETE_EMAIL = "atleta@imasport.mx";
const ATHLETE_NAME = "Carlos";

const ADMIN_PASSWORD = (() => {
  const v = process.env.SEED_ADMIN_PASSWORD;
  if (!v) {
    console.error("\nSEED_ADMIN_PASSWORD is not set.\n");
    process.exit(1);
  }
  return v;
})();
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

let passed = 0;
const failures: string[] = [];
let throttled = 0;
function record(ok: boolean, label: string, detail = "") {
  if (ok) {
    passed += 1;
    console.log(`  PASS  ${label}`);
  } else {
    failures.push(`${label}${detail ? ` — ${detail}` : ""}`);
    console.log(`  FAIL  ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

const stamp = Date.now();
const CAPTION = `e2e-upload-${stamp}`;

/** Smallest valid PNG, so the test does not ship a binary fixture. */
const PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAJ0lEQVR42mNk" +
  "YPhfz0BNwDiqYVTDqIZRDaMaRjWMahjVMKphVAMAAFcwB/9mSG0aAAAAAElFTkSuQmCC";

async function loginThrough(browser: Browser, email: string, password: string) {
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  await page.setViewport({ width: 1500, height: 1000 });
  page.on("response", (r) => {
    if (r.status() === 400 && /cognito-identity/i.test(r.url())) throttled += 1;
  });
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

async function setRating(page: Page, label: string, value: number) {
  const selector = `button[aria-label="${label}: ${value}"]`;
  await page.waitForSelector(selector, { timeout: 20000 });
  await page.click(selector);
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
  console.log(`\nIMASPORT uploads  (${BASE})\n`);

  const fixture = join(tmpdir(), `imasport-e2e-${stamp}.png`);
  writeFileSync(fixture, Buffer.from(PNG_BASE64, "base64"));

  const browser = await puppeteer.launch({
    headless: process.env.E2E_HEADFUL !== "1",
    args: ["--no-sandbox"],
  });

  try {
    console.log("Coach sube una foto del atleta:");
    const coach = await loginThrough(browser, COACH_EMAIL, DEMO_PASSWORD);
    const page = coach.page;
    record(coach.landed === "/coach", "coach lands on /coach", coach.landed);

    await page.goto(`${BASE}/coach`, { waitUntil: "networkidle2", timeout: 60000 });
    await new Promise((r) => setTimeout(r, 2000));

    await page.waitForSelector('input[aria-label="Buscar atleta"]', { timeout: 30000 });
    await page.type('input[aria-label="Buscar atleta"]', ATHLETE_NAME, { delay: 20 });
    await new Promise((r) => setTimeout(r, 900));
    const picked = await clickButtonContaining(page, ATHLETE_NAME);
    record(picked, `coach can select the athlete "${ATHLETE_NAME}"`);

    await page.waitForSelector("#eval-discipline", { timeout: 30000 });
    await page.select("#eval-discipline", "CrossFit");
    await setRating(page, "Rendimiento", 7);
    await setRating(page, "Técnica", 7);
    await setRating(page, "Esfuerzo", 7);

    // Attach the file to the hidden input the camera button triggers.
    const input = await page.$('input[type="file"][accept="image/*"]');
    record(Boolean(input), "coach panel exposes a camera/file input");
    if (!input) throw new Error("no file input");
    await input.uploadFile(fixture);

    // The component uploads immediately and shows a thumbnail when done.
    const uploaded = await page
      .waitForFunction(
        () =>
          !/Subiendo fotos/i.test(document.body.innerText) &&
          document.querySelectorAll('img[alt=""], img[src^="blob:"], img[src*="/api/media/"]').length > 0,
        { timeout: 90000 }
      )
      .then(() => true)
      .catch(() => false);
    record(uploaded, "photo uploads to S3 and a preview appears");

    await page.waitForSelector("#eval-caption", { timeout: 20000 });
    await page.type("#eval-caption", CAPTION, { delay: 5 });
    await page.waitForSelector("#eval-notes", { timeout: 20000 });
    await page.type("#eval-notes", CAPTION, { delay: 5 });

    await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll("button")).find((x) =>
        (x.textContent ?? "").includes("Guardar Evaluación")
      );
      (b as HTMLButtonElement | undefined)?.click();
    });
    const saved = await page
      .waitForFunction(() => /guardad|exitosa|correctamente/i.test(document.body.innerText), {
        timeout: 60000,
      })
      .then(() => true)
      .catch(() => false);
    record(saved, "evaluation with the photo saves");
    await coach.context.close();

    // ---- Did the row and the object really land? -----------------------
    console.log("\nVerificación en el backend:");
    await signOut().catch(() => {});
    const admin = await signIn({
      username: process.env.SEED_ADMIN_EMAIL ?? "admin@imasport.mx",
      password: ADMIN_PASSWORD,
    });
    if (!admin.isSignedIn) throw new Error("admin sign-in failed");

    let token: string | null = null;
    let pages = 0;
    const photos: Array<{ key: string; caption: string | null; athleteId: string }> = [];
    do {
      const batch = (await api.models.AthletePhoto.list({
        limit: 500,
        nextToken: token,
      })) as {
        data: Array<{ key: string; caption: string | null; athleteId: string }> | null;
        nextToken?: string | null;
      };
      photos.push(...(batch.data ?? []));
      token = batch.nextToken ?? null;
      pages += 1;
    } while (token && pages < 50);

    const mine = photos.find((p) => p.caption === CAPTION);
    record(Boolean(mine), "AthletePhoto row created with the coach's caption");
    record(
      Boolean(mine?.key?.startsWith("athlete-photos/")),
      "photo stored under the private athlete-photos/ prefix",
      mine?.key ?? "no key"
    );
    await signOut().catch(() => {});

    // ---- Can the athlete actually see it? ------------------------------
    console.log("\nEl atleta la ve:");
    const athlete = await loginThrough(browser, ATHLETE_EMAIL, DEMO_PASSWORD);
    await athlete.page.goto(`${BASE}/mis-fotos`, {
      waitUntil: "networkidle2",
      timeout: 60000,
    });
    await new Promise((r) => setTimeout(r, 2500));
    const body = await athlete.page.evaluate(() => document.body.innerText);
    record(body.includes(CAPTION), "the caption shows on /mis-fotos");

    // Fetch the image through the gateway using the athlete's own session.
    if (mine?.key) {
      const status = await athlete.page.evaluate(async (key: string) => {
        const encoded = key.split("/").map(encodeURIComponent).join("/");
        const response = await fetch(`/api/media/${encoded}`, {
          redirect: "follow",
        });
        return response.status;
      }, mine.key);
      record(
        status === 200,
        "athlete can load the image through /api/media",
        `status ${status}`
      );
    }
    await athlete.context.close();

    /**
     * Avatar upload, by the athlete themselves.
     *
     * This is the only path that relies on entity-scoped S3 access
     * (`avatars/{entity_id}/*`), which is granted differently from the group
     * rules everything else uses — so it needs its own check rather than
     * being assumed to work because the coach's upload does.
     */
    console.log("\nEl atleta sube su foto de perfil:");
    {
      const athleteProfile = await loginThrough(
        browser,
        ATHLETE_EMAIL,
        DEMO_PASSWORD
      );
      const page = athleteProfile.page;
      await page.goto(`${BASE}/profile`, {
        waitUntil: "networkidle2",
        timeout: 60000,
      });
      await new Promise((r) => setTimeout(r, 2000));

      const avatarInput = await page.$('input[type="file"][accept="image/*"]');
      record(Boolean(avatarInput), "profile exposes an avatar file input");

      if (avatarInput) {
        await avatarInput.uploadFile(fixture);
        const done = await page
          .waitForFunction(
            () =>
              !/Subiendo|Cargando/i.test(document.body.innerText) &&
              !/error|no se pudo|falló/i.test(document.body.innerText),
            { timeout: 90000 }
          )
          .then(() => true)
          .catch(() => false);
        const text = await page.evaluate(() => document.body.innerText);
        record(
          done,
          "avatar uploads to the entity-scoped avatars/ prefix",
          done ? "" : text.replace(/\s+/g, " ").slice(0, 200)
        );

        // Confirm it was actually recorded on the profile, not just previewed.
        await signOut().catch(() => {});
        const adminAgain = await signIn({
          username: process.env.SEED_ADMIN_EMAIL ?? "admin@imasport.mx",
          password: ADMIN_PASSWORD,
        });
        if (adminAgain.isSignedIn) {
          const profiles = (await api.models.UserProfile.list({
            limit: 500,
          })) as { data: Array<{ email: string; avatarKey: string | null }> | null };
          const row = (profiles.data ?? []).find(
            (p) => p.email === ATHLETE_EMAIL
          );
          record(
            Boolean(row?.avatarKey?.startsWith("avatars/")),
            "UserProfile.avatarKey points at the uploaded object",
            row?.avatarKey ?? "no avatarKey"
          );
        }
        await signOut().catch(() => {});
      }
      await athleteProfile.context.close();
    }

    // A logged-out visitor must not be able to fetch a private photo.
    if (mine?.key) {
      const anon = await browser.createBrowserContext();
      const anonPage = await anon.newPage();
      await anonPage.goto(`${BASE}/login`, { waitUntil: "domcontentloaded", timeout: 60000 });
      const status = await anonPage.evaluate(async (key: string) => {
        const encoded = key.split("/").map(encodeURIComponent).join("/");
        const response = await fetch(`/api/media/${encoded}`, { redirect: "manual" });
        return response.status;
      }, mine.key);
      record(
        status === 403,
        "an anonymous visitor is refused the private photo",
        `status ${status}`
      );
      await anon.close();
    }
  } finally {
    await browser.close();
    rmSync(fixture, { force: true });
    await signOut().catch(() => {});
  }

  if (throttled > 0) {
    console.log(
      `\nAviso: Cognito limitó ${throttled} petición(es) de credenciales. ` +
        "Las subidas a S3 dependen de esas credenciales, así que un fallo de " +
        "subida aquí puede ser la cuota y no el código."
    );
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
  console.error("\nUpload test crashed:\n", error);
  process.exit(1);
});
