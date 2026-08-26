"use client";

import { Dumbbell, Timer, PersonStanding } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export default function ServicesSection() {
  const { t } = useI18n();

  const services = [
    {
      icon: Dumbbell,
      ...t.services.crossfit,
      image: "https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=600&q=80",
      color: "from-red-500/20 to-orange-500/20",
      borderColor: "border-red-500/30",
    },
    {
      icon: Timer,
      ...t.services.hyrox,
      image: "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=600&q=80",
      color: "from-yellow-500/20 to-amber-500/20",
      borderColor: "border-yellow-500/30",
    },
    {
      icon: PersonStanding,
      ...t.services.calistenia,
      image: "https://images.unsplash.com/photo-1598971639058-fab3c3109a00?w=600&q=80",
      color: "from-green-500/20 to-emerald-500/20",
      borderColor: "border-green-500/30",
    },
  ];

  return (
    <section id="servicios" className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black mb-4">
            {t.services.title}
          </h2>
          <p className="text-xl text-muted-foreground">{t.services.subtitle}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {services.map((service) => (
            <div
              key={service.name}
              className={`group relative overflow-hidden rounded-2xl border ${service.borderColor} bg-gradient-to-br ${service.color} p-1`}
            >
              <div className="bg-card rounded-xl overflow-hidden h-full">
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={service.image}
                    alt={service.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
                  <div className="absolute bottom-4 left-4">
                    <service.icon size={32} className="text-primary" />
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-2xl font-bold mb-3">{service.name}</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {service.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
