"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Mail, Lock, User, Phone, Eye, EyeOff, Loader2 } from "lucide-react";
import AuthShell, {
  AuthAlert,
  authErrorMessage,
  inputWithIconClass,
  isValidEmail,
  passwordIssue,
  primaryButtonClass,
} from "@/components/AuthShell";
import { guestClient } from "@/lib/amplify-client";
import { registerUser, type Discipline, type PlanTier } from "@/lib/auth-client";
import { useI18n } from "@/lib/i18n";

const DISCIPLINES: Discipline[] = ["CrossFit", "Hyrox", "Calistenia"];

type PlanOption = {
  tier: PlanTier;
  name: string;
  nameEn: string | null;
  priceMxn: number;
  popular: boolean;
  order: number;
};

const money = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

export default function RegisterPage() {
  const { t, locale } = useI18n();
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [discipline, setDiscipline] = useState<Discipline | "">("");
  const [planTier, setPlanTier] = useState<PlanTier | "">("");

  const [plans, setPlans] = useState<PlanOption[] | null>(null);
  const [plansError, setPlansError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // The plan picker mirrors whatever the admin has published, so a new tier or
  // a price change shows up here without a code deploy. Read as a guest
  // because nobody is signed in on this page.
  useEffect(() => {
    let active = true;

    (async () => {
      const { data, errors } = await guestClient.models.Plan.list({
        filter: { active: { eq: true } },
      });
      if (!active) return;

      if (errors?.length) {
        setPlansError(
          `${t.authErrors.loadPlans} ${errors.map((e) => e.message).join("; ")}`
        );
        setPlans([]);
        return;
      }

      const options = (data ?? [])
        .filter(
          (plan): plan is typeof plan & { tier: PlanTier } => plan.tier != null
        )
        .map((plan) => ({
          tier: plan.tier,
          name: plan.name,
          nameEn: plan.nameEn ?? null,
          priceMxn: plan.priceMxn,
          popular: plan.popular ?? false,
          order: plan.order ?? Number.MAX_SAFE_INTEGER,
        }))
        .sort((a, b) => a.order - b.order);

      setPlans(options);
      // Pre-select the plan marketing wants people on; before the list lands
      // nothing is selected, so we never submit a tier that does not exist.
      const preferred = options.find((p) => p.popular) ?? options[0];
      if (preferred) setPlanTier(preferred.tier);
    })().catch((err) => {
      if (!active) return;
      setPlansError(`${t.authErrors.loadPlans} ${String(err)}`);
      setPlans([]);
    });

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!name.trim() || !email.trim() || !password || !discipline) {
      setError(t.authErrors.required);
      return;
    }
    if (!isValidEmail(email)) {
      setError(t.authErrors.invalidEmail);
      return;
    }
    const issue = passwordIssue(password);
    if (issue) {
      setError(t.authErrors[issue]);
      return;
    }
    if (password !== confirmPassword) {
      setError(t.authErrors.passwordMismatch);
      return;
    }

    setSubmitting(true);
    try {
      await registerUser({
        email: email.trim(),
        password,
        profile: {
          name: name.trim(),
          phone: phone.trim() || undefined,
          discipline,
          planTier: planTier || undefined,
        },
      });
      router.push(`/confirmar?email=${encodeURIComponent(email.trim())}`);
    } catch (err) {
      setError(authErrorMessage(err, t.authErrors));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell title={t.auth.register} size="lg">
      <form
        onSubmit={handleSubmit}
        noValidate
        className="space-y-4 bg-card border border-border rounded-2xl p-8"
      >
        {error ? <AuthAlert>{error}</AuthAlert> : null}

        <div>
          <label htmlFor="name" className="block text-sm font-medium mb-2">
            {t.auth.name}
          </label>
          <div className="relative">
            <User
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              id="name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputWithIconClass}
              placeholder="Juan Pérez"
            />
          </div>
        </div>

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
          <label htmlFor="phone" className="block text-sm font-medium mb-2">
            {t.auth.phone}{" "}
            <span className="text-muted-foreground font-normal">
              ({t.auth.optional})
            </span>
          </label>
          <div className="relative">
            <Phone
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              id="phone"
              type="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={inputWithIconClass}
              placeholder="+52 443 123 4567"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">{t.auth.phoneHint}</p>
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
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
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
          <p className="text-xs text-muted-foreground mt-1.5">
            {t.auth.passwordHint}
          </p>
        </div>

        <div>
          <label
            htmlFor="confirmPassword"
            className="block text-sm font-medium mb-2"
          >
            {t.auth.confirmPassword}
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

        <div>
          <label className="block text-sm font-medium mb-3">
            {t.auth.selectDiscipline}
          </label>
          <div className="grid grid-cols-3 gap-2">
            {DISCIPLINES.map((d) => (
              <button
                key={d}
                type="button"
                aria-pressed={discipline === d}
                onClick={() => setDiscipline(d)}
                className={`py-2 px-3 rounded-xl border text-sm font-medium transition-colors ${
                  discipline === d
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:border-primary hover:text-primary"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-3">{t.auth.plan}</label>
          {plans === null ? (
            <div className="grid grid-cols-3 gap-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  aria-hidden
                  className="h-[4.5rem] rounded-xl bg-muted animate-pulse"
                />
              ))}
            </div>
          ) : plans.length === 0 ? (
            <AuthAlert kind="info">{plansError ?? t.auth.noPlans}</AuthAlert>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {plans.map((plan) => (
                <button
                  key={plan.tier}
                  type="button"
                  aria-pressed={planTier === plan.tier}
                  onClick={() => setPlanTier(plan.tier)}
                  className={`py-3 px-3 rounded-xl border text-sm font-medium transition-colors ${
                    planTier === plan.tier
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="font-bold">
                    {locale === "en" ? plan.nameEn ?? plan.name : plan.name}
                  </div>
                  <div className="text-xs mt-1 opacity-70">
                    {money.format(plan.priceMxn)}
                    {t.plans.perMonth}
                  </div>
                </button>
              ))}
            </div>
          )}
          {plansError && plans && plans.length > 0 ? (
            <p className="text-xs text-destructive mt-2">{plansError}</p>
          ) : null}
        </div>

        <button
          type="submit"
          disabled={submitting}
          className={`${primaryButtonClass} mt-6`}
        >
          {submitting ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 size={18} className="animate-spin" />
              {t.auth.creatingAccount}
            </span>
          ) : (
            t.auth.register
          )}
        </button>

        <p className="text-xs text-muted-foreground text-center">
          {t.auth.legalPrefix}{" "}
          <Link href="/terminos" className="text-primary hover:underline">
            {t.auth.legalTerms}
          </Link>{" "}
          {t.auth.legalAnd}{" "}
          <Link href="/privacidad" className="text-primary hover:underline">
            {t.auth.legalPrivacy}
          </Link>
          .
        </p>

        <p className="text-center text-sm text-muted-foreground">
          {t.auth.hasAccount}{" "}
          <Link href="/login" className="text-primary font-medium hover:underline">
            {t.auth.login}
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
