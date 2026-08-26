"use client";

import Link from "next/link";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import Navbar from "@/components/Navbar";
import { useI18n } from "@/lib/i18n";

export default function LoginPage() {
  const { t } = useI18n();
  const [showPassword, setShowPassword] = useState(false);

  return (
    <>
      <Navbar />
      <main className="min-h-screen flex items-center justify-center pt-16 px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-primary-foreground font-black text-xl">IM</span>
            </div>
            <h1 className="text-3xl font-black">{t.auth.login}</h1>
          </div>

          <form className="space-y-4 bg-card border border-border rounded-2xl p-8">
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
              <label className="block text-sm font-medium mb-2">{t.auth.password}</label>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type={showPassword ? "text" : "password"}
                  className="w-full pl-10 pr-12 py-3 rounded-xl bg-muted border border-input focus:border-primary focus:ring-2 focus:ring-ring/20 outline-none transition-all"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="text-right">
              <a href="#" className="text-sm text-primary hover:underline">
                {t.auth.forgotPassword}
              </a>
            </div>

            <Link
              href="/dashboard"
              className="block w-full text-center py-3 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary-hover transition-colors"
            >
              {t.auth.login}
            </Link>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-card text-muted-foreground">o</span>
              </div>
            </div>

            <button
              type="button"
              className="w-full py-3 border border-border rounded-xl font-medium hover:bg-muted transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google
            </button>

            <p className="text-center text-sm text-muted-foreground mt-4">
              {t.auth.noAccount}{" "}
              <Link href="/register" className="text-primary font-medium hover:underline">
                {t.auth.register}
              </Link>
            </p>
          </form>
        </div>
      </main>
    </>
  );
}
