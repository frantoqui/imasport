"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Calendar,
  CalendarOff,
  ChevronRight,
  Clock,
  MapPin,
  Trophy,
  Users,
} from "lucide-react";
import EventRegisterButton from "@/components/EventRegisterButton";
import { useI18n } from "@/lib/i18n";
import type { Discipline, EventView } from "@/lib/public-views";

/**
 * The home-page events section. The data arrives already formatted from the
 * Server Component; the only thing that needs to live on the client is the
 * category filter.
 */

const CATEGORY_COLORS: Record<Discipline, string> = {
  CrossFit: "bg-red-500/10 text-red-500 border-red-500/30",
  Hyrox: "bg-yellow-500/10 text-yellow-500 border-yellow-500/30",
  Calistenia: "bg-green-500/10 text-green-500 border-green-500/30",
};

const FILTERS: Array<"all" | Discipline> = [
  "all",
  "CrossFit",
  "Hyrox",
  "Calistenia",
];

function spotsLabel(event: EventView): string {
  if (event.spotsLeft === null) return "Lugares disponibles";
  if (event.spotsLeft === 0) return "Agotado";
  return `${event.spotsLeft} de ${event.spots}`;
}

export default function EventsSection({
  events,
  featured = null,
  /** Shown under the grid when there are more events than we display here. */
  showAllLink = true,
}: {
  events: EventView[];
  featured?: EventView | null;
  showAllLink?: boolean;
}) {
  const { t } = useI18n();
  const [filter, setFilter] = useState<"all" | Discipline>("all");

  const inGrid = events.filter((event) => event.id !== featured?.id);
  const visible =
    filter === "all"
      ? inGrid
      : inGrid.filter((event) => event.category === filter);

  return (
    <section id="eventos" className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-black mb-4">
            {t.events.title}
          </h2>
          <p className="text-xl text-muted-foreground">{t.events.subtitle}</p>
        </div>

        {!featured && events.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-6 text-center">
            <CalendarOff
              size={28}
              className="mx-auto mb-3 text-muted-foreground"
            />
            <p className="font-bold mb-1">Pronto publicaremos nuevos eventos</p>
            <p className="text-sm text-muted-foreground">
              Estamos preparando la siguiente temporada de competencias y
              talleres. Vuelve pronto.
            </p>
          </div>
        ) : null}

        {/* Featured Event */}
        {featured && (
          <div className="relative overflow-hidden rounded-2xl mb-12 border border-primary/20">
            <div className="absolute inset-0">
              {featured.imageSrc ? (
                <img
                  src={featured.imageSrc}
                  alt={featured.title}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-muted" />
              )}
              <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent" />
            </div>
            <div className="relative p-8 md:p-12 max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 border border-primary/30 mb-4">
                <Trophy size={14} className="text-primary" />
                <span className="text-xs font-bold text-primary uppercase">
                  {t.events.featured}
                </span>
              </div>
              <h3 className="text-3xl font-black mb-3">
                <Link href={featured.href} className="hover:text-primary transition-colors">
                  {featured.title}
                </Link>
              </h3>
              {featured.description ? (
                <p className="text-muted-foreground mb-4 line-clamp-3">
                  {featured.description}
                </p>
              ) : null}
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-6">
                <span className="flex items-center gap-1">
                  <Calendar size={14} /> {featured.dateLabel}
                </span>
                {featured.time ? (
                  <span className="flex items-center gap-1">
                    <Clock size={14} /> {featured.time}
                  </span>
                ) : null}
                <span className="flex items-center gap-1">
                  <Users size={14} />{" "}
                  {featured.isFull
                    ? "Agotado"
                    : `${featured.spotsLeft ?? ""} ${t.events.spotsLeft}`.trim()}
                </span>
              </div>
              <EventRegisterButton
                eventId={featured.id}
                isFull={featured.isFull}
                isPast={featured.isPast}
              />
            </div>
          </div>
        )}

        {/* Filter Tabs */}
        {inGrid.length > 0 && (
          <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
            {FILTERS.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                aria-pressed={filter === cat}
                className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                  filter === cat
                    ? "bg-primary text-primary-foreground"
                    : "bg-card border border-border hover:border-primary/50"
                }`}
              >
                {cat === "all" ? t.events.all : cat}
              </button>
            ))}
          </div>
        )}

        {/* Events Grid */}
        {inGrid.length > 0 && visible.length === 0 ? (
          <p className="text-muted-foreground">
            No hay eventos de esta disciplina por ahora.
          </p>
        ) : null}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visible.map((event) => (
            <div
              key={event.id}
              className="bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/30 transition-all group"
            >
              <Link href={event.href} className="block relative h-40 overflow-hidden">
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
                <h4 className="font-bold text-lg mb-2">
                  <Link href={event.href} className="hover:text-primary transition-colors">
                    {event.title}
                  </Link>
                </h4>
                {event.description ? (
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {event.description}
                  </p>
                ) : null}
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mb-4">
                  <span className="flex items-center gap-1">
                    <Calendar size={12} /> {event.dateLabel}
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
                  <div className="flex items-center gap-1 text-sm">
                    <Users size={14} className="text-primary" />
                    <span
                      className={
                        event.isFull
                          ? "font-medium text-muted-foreground"
                          : "font-medium text-primary"
                      }
                    >
                      {spotsLabel(event)}
                    </span>
                  </div>
                  <Link
                    href={event.href}
                    className="flex items-center gap-1 px-4 py-2 bg-primary text-primary-foreground text-sm font-bold rounded-xl hover:bg-primary-hover transition-colors"
                  >
                    {event.isFull ? "Lista de espera" : t.events.register}
                    <ChevronRight size={14} />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        {showAllLink && events.length > 0 && (
          <div className="mt-10 text-center">
            <Link
              href="/eventos"
              className="inline-flex items-center gap-2 px-6 py-3 border border-border rounded-xl font-bold hover:border-primary/50 transition-colors"
            >
              Ver todos los eventos
              <ChevronRight size={16} />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
