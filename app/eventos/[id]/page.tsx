import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Images,
  MapPin,
  Tag,
  Users,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import EventRegisterButton from "@/components/EventRegisterButton";
import AlbumCard from "@/components/gallery/AlbumCard";
import { getEvent, getEventAlbums } from "@/lib/public-queries";
import type { Discipline } from "@/lib/public-views";

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

const CATEGORY_COLORS: Record<Discipline, string> = {
  CrossFit: "bg-red-500/10 text-red-500 border-red-500/30",
  Hyrox: "bg-yellow-500/10 text-yellow-500 border-yellow-500/30",
  Calistenia: "bg-green-500/10 text-green-500 border-green-500/30",
};

export async function generateMetadata(
  props: PageProps<"/eventos/[id]">
): Promise<Metadata> {
  const { id } = await props.params;
  const event = await getEvent(id);
  if (!event) return { title: "Evento no encontrado | IMASPORT" };

  return {
    title: `${event.title} | IMASPORT`,
    description:
      event.description ??
      `${event.title} — ${event.dateLongLabel}${event.location ? ` en ${event.location}` : ""}.`,
  };
}

export default async function EventoPage(props: PageProps<"/eventos/[id]">) {
  const { id } = await props.params;
  const event = await getEvent(id);
  if (!event) notFound();

  const albums = await getEventAlbums(event.id);

  return (
    <>
      <Navbar />
      <main className="pt-16">
        {/* Cover */}
        <div className="relative h-64 md:h-96 overflow-hidden bg-muted">
          {event.imageSrc ? (
            <img
              src={event.imageSrc}
              alt={event.title}
              decoding="async"
              className="w-full h-full object-cover"
            />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
          <div className="absolute inset-x-0 bottom-0">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
              <Link
                href="/eventos"
                className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors mb-4"
              >
                <ArrowLeft size={14} />
                Todos los eventos
              </Link>
              <div className="flex flex-wrap items-center gap-3 mb-3">
                {event.category ? (
                  <span
                    className={`px-2 py-1 rounded-lg text-xs font-bold border ${CATEGORY_COLORS[event.category]}`}
                  >
                    {event.category}
                  </span>
                ) : null}
                {event.isPast ? (
                  <span className="px-2 py-1 rounded-lg text-xs font-bold border border-border bg-card text-muted-foreground">
                    Evento pasado
                  </span>
                ) : null}
              </div>
              <h1 className="text-3xl md:text-5xl font-black">{event.title}</h1>
            </div>
          </div>
        </div>

        <section className="py-12">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Description */}
            <div className="lg:col-span-2">
              <h2 className="text-xl font-bold mb-3">Sobre el evento</h2>
              {event.description ? (
                <div className="text-muted-foreground leading-relaxed whitespace-pre-line">
                  {event.description}
                </div>
              ) : (
                <p className="text-muted-foreground">
                  Pronto publicaremos los detalles completos de este evento.
                </p>
              )}
            </div>

            {/* Facts + registration */}
            <aside className="bg-card border border-border rounded-2xl p-6 h-fit">
              <dl className="space-y-4 mb-6">
                <div className="flex items-start gap-3">
                  <Calendar size={18} className="mt-0.5 text-primary" />
                  <div>
                    <dt className="text-xs text-muted-foreground">Fecha</dt>
                    <dd className="font-medium">
                      <time dateTime={event.date}>{event.dateLongLabel}</time>
                    </dd>
                  </div>
                </div>

                {event.time ? (
                  <div className="flex items-start gap-3">
                    <Clock size={18} className="mt-0.5 text-primary" />
                    <div>
                      <dt className="text-xs text-muted-foreground">Horario</dt>
                      <dd className="font-medium">{event.time}</dd>
                    </div>
                  </div>
                ) : null}

                {event.location ? (
                  <div className="flex items-start gap-3">
                    <MapPin size={18} className="mt-0.5 text-primary" />
                    <div>
                      <dt className="text-xs text-muted-foreground">Lugar</dt>
                      <dd className="font-medium">{event.location}</dd>
                    </div>
                  </div>
                ) : null}

                <div className="flex items-start gap-3">
                  <Users size={18} className="mt-0.5 text-primary" />
                  <div>
                    <dt className="text-xs text-muted-foreground">Lugares</dt>
                    <dd className="font-medium">
                      {event.spotsLeft === null
                        ? "Sin cupo límite"
                        : event.spotsLeft === 0
                          ? "Agotado"
                          : `${event.spotsLeft} disponibles de ${event.spots}`}
                    </dd>
                  </div>
                </div>

                {event.priceLabel ? (
                  <div className="flex items-start gap-3">
                    <Tag size={18} className="mt-0.5 text-primary" />
                    <div>
                      <dt className="text-xs text-muted-foreground">Costo</dt>
                      <dd className="font-medium">{event.priceLabel}</dd>
                    </div>
                  </div>
                ) : null}
              </dl>

              <EventRegisterButton
                eventId={event.id}
                isFull={event.isFull}
                isPast={event.isPast}
              />
            </aside>
          </div>
        </section>

        {/* Event gallery */}
        {albums.length > 0 ? (
          <section className="py-12 bg-muted/50">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
              <h2 className="flex items-center gap-2 text-2xl font-black mb-6">
                <Images size={22} className="text-primary" />
                Galería del evento
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {albums.map((album) => (
                  <AlbumCard key={album.id} album={album} />
                ))}
              </div>
            </div>
          </section>
        ) : null}
      </main>
      <Footer />
    </>
  );
}
