"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X, Sun, Moon, Globe, User, LogOut } from "lucide-react";
import { useI18n, Locale } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";

export default function Navbar() {
  const { t, locale, setLocale } = useI18n();
  const { theme, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isLoggedIn] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-nav-bg backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-black text-sm">IM</span>
            </div>
            <span className="font-black text-xl">
              IMA<span className="text-primary">SPORT</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-6">
            <Link href="/#servicios" className="text-sm font-medium hover:text-primary transition-colors">
              {t.nav.services}
            </Link>
            <Link href="/planes" className="text-sm font-medium hover:text-primary transition-colors">
              {t.nav.plans}
            </Link>
            <Link href="/#coaches" className="text-sm font-medium hover:text-primary transition-colors">
              {t.nav.coaches}
            </Link>
            <Link href="/#eventos" className="text-sm font-medium hover:text-primary transition-colors">
              {t.nav.events}
            </Link>
            <Link href="/#contacto" className="text-sm font-medium hover:text-primary transition-colors">
              {t.nav.contact}
            </Link>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <button
              onClick={() => setLocale(locale === "es" ? "en" : "es")}
              className="flex items-center gap-1 p-2 rounded-lg hover:bg-muted transition-colors text-sm"
            >
              <Globe size={16} />
              <span className="uppercase font-medium">{locale}</span>
            </button>

            {isLoggedIn ? (
              <div className="flex items-center gap-2">
                <Link
                  href="/dashboard"
                  className="text-sm font-medium hover:text-primary transition-colors"
                >
                  {t.nav.dashboard}
                </Link>
                <Link
                  href="/profile"
                  className="p-2 rounded-lg hover:bg-muted transition-colors"
                >
                  <User size={18} />
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="text-sm font-medium px-4 py-2 rounded-lg hover:bg-muted transition-colors"
                >
                  {t.nav.login}
                </Link>
                <Link
                  href="/register"
                  className="text-sm font-medium px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary-hover transition-colors"
                >
                  {t.nav.register}
                </Link>
              </div>
            )}
          </div>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-muted"
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden bg-background border-t border-border">
          <div className="px-4 py-4 space-y-3">
            <Link href="/#servicios" className="block text-sm font-medium py-2" onClick={() => setMobileOpen(false)}>
              {t.nav.services}
            </Link>
            <Link href="/planes" className="block text-sm font-medium py-2" onClick={() => setMobileOpen(false)}>
              {t.nav.plans}
            </Link>
            <Link href="/#coaches" className="block text-sm font-medium py-2" onClick={() => setMobileOpen(false)}>
              {t.nav.coaches}
            </Link>
            <Link href="/#contacto" className="block text-sm font-medium py-2" onClick={() => setMobileOpen(false)}>
              {t.nav.contact}
            </Link>
            <hr className="border-border" />
            <div className="flex items-center gap-3">
              <button onClick={toggleTheme} className="p-2 rounded-lg hover:bg-muted">
                {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <button
                onClick={() => setLocale(locale === "es" ? "en" : "es")}
                className="flex items-center gap-1 p-2 rounded-lg hover:bg-muted text-sm"
              >
                <Globe size={16} />
                <span className="uppercase font-medium">{locale}</span>
              </button>
            </div>
            <div className="flex gap-2 pt-2">
              <Link
                href="/login"
                className="flex-1 text-center text-sm font-medium px-4 py-2 rounded-lg border border-border"
                onClick={() => setMobileOpen(false)}
              >
                {t.nav.login}
              </Link>
              <Link
                href="/register"
                className="flex-1 text-center text-sm font-medium px-4 py-2 bg-primary text-primary-foreground rounded-lg"
                onClick={() => setMobileOpen(false)}
              >
                {t.nav.register}
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
