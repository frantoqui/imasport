"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useState } from "react";
import { Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import AuthShell, {
  AuthAlert,
  authErrorMessage,
  inputWithIconClass,
  isValidEmail,
  primaryButtonClass,
} from "@/components/AuthShell";
import { login } from "@/lib/auth-client";
import { homeForRole } from "@/lib/roles";
import { useI18n } from "@/lib/i18n";

/**
 * Only same-origin paths are honoured as a post-login destination, so a
 * crafted `?next=https://evil.example` cannot turn this form into an open
 * redirect.
 */
function safeNext(value: string | string[] | undefined): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return null;
  if (!raw.startsWith("/") || raw.startsWith("//")) return null;
  return raw;
}

export default function LoginPage(props: PageProps<"/login">) {
  const { t } = useI18n();
  const router = useRouter();
  const params = use(props.searchParams);
  const next = safeNext(params.next);

  // `/confirmar` and `/recuperar` hand the address back so the member does not
  // have to retype it.
  const [email, setEmail] = useState(
    (Array.isArray(params.email) ? params.email[0] : params.email) ?? ""
  );
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError(t.authErrors.required);
      return;
    }
    if (!isValidEmail(email)) {
      setError(t.authErrors.invalidEmail);
      return;
    }

    setLoading(true);
    try {
      const result = await login({ email: email.trim(), password });

      if (result.status === "needsConfirmation") {
        router.push(`/confirmar?email=${encodeURIComponent(email.trim())}`);
        return;
      }
      if (result.status === "needsNewPassword") {
        setError(t.authErrors.needsNewPassword);
        return;
      }

      // `login()` already ran `ensureProfile()`, so the profile row exists by
      // the time we land. The refresh is what makes the server components on
      // the destination see the brand-new session cookie.
      router.replace(next ?? homeForRole(result.role));
      router.refresh();
    } catch (err) {
      setError(authErrorMessage(err, t.authErrors));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title={t.auth.login} subtitle={t.auth.loginSubtitle}>
      <form
        onSubmit={handleSubmit}
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
              name="email"
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
          <label htmlFor="password" className="block text-sm font-medium mb-2">
            {t.auth.password}
          </label>
          <div className="relative">
            <Lock
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
        </div>

        <div className="text-right">
          <Link href="/recuperar" className="text-sm text-primary hover:underline">
            {t.auth.forgotPassword}
          </Link>
        </div>

        <button type="submit" disabled={loading} className={primaryButtonClass}>
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 size={18} className="animate-spin" />
              {t.auth.signingIn}
            </span>
          ) : (
            t.auth.login
          )}
        </button>

        <p className="text-center text-sm text-muted-foreground pt-2">
          {t.auth.noAccount}{" "}
          <Link href="/register" className="text-primary font-medium hover:underline">
            {t.auth.register}
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
