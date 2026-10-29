"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Menu,
  X,
  Sun,
  Moon,
  Globe,
  User,
  LogOut,
  LayoutDashboard,
  Images,
  Shield,
  Dumbbell,
  ChevronDown,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { useAuth } from "@/lib/auth-context";
import { homeForRole } from "@/lib/roles";

/**
 * The hash links only resolve on the home page, so they are written
 * root-relative (`/#servicios`) rather than as bare fragments — that way they
 * also work from `/login`, `/planes` and the rest.
 */
function useNavLinks() {
  const { t } = useI18n();
  return [
    { href: "/#servicios", label: t.nav.services },
    { href: "/planes", label: t.nav.plans },
    { href: "/#coaches", label: t.nav.coaches },
    { href: "/eventos", label: t.nav.events },
    { href: "/galeria", label: t.nav.gallery },
    { href: "/#contacto", label: t.nav.contact },
  ];
}

export default function Navbar() {
  const { t, locale, setLocale } = useI18n();
  const { theme, toggleTheme } = useTheme();
  const { viewer, loading, signOut } = useAuth();
  const links = useNavLinks();
  const pathname = usePathname();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Close both menus whenever we land on a new route. Adjusted during render
  // rather than in an effect so it also covers back/forward navigation without
  // an extra commit (https://react.dev/learn/you-might-not-need-an-effect).
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setMobileOpen(false);
    setMenuOpen(false);
  }

  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(event: MouseEvent | TouchEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  const displayName =
    viewer?.profile?.name?.trim() ||
    viewer?.profile?.email ||
    t.nav.account;

  const accountLinks = viewer
    ? [
        {
          href: homeForRole(viewer.role),
          label: t.nav.dashboard,
          icon: LayoutDashboard,
        },
        { href: "/profile", label: t.nav.profile, icon: User },
        { href: "/mis-fotos", label: t.nav.myPhotos, icon: Images },
        ...(viewer.role === "admin"
          ? [{ href: "/admin", label: t.nav.adminPanel, icon: Shield }]
          : []),
        ...(viewer.role === "coach" || viewer.role === "admin"
          ? [{ href: "/coach", label: t.nav.coachPanel, icon: Dumbbell }]
          : []),
      ]
    : [];

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      setSigningOut(false);
      setMenuOpen(false);
      setMobileOpen(false);
    }
  }

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

          <div className="hidden md:flex items-center gap-4 lg:gap-6">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium hover:text-primary transition-colors"
              >
                {link.label}
              </Link>
            ))}
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

            {loading ? (
              // Neutral placeholder: showing the logged-out buttons here would
              // flash "Iniciar Sesión" at members on every hard navigation.
              <div
                aria-hidden
                className="h-9 w-32 rounded-lg bg-muted animate-pulse"
              />
            ) : viewer ? (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen((open) => !open)}
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  className="flex items-center gap-2 pl-2 pr-3 py-2 rounded-lg hover:bg-muted transition-colors"
                >
                  <span className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                    <User size={15} />
                  </span>
                  <span className="text-sm font-medium max-w-[10rem] truncate">
                    {displayName}
                  </span>
                  <ChevronDown
                    size={14}
                    className={`text-muted-foreground transition-transform ${
                      menuOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {menuOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 mt-2 w-56 bg-card border border-border rounded-2xl p-2 shadow-xl"
                  >
                    <p className="px-3 py-2 text-xs text-muted-foreground truncate">
                      {viewer.profile?.email ?? displayName}
                    </p>
                    <hr className="border-border my-1" />
                    {accountLinks.map(({ href, label, icon: Icon }) => (
                      <Link
                        key={href}
                        href={href}
                        role="menuitem"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium hover:bg-muted transition-colors"
                      >
                        <Icon size={16} className="text-muted-foreground" />
                        {label}
                      </Link>
                    ))}
                    <hr className="border-border my-1" />
                    <button
                      role="menuitem"
                      onClick={handleSignOut}
                      disabled={signingOut}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium hover:bg-muted transition-colors disabled:opacity-60"
                    >
                      <LogOut size={16} className="text-muted-foreground" />
                      {t.nav.logout}
                    </button>
                  </div>
                )}
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
            aria-label="Menu"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden bg-background border-t border-border max-h-[calc(100vh-4rem)] overflow-y-auto">
          <div className="px-4 py-4 space-y-3">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block text-sm font-medium py-2"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}

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

            {loading ? (
              <div
                aria-hidden
                className="h-10 rounded-lg bg-muted animate-pulse"
              />
            ) : viewer ? (
              <div className="space-y-1 pt-2">
                <p className="px-1 pb-1 text-xs text-muted-foreground truncate">
                  {displayName}
                </p>
                {accountLinks.map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2 px-1 py-2 rounded-xl text-sm font-medium hover:bg-muted transition-colors"
                  >
                    <Icon size={16} className="text-muted-foreground" />
                    {label}
                  </Link>
                ))}
                <button
                  onClick={handleSignOut}
                  disabled={signingOut}
                  className="w-full flex items-center gap-2 px-1 py-2 rounded-xl text-sm font-medium hover:bg-muted transition-colors disabled:opacity-60"
                >
                  <LogOut size={16} className="text-muted-foreground" />
                  {t.nav.logout}
                </button>
              </div>
            ) : (
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
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
