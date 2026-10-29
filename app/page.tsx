import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import ServicesSection from "@/components/ServicesSection";
import PlansSection from "@/components/PlansSection";
import CoachesSection from "@/components/CoachesSection";
import EventsSection from "@/components/EventsSection";
import FAQSection from "@/components/FAQSection";
import Footer from "@/components/Footer";
import {
  getActivePlans,
  getFeaturedEvent,
  getHeroContent,
  getPublishedCoaches,
  getPublishedEvents,
  getPublishedFaqs,
} from "@/lib/public-queries";

/**
 * The home page is a Server Component: every section's content is read here as
 * a guest (no cookies, so the page stays cacheable) and handed down as props.
 * Only the interactive bits — the events filter, the FAQ accordion — remain
 * client components.
 */
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

/** How many events the home page shows before linking to /eventos. */
const HOME_EVENT_LIMIT = 6;

export default async function Home() {
  const [hero, plans, coaches, events, featured, faqs] = await Promise.all([
    getHeroContent(),
    getActivePlans(),
    getPublishedCoaches(),
    getPublishedEvents(),
    getFeaturedEvent(),
    getPublishedFaqs(),
  ]);

  const upcoming = events.filter((event) => !event.isPast);
  const highlighted = upcoming.length > 0 ? upcoming : events;

  return (
    <>
      <Navbar />
      <main>
        <HeroSection hero={hero} />
        <ServicesSection />
        <PlansSection plans={plans} />
        <CoachesSection coaches={coaches} />
        <EventsSection
          events={highlighted.slice(0, HOME_EVENT_LIMIT)}
          featured={featured}
          showAllLink={events.length > 0}
        />
        <FAQSection faqs={faqs} />
      </main>
      <Footer />
    </>
  );
}
