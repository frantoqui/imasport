import { listAsGuest } from "@/lib/amplify-server";
import type { Schema } from "@/amplify/data/resource";

/**
 * Health check for the backend wiring.
 *
 * Exercises the unauthenticated server read path — the same one the public
 * marketing pages use — so a broken identity pool or AppSync config surfaces
 * here rather than as a silently empty home page.
 */
export async function GET() {
  const checks: Record<string, { ok: boolean; detail?: string }> = {};

  async function probe(name: string, run: () => Promise<number>) {
    try {
      checks[name] = { ok: true, detail: `${await run()} rows` };
    } catch (error) {
      checks[name] = { ok: false, detail: (error as Error).message };
    }
  }

  function unwrap(errors?: { message: string }[]) {
    if (errors?.length) {
      throw new Error(errors.map((e) => e.message).join("; "));
    }
  }

  await probe("guestReadPlans", async () => {
    const { data, errors } = await listAsGuest<Schema["Plan"]["type"]>(
      "Plan",
      { limit: 10 }
    );
    unwrap(errors);
    return data.length;
  });

  await probe("guestReadEvents", async () => {
    const { data, errors } = await listAsGuest<Schema["Event"]["type"]>(
      "Event",
      { limit: 10 }
    );
    unwrap(errors);
    return data.length;
  });

  const ok = Object.values(checks).every((c) => c.ok);

  return Response.json(
    { ok, checks, at: new Date().toISOString() },
    { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } }
  );
}
