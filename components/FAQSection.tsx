"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import type { FaqView } from "@/lib/public-views";

export default function FAQSection({ faqs }: { faqs: FaqView[] }) {
  const { t, locale } = useI18n();
  const [openId, setOpenId] = useState<string | null>(null);

  if (faqs.length === 0) return null;

  return (
    <section className="py-24 bg-muted/50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black mb-4">
            {t.faq.title}
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((item) => {
            const question =
              locale === "en" && item.questionEn ? item.questionEn : item.question;
            const answer =
              locale === "en" && item.answerEn ? item.answerEn : item.answer;
            const open = openId === item.id;

            return (
              <div
                key={item.id}
                className="rounded-xl border border-border bg-card overflow-hidden"
              >
                <button
                  onClick={() => setOpenId(open ? null : item.id)}
                  aria-expanded={open}
                  aria-controls={`faq-${item.id}`}
                  className="w-full flex items-center justify-between p-5 text-left"
                >
                  <span className="font-bold pr-4">{question}</span>
                  <ChevronDown
                    size={20}
                    className={`flex-shrink-0 transition-transform ${
                      open ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {open && (
                  <div
                    id={`faq-${item.id}`}
                    className="px-5 pb-5 text-muted-foreground"
                  >
                    {answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
