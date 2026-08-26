"use client";

import Link from "next/link";
import { Mail, Lock, User, Phone } from "lucide-react";
import { useState } from "react";
import Navbar from "@/components/Navbar";
import { useI18n } from "@/lib/i18n";

export default function RegisterPage() {
  const { t } = useI18n();
  const [selectedPlan, setSelectedPlan] = useState("pro");

  return (
    <>
      <Navbar />
      <main className="min-h-screen flex items-center justify-center pt-20 pb-12 px-4">
        <div className="w-full max-w-lg">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-primary-foreground font-black text-xl">IM</span>
            </div>
            <h1 className="text-3xl font-black">{t.auth.register}</h1>
          </div>

          <form className="space-y-4 bg-card border border-border rounded-2xl p-8">
            <div>
              <label className="block text-sm font-medium mb-2">{t.auth.name}</label>
              <div className="relative">
                <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-muted border border-input focus:border-primary focus:ring-2 focus:ring-ring/20 outline-none transition-all"
                  placeholder="Juan Pérez"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">{t.auth.email}</label>
              <div className="relative">
                <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-muted border border-input focus:border-primary focus:ring-2 focus:ring-ring/20 outline-none transition-all"
                  placeholder="tu@email.com"
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
                  placeholder="+52 443 123 4567"
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

            <div>
              <label className="block text-sm font-medium mb-2">{t.auth.confirmPassword}</label>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="password"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-muted border border-input focus:border-primary focus:ring-2 focus:ring-ring/20 outline-none transition-all"
                  placeholder="••••••••"
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
                    className="py-2 px-3 rounded-xl border border-border text-sm font-medium hover:border-primary hover:text-primary transition-colors focus:bg-primary focus:text-primary-foreground"
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-3">Plan</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: "basic", ...t.plans.basic },
                  { key: "pro", ...t.plans.pro },
                  { key: "elite", ...t.plans.elite },
                ].map((plan) => (
                  <button
                    key={plan.key}
                    type="button"
                    onClick={() => setSelectedPlan(plan.key)}
                    className={`py-3 px-3 rounded-xl border text-sm font-medium transition-colors ${
                      selectedPlan === plan.key
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="font-bold">{plan.name}</div>
                    <div className="text-xs mt-1 opacity-70">{plan.price}</div>
                  </button>
                ))}
              </div>
            </div>

            <Link
              href="/dashboard"
              className="block w-full text-center py-3 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary-hover transition-colors mt-6"
            >
              {t.auth.register}
            </Link>

            <p className="text-center text-sm text-muted-foreground mt-4">
              {t.auth.hasAccount}{" "}
              <Link href="/login" className="text-primary font-medium hover:underline">
                {t.auth.login}
              </Link>
            </p>

            <div className="text-center pt-2 border-t border-border mt-4">
              <Link href="/register-coach" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                {t.auth.registerCoach} →
              </Link>
            </div>
          </form>
        </div>
      </main>
    </>
  );
}
