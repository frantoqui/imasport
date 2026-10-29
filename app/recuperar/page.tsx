"use client";

import Link from "next/link";
import { use, useState } from "react";
import {
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  Mail,
} from "lucide-react";
import AuthShell, {
  AuthAlert,
  authErrorMessage,
  inputClass,
  inputWithIconClass,
  isValidEmail,
  passwordIssue,
  primaryButtonClass,
} from "@/components/AuthShell";
import { finishPasswordReset, startPasswordReset } from "@/lib/auth-client";
import { useI18n } from "@/lib/i18n";

type Step = "email" | "code" | "done";

function firstParam(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

export default function RecoverPage(props: PageProps<"/recuperar">) {
  const { t } = useI18n();
  const params = use(props.searchParams);

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState(firstParam(params.email));
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSendCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError(t.authErrors.required);
      return;
    }
    if (!isValidEmail(email)) {
      setError(t.authErrors.invalidEmail);
      return;
    }

    setSubmitting(true);
    try {
      await startPasswordReset(email.trim());
      setStep("code");
    } catch (err) {
      setError(authErrorMessage(err, t.authErrors));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResetPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!/^\d{6}$/.test(code.trim())) {
      setError(t.authErrors.codeLength);
      return;
    }
    const issue = passwordIssue(newPassword);
    if (issue) {
      setError(t.authErrors[issue]);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t.authErrors.passwordMismatch);
      return;
    }

    setSubmitting(true);
    try {
      await finishPasswordReset({
        email: email.trim(),
        code: code.trim(),
        newPassword,
      });
      setStep("done");
    } catch (err) {
      setError(authErrorMessage(err, t.authErrors));
    } finally {
      setSubmitting(false);
    }
  }

  if (step === "done") {
    return (
      <AuthShell
        title={t.recover.successTitle}
        icon={<CheckCircle2 size={28} className="text-primary-foreground" />}
      >
        <div className="space-y-4 bg-card border border-border rounded-2xl p-8 text-center">
          <p className="text-sm text-muted-foreground">{t.recover.successBody}</p>
          <Link
            href={`/login?email=${encodeURIComponent(email.trim())}`}
            className="block text-center py-3 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary-hover transition-colors"
          >
            {t.recover.goToLogin}
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title={t.recover.title}
      icon={<KeyRound size={26} className="text-primary-foreground" />}
      subtitle={
        step === "email" ? (
          t.recover.stepEmailSubtitle
        ) : (
          <>
            {t.recover.stepCodeSubtitle}{" "}
            <span className="text-foreground font-medium">{email}</span>
          </>
        )
      }
    >
      {step === "email" ? (
        <form
          onSubmit={handleSendCode}
          noValidate
          className="space-y-4 bg-card border border-border rounded-2xl p-8"
        >
          {error ? <AuthAlert>{error}</AuthAlert> : null}

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

          <button
            type="submit"
            disabled={submitting}
            className={primaryButtonClass}
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 size={18} className="animate-spin" />
                {t.recover.sending}
              </span>
            ) : (
              t.recover.sendCode
            )}
          </button>

          <p className="text-center text-sm text-muted-foreground pt-2">
            <Link href="/login" className="text-primary font-medium hover:underline">
              {t.recover.backToLogin}
            </Link>
          </p>
        </form>
      ) : (
        <form
          onSubmit={handleResetPassword}
          noValidate
          className="space-y-4 bg-card border border-border rounded-2xl p-8"
        >
          {error ? <AuthAlert>{error}</AuthAlert> : null}

          <div>
            <label htmlFor="code" className="block text-sm font-medium mb-2">
              {t.recover.code}
            </label>
            <input
              id="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) =>
                setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              className={`${inputClass} text-center text-2xl font-black tracking-[0.5em]`}
              placeholder="000000"
            />
          </div>

          <div>
            <label
              htmlFor="newPassword"
              className="block text-sm font-medium mb-2"
            >
              {t.recover.newPassword}
            </label>
            <div className="relative">
              <Lock
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                id="newPassword"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full pl-10 pr-12 py-3 rounded-xl bg-muted border border-input focus:border-primary focus:ring-2 focus:ring-ring/20 outline-none transition-all"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={
                  showPassword ? t.auth.hidePassword : t.auth.showPassword
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              {t.auth.passwordHint}
            </p>
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium mb-2"
            >
              {t.recover.confirmNewPassword}
            </label>
            <div className="relative">
              <Lock
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={inputWithIconClass}
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className={primaryButtonClass}
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 size={18} className="animate-spin" />
                {t.recover.submitting}
              </span>
            ) : (
              t.recover.submit
            )}
          </button>

          <div className="flex items-center justify-between pt-2 text-sm">
            <button
              type="button"
              onClick={() => {
                setStep("email");
                setCode("");
                setError(null);
              }}
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              {t.recover.useAnotherEmail}
            </button>
            <Link href="/login" className="text-primary font-medium hover:underline">
              {t.recover.backToLogin}
            </Link>
          </div>
        </form>
      )}
    </AuthShell>
  );
}
