"use client";

import Link from "next/link";
import { Check, Star } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export default function PlansSection() {
  const { t } = useI18n();

  const plans = [
    { data: t.plans.basic, popular: false },
    { data: t.plans.pro, popular: true },
    { data: t.plans.elite, popular: false },
  ];

  return (
    <section id="planes" className="py-24 bg-muted/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black mb-4">{t.plans.title}</h2>
          <p className="text-xl text-muted-foreground">{t.plans.subtitle}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map(({ data, popular }) => (
            <div
              key={data.name}
              className={`relative rounded-2xl p-8 ${
                popular
                  ? "bg-primary text-primary-foreground scale-105 shadow-2xl shadow-primary/20"
                  : "bg-card border border-border"
              }`}
            >
              {popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 flex items-center gap-1 px-4 py-1 bg-accent text-accent-foreground text-sm font-bold rounded-full">
                  <Star size={14} />
                  {t.plans.popular}
                </div>
              )}

              <div className="text-center mb-8">
                <h3 className="text-xl font-bold mb-2">{data.name}</h3>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-4xl font-black">{data.price}</span>
                  <span className={`text-sm ${popular ? "opacity-80" : "text-muted-foreground"}`}>
                    MXN{t.plans.perMonth}
                  </span>
                </div>
              </div>

              <div className="space-y-3 mb-8">
                <p className={`text-sm font-medium ${popular ? "opacity-80" : "text-muted-foreground"}`}>
                  {t.plans.features}
                </p>
                {data.features.map((feature) => (
                  <div key={feature} className="flex items-start gap-3">
                    <Check size={18} className={`mt-0.5 flex-shrink-0 ${popular ? "" : "text-primary"}`} />
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}
              </div>

              <Link
                href="/register"
                className={`block w-full text-center py-3 rounded-xl font-bold transition-colors ${
                  popular
                    ? "bg-white text-primary-hover hover:bg-gray-100"
                    : "bg-primary text-primary-foreground hover:bg-primary-hover"
                }`}
              >
                {t.plans.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
