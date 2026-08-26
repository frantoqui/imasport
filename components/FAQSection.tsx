"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export default function FAQSection() {
  const { t } = useI18n();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="py-24 bg-muted/50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black mb-4">{t.faq.title}</h2>
        </div>

        <div className="space-y-3">
          {t.faq.items.map((item, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-border bg-card overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
                className="w-full flex items-center justify-between p-5 text-left"
              >
                <span className="font-bold pr-4">{item.q}</span>
                <ChevronDown
                  size={20}
                  className={`flex-shrink-0 transition-transform ${
                    openIndex === idx ? "rotate-180" : ""
                  }`}
                />
              </button>
              {openIndex === idx && (
                <div className="px-5 pb-5 text-muted-foreground">
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
