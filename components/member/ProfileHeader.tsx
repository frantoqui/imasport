"use client";

import Link from "next/link";
import { Images } from "lucide-react";
import { useI18n } from "@/lib/i18n";

/**
 * The profile page is a Server Component so it can read the viewer's row, but
 * the heading still comes from `useI18n`. This keeps that one translated
 * string on the client instead of hardcoding it into the server page.
 */
export default function ProfileHeader() {
  const { t } = useI18n();

  return (
    <div className="flex items-center justify-between gap-4 mb-8">
      <h1 className="text-3xl font-black">{t.profile.title}</h1>
      <Link
        href="/mis-fotos"
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-card border border-border hover:border-primary transition-colors text-sm font-medium"
      >
        <Images size={16} className="text-primary" />
        <span className="hidden sm:inline">Mis fotos</span>
      </Link>
    </div>
  );
}
