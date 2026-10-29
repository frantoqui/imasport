import type { Metadata } from "next";
import Link from "next/link";
import {
  Calendar,
  CalendarOff,
  ChevronRight,
  Clock,
  MapPin,
  Users,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getPublishedEvents } from "@/lib/public-queries";
import type { Discipline, EventView } from "@/lib/public-views";

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
  title: "Eventos y Competencias | IMASPORT",
  description:
    "Competencias, simulaciones Hyrox y talleres de calistenia en IMASPORT Morelia. Consulta las fechas e inscríbete.",
};

const CATEGORY_COLORS: Record<Discipline, string> = {
  CrossFit: "bg-red-500/10 text-red-500 border-red-500/30",
  Hyrox: "bg-yellow-500/10 text-yellow-500 border-yellow-500/30",
  Calistenia: "bg-green-500/10 text-green-500 border-green-500/30",
};

function EventCard({ event }: { event: EventView }) {
  return (
    <article
      className={`bg-card border border-border rounded-2xl overflow-hidden transition-all group ${
        event.isPast ? "opacity-75" : "hover:border-primary/30"
      }`}
    >
      <Link href={event.href} className="block relative h-44 overflow-hidden">
        {event.imageSrc ? (
          <img
            src={event.imageSrc}
            alt={event.title}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <Calendar size={28} className="text-muted-foreground" />
          </div>
        )}
        {event.category ? (
          <span
            className={`absolute top-3 left-3 px-2 py-1 rounded-lg text-xs font-bold border ${CATEGORY_COLORS[event.category]}`}
          >
            {event.category}
          </span>
        ) : null}
      </Link>

      <div className="p-5">
        <h2 className="font-bold text-lg mb-2">
          <Link href={event.href} className="hover:text-primary transition-colors">
            {event.title}
          </Link>
        </h2>
        {event.description ? (
          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
            {event.description}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mb-4">
          <span className="flex items-center gap-1">
            <Calendar size={12} />
            <time dateTime={event.date}>{event.dateLabel}</time>
          </span>
          {event.time ? (
            <span className="flex items-center gap-1">
              <Clock size={12} /> {event.time}
            </span>
          ) : null}
          {event.location ? (
            <span className="flex items-center gap-1">
              <MapPin size={12} /> {event.location}
            </span>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1 text-sm">
            <Users size={14} className="text-primary" />
            <span
              className={
                event.isFull
                  ? "font-medium text-muted-foreground"
                  : "font-medium text-primary"
              }
            >
              {event.spotsLeft === null
                ? "Lugares disponibles"
                : event.spotsLeft === 0
                  ? "Agotado"
                  : `${event.spotsLeft} de ${event.spots}`}
            </span>
          </span>
          <Link
            href={event.href}
            className="flex items-center gap-1 px-4 py-2 bg-primary text-primary-foreground text-sm font-bold rounded-xl hover:bg-primary-hover transition-colors"
          >
            {event.isPast ? "Ver evento" : "Ver detalles"}
            <ChevronRight size={14} />
          </Link>
        </div>
      </div>
    </article>
  );
}

export default async function EventosPage() {
  const events = await getPublishedEvents();
  const upcoming = events.filter((event) => !event.isPast);
  const past = events.filter((event) => event.isPast);

  return (
    <>
      <Navbar />
      <main className="pt-16">
        <section className="py-16 bg-background">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-black mb-4">
                Eventos y Competencias
              </h1>
              <p className="text-xl text-muted-foreground">
                Pon a prueba tu entrenamiento en nuestros eventos exclusivos
              </p>
            </div>

            {events.length === 0 ? (
              <div className="bg-card border border-border rounded-2xl p-6 text-center max-w-xl mx-auto">
                <CalendarOff
                  size={28}
                  className="mx-auto mb-3 text-muted-foreground"
                />
                <p className="font-bold mb-1">
                  Pronto publicaremos nuevos eventos
                </p>
                <p className="text-sm text-muted-foreground">
                  Estamos preparando la siguiente temporada. Síguenos para
                  enterarte primero.
                </p>
              </div>
            ) : null}

            {upcoming.length > 0 ? (
              <>
                <h2 className="text-2xl font-black mb-6">Próximos</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {upcoming.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
              </>
            ) : null}

            {past.length > 0 ? (
              <>
                <h2 className="text-2xl font-black mt-16 mb-6">Anteriores</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {past.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
              </>
            ) : null}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
