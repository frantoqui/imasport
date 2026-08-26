"use client";

import { useState } from "react";
import { Calendar, MapPin, Users, Clock, ChevronRight, Trophy, Zap } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const events = [
  {
    id: 1,
    title: "Hyrox Simulation Race",
    date: "14 Sep 2024",
    time: "8:00 AM",
    location: "IMASPORT Morelia",
    category: "Hyrox",
    spots: 30,
    spotsLeft: 8,
    image: "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=600&q=80",
    description: "Simulación completa de carrera Hyrox. 8km + 8 estaciones funcionales. Ideal para preparar tu primera competencia.",
    featured: true,
  },
  {
    id: 2,
    title: "CrossFit Open Workout",
    date: "21 Sep 2024",
    time: "9:00 AM",
    location: "IMASPORT Morelia",
    category: "CrossFit",
    spots: 40,
    spotsLeft: 15,
    image: "https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=600&q=80",
    description: "Participa en el WOD del Open. Categorías RX y Scaled. Jueces certificados.",
    featured: false,
  },
  {
    id: 3,
    title: "Calistenia Workshop: Muscle-Up",
    date: "28 Sep 2024",
    time: "10:00 AM",
    location: "IMASPORT Morelia",
    category: "Calistenia",
    spots: 20,
    spotsLeft: 5,
    image: "https://images.unsplash.com/photo-1598971639058-fab3c3109a00?w=600&q=80",
    description: "Taller intensivo de progresión al muscle-up. Desde pull-ups hasta tu primer muscle-up estricto.",
    featured: false,
  },
  {
    id: 4,
    title: "Hyrox World Championship Watch Party",
    date: "5 Oct 2024",
    time: "6:00 PM",
    location: "IMASPORT Morelia",
    category: "Hyrox",
    spots: 60,
    spotsLeft: 35,
    image: "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=600&q=80",
    description: "Ven a ver el campeonato mundial en pantalla grande. Snacks saludables y comunidad.",
    featured: false,
  },
  {
    id: 5,
    title: "Competencia Interna CrossFit",
    date: "12 Oct 2024",
    time: "8:00 AM",
    location: "IMASPORT Morelia",
    category: "CrossFit",
    spots: 50,
    spotsLeft: 22,
    image: "https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=600&q=80",
    description: "Torneo interno por equipos de 3. Categorías mixtas. Premios para los primeros lugares.",
    featured: false,
  },
];

const categoryColors: Record<string, string> = {
  CrossFit: "bg-red-500/10 text-red-500 border-red-500/30",
  Hyrox: "bg-yellow-500/10 text-yellow-500 border-yellow-500/30",
  Calistenia: "bg-green-500/10 text-green-500 border-green-500/30",
};

export default function EventsSection() {
  const { t } = useI18n();
  const [filter, setFilter] = useState<string>("all");

  const filteredEvents =
    filter === "all" ? events : events.filter((e) => e.category === filter);

  const featured = events.find((e) => e.featured);

  return (
    <section id="eventos" className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-black mb-4">
            {t.events.title}
          </h2>
          <p className="text-xl text-muted-foreground">{t.events.subtitle}</p>
        </div>

        {/* Featured Event */}
        {featured && (
          <div className="relative overflow-hidden rounded-2xl mb-12 border border-primary/20">
            <div className="absolute inset-0">
              <img
                src={featured.image}
                alt={featured.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent" />
            </div>
            <div className="relative p-8 md:p-12 max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 border border-primary/30 mb-4">
                <Trophy size={14} className="text-primary" />
                <span className="text-xs font-bold text-primary uppercase">{t.events.featured}</span>
              </div>
              <h3 className="text-3xl font-black mb-3">{featured.title}</h3>
              <p className="text-muted-foreground mb-4">{featured.description}</p>
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-6">
                <span className="flex items-center gap-1">
                  <Calendar size={14} /> {featured.date}
                </span>
                <span className="flex items-center gap-1">
                  <Clock size={14} /> {featured.time}
                </span>
                <span className="flex items-center gap-1">
                  <Users size={14} /> {featured.spotsLeft} {t.events.spotsLeft}
                </span>
              </div>
              <button className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary-hover transition-colors">
                {t.events.register}
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
          {["all", "CrossFit", "Hyrox", "Calistenia"].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
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

        {/* Events Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents
            .filter((e) => !e.featured)
            .map((event) => (
              <div
                key={event.id}
                className="bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/30 transition-all group"
              >
                <div className="relative h-40 overflow-hidden">
                  <img
                    src={event.image}
                    alt={event.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3 left-3">
                    <span
                      className={`px-2 py-1 rounded-lg text-xs font-bold border ${categoryColors[event.category]}`}
                    >
                      {event.category}
                    </span>
                  </div>
                </div>
                <div className="p-5">
                  <h4 className="font-bold text-lg mb-2">{event.title}</h4>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {event.description}
                  </p>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mb-4">
                    <span className="flex items-center gap-1">
                      <Calendar size={12} /> {event.date}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={12} /> {event.time}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin size={12} /> {event.location}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-sm">
                      <Users size={14} className="text-primary" />
                      <span className="font-medium text-primary">{event.spotsLeft}</span>
                      <span className="text-muted-foreground">/ {event.spots}</span>
                    </div>
                    <button className="flex items-center gap-1 px-4 py-2 bg-primary text-primary-foreground text-sm font-bold rounded-xl hover:bg-primary-hover transition-colors">
                      {t.events.register}
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>
    </section>
  );
}
