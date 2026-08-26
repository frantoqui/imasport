"use client";

import Link from "next/link";
import { ChevronRight, Zap } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export default function HeroSection() {
  const { t } = useI18n();

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1920&q=80')] bg-cover bg-center" />
      <div className="absolute inset-0 bg-hero-overlay" />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />

      <div className="relative z-10 max-w-5xl mx-auto px-4 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 mb-6 animate-fade-in-up">
          <Zap size={16} className="text-primary" />
          <span className="text-sm font-medium text-primary">Hyrox & CrossFit Affiliate</span>
        </div>

        <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight text-white mb-4 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
          {t.hero.title}
        </h1>

        <p className="text-xl md:text-2xl font-bold text-primary mb-6 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
          {t.hero.subtitle}
        </p>

        <p className="text-lg text-gray-300 max-w-2xl mx-auto mb-10 animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
          {t.hero.description}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up" style={{ animationDelay: "0.4s" }}>
          <Link
            href="/register"
            className="group flex items-center gap-2 px-8 py-4 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary-hover transition-all animate-pulse-glow"
          >
            {t.hero.cta}
            <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link
            href="/planes"
            className="px-8 py-4 border-2 border-white/30 text-white font-bold rounded-xl hover:bg-white/10 transition-all"
          >
            {t.hero.ctaSecondary}
          </Link>
        </div>

        <div className="mt-16 grid grid-cols-3 gap-8 max-w-md mx-auto animate-fade-in-up" style={{ animationDelay: "0.6s" }}>
          <div className="text-center">
            <div className="text-3xl font-black text-white">500+</div>
            <div className="text-sm text-gray-400">Atletas</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-black text-white">15+</div>
            <div className="text-sm text-gray-400">Coaches</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-black text-white">3</div>
            <div className="text-sm text-gray-400">Disciplinas</div>
          </div>
        </div>
      </div>
    </section>
  );
}
