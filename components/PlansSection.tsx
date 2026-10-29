"use client";

import Link from "next/link";
import { Check, Star, Tag } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import type { PlanView } from "@/lib/public-views";

/**
 * Plan cards. Name, price and features now come from the `Plan` table rather
 * than from the translation file: the Spanish fields are the source of truth
 * and the `*En` fields override them when the viewer is reading in English.
 */
export default function PlansSection({ plans }: { plans: PlanView[] }) {
  const { t, locale } = useI18n();

  return (
    <section id="planes" className="py-24 bg-muted/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black mb-4">
            {t.plans.title}
          </h2>
          <p className="text-xl text-muted-foreground">{t.plans.subtitle}</p>
        </div>

        {plans.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-6 text-center max-w-xl mx-auto">
            <Tag size={28} className="mx-auto mb-3 text-muted-foreground" />
            <p className="font-bold mb-1">
              Pronto publicaremos nuestros planes
            </p>
            <p className="text-sm text-muted-foreground">
              Escríbenos y te compartimos las membresías disponibles hoy mismo.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans.map((plan) => {
              const name =
                locale === "en" && plan.nameEn ? plan.nameEn : plan.name;
              const features =
                locale === "en" && plan.featuresEn.length > 0
                  ? plan.featuresEn
                  : plan.features;
              const { popular } = plan;

              return (
                <div
                  key={plan.id}
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
                    <h3 className="text-xl font-bold mb-2">{name}</h3>
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-4xl font-black">
                        {plan.priceLabel}
                      </span>
                      <span
                        className={`text-sm ${popular ? "opacity-80" : "text-muted-foreground"}`}
                      >
                        MXN{t.plans.perMonth}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3 mb-8">
                    <p
                      className={`text-sm font-medium ${popular ? "opacity-80" : "text-muted-foreground"}`}
                    >
                      {t.plans.features}
                    </p>
                    {features.map((feature) => (
                      <div key={feature} className="flex items-start gap-3">
                        <Check
                          size={18}
                          className={`mt-0.5 flex-shrink-0 ${popular ? "" : "text-primary"}`}
                        />
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
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
