"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  HelpCircle,
  Images,
  LayoutDashboard,
  type LucideIcon,
  Settings,
  Tags,
  UserCog,
  Users,
} from "lucide-react";

/**
 * Admin navigation.
 *
 * A sidebar on a laptop (the only place this panel is really used) and a
 * horizontally scrolling tab strip on a phone, so no section is unreachable.
 */

type Item = { href: string; label: string; icon: LucideIcon; exact?: boolean };

const ITEMS: Item[] = [
  { href: "/admin", label: "Resumen", icon: LayoutDashboard, exact: true },
  { href: "/admin/eventos", label: "Eventos", icon: CalendarDays },
  { href: "/admin/galeria", label: "Galería", icon: Images },
  { href: "/admin/usuarios", label: "Usuarios", icon: Users },
  { href: "/admin/planes", label: "Planes", icon: Tags },
  { href: "/admin/coaches", label: "Coaches", icon: UserCog },
  { href: "/admin/faq", label: "FAQ", icon: HelpCircle },
  { href: "/admin/contenido", label: "Contenido", icon: Settings },
];

function useIsActive() {
  const pathname = usePathname();
  return (item: Item) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);
}

export function AdminSidebar() {
  const isActive = useIsActive();

  return (
    <nav className="hidden md:flex flex-col gap-1 w-56 shrink-0">
      {ITEMS.map((item) => {
        const Icon = item.icon;
        const active = isActive(item);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              active
                ? "bg-primary/10 text-primary"
                : "text-foreground hover:bg-muted"
            }`}
          >
            <Icon size={18} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function AdminTabs() {
  const isActive = useIsActive();

  return (
    <nav className="md:hidden -mx-4 px-4 mb-6 overflow-x-auto">
      <div className="flex items-center gap-2 w-max">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isActive(item);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium whitespace-nowrap transition-colors ${
                active
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:bg-muted"
              }`}
            >
              <Icon size={16} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
