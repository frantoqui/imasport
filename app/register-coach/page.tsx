"use client";

import Link from "next/link";
import { Mail, Lock, User, Phone, Award, BookOpen } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useI18n } from "@/lib/i18n";

export default function RegisterCoachPage() {
  const { t } = useI18n();

  return (
    <>
      <Navbar />
      <main className="min-h-screen flex items-center justify-center pt-20 pb-12 px-4">
        <div className="w-full max-w-lg">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Award size={28} className="text-primary-foreground" />
            </div>
            <h1 className="text-3xl font-black">{t.auth.registerCoach}</h1>
            <p className="text-muted-foreground mt-2">
              {t.coaches.subtitle}
            </p>
          </div>

          <form className="space-y-4 bg-card border border-border rounded-2xl p-8">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">{t.auth.name}</label>
                <div className="relative">
                  <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-muted border border-input focus:border-primary focus:ring-2 focus:ring-ring/20 outline-none transition-all"
                    placeholder="Nombre"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">{t.auth.phone}</label>
                <div className="relative">
                  <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="tel"
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-muted border border-input focus:border-primary focus:ring-2 focus:ring-ring/20 outline-none transition-all"
                    placeholder="+52 443..."
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">{t.auth.email}</label>
              <div className="relative">
                <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-muted border border-input focus:border-primary focus:ring-2 focus:ring-ring/20 outline-none transition-all"
                  placeholder="coach@email.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-3">{t.auth.selectDiscipline}</label>
              <div className="grid grid-cols-3 gap-2">
                {["CrossFit", "Hyrox", "Calistenia"].map((d) => (
                  <button
                    key={d}
                    type="button"
                    className="py-3 px-3 rounded-xl border border-border text-sm font-medium hover:border-primary hover:text-primary transition-colors focus:bg-primary focus:text-primary-foreground"
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">{t.auth.certifications}</label>
              <div className="relative">
                <Award size={18} className="absolute left-3 top-3 text-muted-foreground" />
                <textarea
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-muted border border-input focus:border-primary focus:ring-2 focus:ring-ring/20 outline-none transition-all resize-none"
                  rows={2}
                  placeholder="CrossFit L2, NSCA-CPT, etc."
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">{t.auth.experience}</label>
                <input
                  type="number"
                  min="0"
                  max="30"
                  className="w-full px-4 py-3 rounded-xl bg-muted border border-input focus:border-primary focus:ring-2 focus:ring-ring/20 outline-none transition-all"
                  placeholder="5"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Especialidad</label>
                <select className="w-full px-4 py-3 rounded-xl bg-muted border border-input focus:border-primary focus:ring-2 focus:ring-ring/20 outline-none transition-all">
                  <option>Fuerza</option>
                  <option>Resistencia</option>
                  <option>Técnica</option>
                  <option>Competencia</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">{t.auth.bio}</label>
              <div className="relative">
                <BookOpen size={18} className="absolute left-3 top-3 text-muted-foreground" />
                <textarea
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-muted border border-input focus:border-primary focus:ring-2 focus:ring-ring/20 outline-none transition-all resize-none"
                  rows={3}
                  placeholder="Cuéntanos sobre tu experiencia y filosofía de entrenamiento..."
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">{t.auth.password}</label>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="password"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-muted border border-input focus:border-primary focus:ring-2 focus:ring-ring/20 outline-none transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <Link
              href="/coach"
              className="block w-full text-center py-3 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary-hover transition-colors mt-6"
            >
              {t.auth.registerCoach}
            </Link>

            <p className="text-center text-sm text-muted-foreground mt-4">
              {t.auth.hasAccount}{" "}
              <Link href="/login" className="text-primary font-medium hover:underline">
                {t.auth.login}
              </Link>
            </p>
          </form>
        </div>
      </main>
    </>
  );
}
