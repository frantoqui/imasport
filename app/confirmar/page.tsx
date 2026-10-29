"use client";

import Link from "next/link";
import { use, useState } from "react";
import { CheckCircle2, Info, Loader2, Mail, ShieldCheck } from "lucide-react";
import AuthShell, {
  AuthAlert,
  authErrorMessage,
  inputClass,
  inputWithIconClass,
  isValidEmail,
  primaryButtonClass,
} from "@/components/AuthShell";
import { confirmRegistration, resendCode } from "@/lib/auth-client";
import { useI18n } from "@/lib/i18n";

function firstParam(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

/**
 * E-mail verification after sign-up.
 *
 * Deliberately outside `proxy.ts`'s matcher: the user has no session yet when
 * they land here, and a signed-out visitor following the link from their inbox
 * must be able to reach it.
 */
export default function ConfirmPage(props: PageProps<"/confirmar">) {
  const { t } = useI18n();
  const params = use(props.searchParams);

  const [email, setEmail] = useState(firstParam(params.email));
  const isCoachApplication = firstParam(params.coach) === "1";

  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);

    if (!email.trim()) {
      setError(t.authErrors.required);
      return;
    }
    if (!isValidEmail(email)) {
      setError(t.authErrors.invalidEmail);
      return;
    }
    if (!/^\d{6}$/.test(code.trim())) {
      setError(t.authErrors.codeLength);
      return;
    }

    setSubmitting(true);
    try {
      await confirmRegistration({ email: email.trim(), code: code.trim() });
      setDone(true);
    } catch (err) {
      setError(authErrorMessage(err, t.authErrors));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    setError(null);
    setNotice(null);

    if (!email.trim() || !isValidEmail(email)) {
      setError(t.authErrors.invalidEmail);
      return;
    }

    setResending(true);
    try {
      await resendCode(email.trim());
      setNotice(t.confirm.resent);
    } catch (err) {
      setError(authErrorMessage(err, t.authErrors));
    } finally {
      setResending(false);
    }
  }

  if (done) {
    return (
      <AuthShell
        title={t.confirm.successTitle}
        icon={<CheckCircle2 size={28} className="text-primary-foreground" />}
      >
        <div className="space-y-4 bg-card border border-border rounded-2xl p-8 text-center">
          <p className="text-sm text-muted-foreground">
            {t.confirm.successBody}
          </p>

          {isCoachApplication ? (
            <div className="flex gap-3 rounded-xl border border-border bg-muted/50 px-4 py-3 text-left text-sm text-muted-foreground">
              <ShieldCheck size={18} className="shrink-0 mt-0.5 text-primary" />
              <p>{t.auth.coachNotice}</p>
            </div>
          ) : null}

          <Link
            href={`/login?email=${encodeURIComponent(email.trim())}`}
            className="block text-center py-3 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary-hover transition-colors"
          >
            {t.confirm.goToLogin}
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title={t.confirm.title}
      subtitle={
        email ? (
          <>
            {t.confirm.subtitle}{" "}
            <span className="text-foreground font-medium">{email}</span>
          </>
        ) : (
          t.confirm.subtitleNoEmail
        )
      }
    >
      <form
        onSubmit={handleSubmit}
        noValidate
        className="space-y-4 bg-card border border-border rounded-2xl p-8"
      >
        {error ? <AuthAlert>{error}</AuthAlert> : null}
        {notice ? <AuthAlert kind="success">{notice}</AuthAlert> : null}

        {isCoachApplication ? (
          <div className="flex gap-3 rounded-xl border border-border bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
            <Info size={18} className="shrink-0 mt-0.5 text-primary" />
            <p>{t.auth.coachNotice}</p>
          </div>
        ) : null}

        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-2">
            {t.auth.email}
          </label>
          <div className="relative">
            <Mail
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputWithIconClass}
              placeholder="tu@email.com"
            />
          </div>
        </div>

        <div>
          <label htmlFor="code" className="block text-sm font-medium mb-2">
            {t.confirm.code}
          </label>
          <input
            id="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            // Strip anything that is not a digit so a pasted "123 456" works.
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            className={`${inputClass} text-center text-2xl font-black tracking-[0.5em]`}
            placeholder="000000"
          />
          <p className="text-xs text-muted-foreground mt-1.5">
            {t.confirm.checkSpam}
          </p>
        </div>

        <button type="submit" disabled={submitting} className={primaryButtonClass}>
          {submitting ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 size={18} className="animate-spin" />
              {t.confirm.submitting}
            </span>
          ) : (
            t.confirm.submit
          )}
        </button>

        <button
          type="button"
          onClick={handleResend}
          disabled={resending}
          className="w-full py-3 border border-border rounded-xl font-medium hover:bg-muted transition-colors disabled:opacity-60"
        >
          {resending ? t.confirm.resending : t.confirm.resend}
        </button>

        <p className="text-center text-sm text-muted-foreground pt-2">
          {t.auth.hasAccount}{" "}
          <Link href="/login" className="text-primary font-medium hover:underline">
            {t.auth.login}
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
