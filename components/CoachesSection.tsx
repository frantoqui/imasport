"use client";

import { ExternalLink, UserRound } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import type { CoachView } from "@/lib/public-views";

export default function CoachesSection({ coaches }: { coaches: CoachView[] }) {
  const { t } = useI18n();

  return (
    <section id="coaches" className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black mb-4">
            {t.coaches.title}
          </h2>
          <p className="text-xl text-muted-foreground">{t.coaches.subtitle}</p>
        </div>

        {coaches.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-6 text-center max-w-xl mx-auto">
            <UserRound size={28} className="mx-auto mb-3 text-muted-foreground" />
            <p className="font-bold mb-1">
              Pronto publicaremos a nuestro equipo
            </p>
            <p className="text-sm text-muted-foreground">
              Estamos preparando los perfiles de nuestros coaches certificados.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {coaches.map((coach) => (
              <div
                key={coach.id}
                className="group relative overflow-hidden rounded-2xl bg-card border border-border hover:border-primary/50 transition-all"
              >
                <div className="aspect-[3/4] overflow-hidden">
                  {coach.imageSrc ? (
                    <img
                      src={coach.imageSrc}
                      alt={coach.name}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                      <span className="text-4xl font-black text-muted-foreground">
                        {coach.name.slice(0, 1).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-card via-card/20 to-transparent" />
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h3 className="font-bold text-lg">{coach.name}</h3>
                  {coach.discipline ? (
                    <p className="text-primary font-medium text-sm">
                      {coach.discipline}
                    </p>
                  ) : null}
                  {coach.certifications ? (
                    <p className="text-muted-foreground text-xs mt-1">
                      {coach.certifications}
                    </p>
                  ) : null}
                  <a
                    href={coach.instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-2 text-xs text-muted-foreground hover:text-primary transition-colors"
                  >
                    <ExternalLink size={12} />
                    {coach.instagramHandle}
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
