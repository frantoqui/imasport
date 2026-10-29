import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import PlansSection from "@/components/PlansSection";
import Footer from "@/components/Footer";
import { getActivePlans } from "@/lib/public-queries";

/**
 * Server-rendered on every request.
 *
 * These pages read public content as an identity-pool guest, and Amplify
 * fetches those credentials with `no-store`, which makes the route
 * impossible to prerender — a `revalidate` here silently did nothing and the
 * build wasted a prerender pass that could only fail. Declaring the route
 * dynamic states the real behaviour.
 *
 * To make these cacheable later, the data read has to stop depending on a
 * per-request credential fetch: either Cache Components (`use cache`) or
 * API-key auth for public models.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Planes y Membresías | IMASPORT",
  description:
    "Elige la membresía que se adapta a tus objetivos: CrossFit, Hyrox y Calistenia en Morelia.",
};

export default async function PlanesPage() {
  const plans = await getActivePlans();

  return (
    <>
      <Navbar />
      <main className="pt-16">
        <PlansSection plans={plans} />
      </main>
      <Footer />
    </>
  );
}
