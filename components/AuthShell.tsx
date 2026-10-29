"use client";

import type { ReactNode } from "react";
import Navbar from "@/components/Navbar";

/**
 * Shared chrome for every auth screen (login, the two sign-ups, e-mail
 * confirmation and password recovery) so they stay visually identical: the
 * "IM" badge, the title block and the centred column that the card sits in.
 *
 * The card itself is left to the caller because some screens render a `<form>`
 * and others render static panels.
 */
export default function AuthShell({
  title,
  subtitle,
  icon,
  size = "md",
  children,
}: {
  title: string;
  subtitle?: ReactNode;
  /** Defaults to the "IM" wordmark used by login and register. */
  icon?: ReactNode;
  size?: "md" | "lg";
  children: ReactNode;
}) {
  return (
    <>
      <Navbar />
      <main className="min-h-screen flex items-center justify-center pt-20 pb-12 px-4">
        <div className={`w-full ${size === "lg" ? "max-w-lg" : "max-w-md"}`}>
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
              {icon ?? (
                <span className="text-primary-foreground font-black text-xl">
                  IM
                </span>
              )}
            </div>
            <h1 className="text-3xl font-black">{title}</h1>
            {subtitle ? (
              <p className="text-muted-foreground mt-2 text-sm">{subtitle}</p>
            ) : null}
          </div>
          {children}
        </div>
      </main>
    </>
  );
}

/** Inline feedback banner. `role="alert"` so screen readers announce it. */
export function AuthAlert({
  kind = "error",
  children,
}: {
  kind?: "error" | "success" | "info";
  children: ReactNode;
}) {
  const styles =
    kind === "error"
      ? "border-destructive/40 bg-destructive/10 text-destructive"
      : kind === "success"
        ? "border-primary/40 bg-primary/10 text-primary"
        : "border-border bg-muted/50 text-muted-foreground";

  return (
    <div
      role="alert"
      className={`rounded-xl border px-4 py-3 text-sm ${styles}`}
    >
      {children}
    </div>
  );
}

/** Shared input classes, so every auth field looks the same. */
export const inputClass =
  "w-full px-4 py-3 rounded-xl bg-muted border border-input focus:border-primary focus:ring-2 focus:ring-ring/20 outline-none transition-all";

/** Same thing, but leaving room for a leading icon. */
export const inputWithIconClass =
  "w-full pl-10 pr-4 py-3 rounded-xl bg-muted border border-input focus:border-primary focus:ring-2 focus:ring-ring/20 outline-none transition-all";

export const primaryButtonClass =
  "w-full py-3 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary-hover transition-colors disabled:opacity-60 disabled:cursor-not-allowed";

// ---------------------------------------------------------------------------
// Validation + error translation
// ---------------------------------------------------------------------------

/**
 * Deliberately loose: the server is the authority on what a valid address is,
 * this only catches obvious typos before we spend a Cognito call on them.
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

/**
 * Mirrors the Cognito default password policy (8+ chars with lower, upper,
 * digit and symbol) so the user sees a readable message instead of an
 * `InvalidPasswordException`.
 */
export function passwordIssue(
  password: string
): "passwordTooShort" | "passwordPolicy" | null {
  if (password.length < 8) return "passwordTooShort";
  const ok =
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /\d/.test(password) &&
    /[^A-Za-z0-9]/.test(password);
  return ok ? null : "passwordPolicy";
}

/** The subset of `t.authErrors` that `authErrorMessage` can return. */
export type AuthErrorDict = {
  required: string;
  invalidEmail: string;
  passwordMismatch: string;
  passwordTooShort: string;
  passwordPolicy: string;
  codeLength: string;
  userExists: string;
  invalidPassword: string;
  invalidParameter: string;
  userNotFound: string;
  notAuthorized: string;
  userNotConfirmed: string;
  codeMismatch: string;
  expiredCode: string;
  limitExceeded: string;
  alreadySignedIn: string;
  needsNewPassword: string;
  network: string;
  generic: string;
};

/**
 * Turns whatever `aws-amplify/auth` threw into a sentence a member can act on.
 * Amplify v6 errors carry the Cognito exception in `name`; anything we do not
 * recognise falls back to its own message so we never swallow a real problem.
 */
export function authErrorMessage(err: unknown, dict: AuthErrorDict): string {
  const name =
    typeof err === "object" && err !== null && "name" in err
      ? String((err as { name: unknown }).name)
      : "";
  const raw =
    err instanceof Error && err.message ? err.message : String(err ?? "");

  switch (name) {
    case "UsernameExistsException":
      return dict.userExists;
    case "InvalidPasswordException":
      return dict.invalidPassword;
    case "InvalidParameterException":
      return dict.invalidParameter;
    case "UserNotFoundException":
      return dict.userNotFound;
    case "NotAuthorizedException":
      return dict.notAuthorized;
    case "UserNotConfirmedException":
      return dict.userNotConfirmed;
    case "CodeMismatchException":
      return dict.codeMismatch;
    case "ExpiredCodeException":
    case "CodeDeliveryFailureException":
      return dict.expiredCode;
    case "LimitExceededException":
    case "TooManyRequestsException":
    case "TooManyFailedAttemptsException":
      return dict.limitExceeded;
    case "UserAlreadyAuthenticatedException":
      return dict.alreadySignedIn;
    case "NetworkError":
      return dict.network;
    default:
      return raw || dict.generic;
  }
}
