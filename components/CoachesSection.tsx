"use client";

import { ExternalLink } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const coaches = [
  {
    name: "Carlos Méndez",
    discipline: "CrossFit",
    image: "https://images.unsplash.com/photo-1567013127542-490d757e51fc?w=400&q=80",
    certifications: "CrossFit L3, USAW",
  },
  {
    name: "Ana Rodríguez",
    discipline: "Hyrox",
    image: "https://images.unsplash.com/photo-1594381898411-846e7d193883?w=400&q=80",
    certifications: "Hyrox Master Trainer, NSCA-CPT",
  },
  {
    name: "Miguel Torres",
    discipline: "Calistenia",
    image: "https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=400&q=80",
    certifications: "School of Calisthenics L2, FMS",
  },
  {
    name: "Laura Vega",
    discipline: "CrossFit",
    image: "https://images.unsplash.com/photo-1609899464926-209profiling?w=400&q=80",
    certifications: "CrossFit L2, Gymnastics",
  },
];

export default function CoachesSection() {
  const { t } = useI18n();

  return (
    <section id="coaches" className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black mb-4">{t.coaches.title}</h2>
          <p className="text-xl text-muted-foreground">{t.coaches.subtitle}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {coaches.map((coach) => (
            <div
              key={coach.name}
              className="group relative overflow-hidden rounded-2xl bg-card border border-border hover:border-primary/50 transition-all"
            >
              <div className="aspect-[3/4] overflow-hidden">
                <img
                  src={coach.image}
                  alt={coach.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-card via-card/20 to-transparent" />
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <h3 className="font-bold text-lg">{coach.name}</h3>
                <p className="text-primary font-medium text-sm">{coach.discipline}</p>
                <p className="text-muted-foreground text-xs mt-1">{coach.certifications}</p>
                <a
                  href="https://www.instagram.com/imasportsmx/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-2 text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  <ExternalLink size={12} />
                  @imasportsmx
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
