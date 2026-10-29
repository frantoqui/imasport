/**
 * Presentational building blocks for the admin panel.
 *
 * Nothing here is interactive, so the module has no `"use client"` directive
 * and can be imported from both server pages and client components.
 */

import Link from "next/link";
import type { ReactNode } from "react";
import { AlertTriangle, Inbox } from "lucide-react";

// ---------------------------------------------------------------------------
// Class recipes, matching the design system in app/globals.css
// ---------------------------------------------------------------------------

export const cardClass = "bg-card border border-border rounded-2xl p-6";

export const inputClass =
  "w-full px-4 py-3 rounded-xl bg-muted border border-input focus:border-primary focus:ring-2 focus:ring-ring/20 outline-none transition-all";

/** Denser variant for table cells and inline editors. */
export const inputSmClass =
  "w-full px-3 py-2 text-sm rounded-lg bg-muted border border-input focus:border-primary focus:ring-2 focus:ring-ring/20 outline-none transition-all";

export const labelClass = "block text-sm font-medium mb-2";

export const primaryBtnClass =
  "inline-flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

export const primaryBtnSmClass =
  "inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

export const ghostBtnClass =
  "inline-flex items-center justify-center gap-2 px-4 py-3 border border-border rounded-xl font-medium hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

export const ghostBtnSmClass =
  "inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm border border-border rounded-lg font-medium hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

export const dangerBtnSmClass =
  "inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm border border-destructive/40 text-destructive rounded-lg font-medium hover:bg-destructive/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

export const iconBtnClass =
  "p-2 rounded-lg hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

export const thClass =
  "text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-4 py-3";

export const tdClass = "px-4 py-3 align-middle";

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

export function PageHeader({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  /** Right-aligned actions. */
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-black">{title}</h1>
        {description ? (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        ) : null}
      </div>
      {children ? <div className="flex items-center gap-2">{children}</div> : null}
    </div>
  );
}

type Tone = "neutral" | "success" | "warning" | "danger" | "primary";

const TONE_CLASS: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground border-border",
  success: "bg-primary/10 text-primary border-primary/30",
  warning: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/30",
  danger: "bg-destructive/10 text-destructive border-destructive/30",
  primary: "bg-primary text-primary-foreground border-transparent",
};

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: Tone;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-semibold ${TONE_CLASS[tone]}`}
    >
      {children}
    </span>
  );
}

/** Red banner for an AppSync error or a rejected action. */
export function ErrorBanner({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div className="flex items-start gap-2 mb-4 px-4 py-3 rounded-xl border border-destructive/40 bg-destructive/10 text-destructive text-sm">
      <AlertTriangle size={16} className="mt-0.5 shrink-0" />
      <span className="whitespace-pre-wrap break-words">{message}</span>
    </div>
  );
}

/** Green banner confirming a write landed. */
export function SuccessBanner({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div className="mb-4 px-4 py-3 rounded-xl border border-primary/30 bg-primary/10 text-primary text-sm font-medium">
      {message}
    </div>
  );
}

/**
 * Shown whenever a list comes back empty — which is the normal state of a
 * freshly deployed database, so it always offers the way to create the first
 * row rather than looking like a failure.
 */
export function EmptyState({
  title,
  description,
  actionHref,
  actionLabel,
  children,
}: {
  title: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center text-center gap-3 py-14 px-6">
      <div className="p-3 rounded-2xl bg-primary/10">
        <Inbox size={24} className="text-primary" />
      </div>
      <h3 className="font-bold">{title}</h3>
      {description ? (
        <p className="text-sm text-muted-foreground max-w-md">{description}</p>
      ) : null}
      {actionHref && actionLabel ? (
        <Link href={actionHref} className={`${primaryBtnClass} mt-2`}>
          {actionLabel}
        </Link>
      ) : null}
      {children}
    </div>
  );
}

export function Field({
  label,
  hint,
  children,
  className = "",
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className={labelClass}>{label}</label>
      {children}
      {hint ? (
        <p className="text-xs text-muted-foreground mt-1.5">{hint}</p>
      ) : null}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  href,
  icon,
}: {
  label: string;
  value: number | string;
  hint?: string;
  href?: string;
  icon?: ReactNode;
}) {
  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-muted-foreground">{label}</span>
        {icon ? <span className="text-primary">{icon}</span> : null}
      </div>
      <div className="text-3xl font-black mt-2">{value}</div>
      {hint ? (
        <div className="text-xs text-muted-foreground mt-1">{hint}</div>
      ) : null}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="bg-card border border-border rounded-2xl p-5 hover:border-primary transition-colors block"
      >
        {body}
      </Link>
    );
  }

  return <div className="bg-card border border-border rounded-2xl p-5">{body}</div>;
}

/** Wraps a table so it scrolls horizontally instead of breaking the layout. */
export function TableShell({ children }: { children: ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  // AWSDate ("2026-03-14") must not be parsed as UTC midnight and then shown in
  // a negative-offset timezone, which would move it to the previous day.
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const date = new Date(dateOnly ? `${value}T12:00:00` : value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatMxn(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return value.toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  });
}
