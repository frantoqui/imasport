"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Mail,
  Lock,
  User,
  Phone,
  Award,
  BookOpen,
  Eye,
  EyeOff,
  Info,
  Loader2,
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
import { registerUser, type Discipline } from "@/lib/auth-client";
import { useI18n } from "@/lib/i18n";

const DISCIPLINES: Discipline[] = ["CrossFit", "Hyrox", "Calistenia"];

export default function RegisterCoachPage() {
  const { t } = useI18n();
  const router = useRouter();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [discipline, setDiscipline] = useState<Discipline | "">("");
  const [certifications, setCertifications] = useState("");
  const [yearsExperience, setYearsExperience] = useState("");
  // Stored by key so flipping the ES/EN switch does not blank the select.
  const [specialtyKey, setSpecialtyKey] =
    useState<keyof typeof t.auth.specialtyOptions>("strength");
  const [bio, setBio] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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

    const years = yearsExperience.trim()
      ? Number.parseInt(yearsExperience, 10)
      : undefined;

    setSubmitting(true);
    try {
      await registerUser({
        email: email.trim(),
        password,
        profile: {
          name: name.trim(),
          phone: phone.trim() || undefined,
          discipline,
          // A coach sign-up is only an application: `ensureProfile` writes
          // `coachStatus: PENDING` and the account stays in ATHLETES until an
          // admin moves it into the COACHES group.
          wantsCoach: true,
          certifications: certifications.trim() || undefined,
          yearsExperience: Number.isFinite(years) ? years : undefined,
          specialty: t.auth.specialtyOptions[specialtyKey],
          bio: bio.trim() || undefined,
        },
      });
      router.push(
        `/confirmar?email=${encodeURIComponent(email.trim())}&coach=1`
      );
    } catch (err) {
      setError(authErrorMessage(err, t.authErrors));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      title={t.auth.registerCoach}
      subtitle={t.coaches.subtitle}
      size="lg"
      icon={<Award size={28} className="text-primary-foreground" />}
    >
      <form
        onSubmit={handleSubmit}
        noValidate
        className="space-y-4 bg-card border border-border rounded-2xl p-8"
      >
        <div className="flex gap-3 rounded-xl border border-border bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
          <Info size={18} className="shrink-0 mt-0.5 text-primary" />
          <p>{t.auth.coachNotice}</p>
        </div>

        {error ? <AuthAlert>{error}</AuthAlert> : null}

        <div className="grid grid-cols-2 gap-4">
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
                placeholder="Nombre"
              />
            </div>
          </div>
          <div>
            <label htmlFor="phone" className="block text-sm font-medium mb-2">
              {t.auth.phone}
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
                placeholder="+52 443..."
              />
            </div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground -mt-2">{t.auth.phoneHint}</p>

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
              placeholder="coach@email.com"
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
                className={`py-3 px-3 rounded-xl border text-sm font-medium transition-colors ${
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
          <label
            htmlFor="certifications"
            className="block text-sm font-medium mb-2"
          >
            {t.auth.certifications}
          </label>
          <div className="relative">
            <Award size={18} className="absolute left-3 top-3 text-muted-foreground" />
            <textarea
              id="certifications"
              value={certifications}
              onChange={(e) => setCertifications(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-muted border border-input focus:border-primary focus:ring-2 focus:ring-ring/20 outline-none transition-all resize-none"
              rows={2}
              placeholder="CrossFit L2, NSCA-CPT, etc."
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="years" className="block text-sm font-medium mb-2">
              {t.auth.experience}
            </label>
            <input
              id="years"
              type="number"
              min={0}
              max={60}
              value={yearsExperience}
              onChange={(e) => setYearsExperience(e.target.value)}
              className={inputClass}
              placeholder="5"
            />
          </div>
          <div>
            <label htmlFor="specialty" className="block text-sm font-medium mb-2">
              {t.auth.specialty}
            </label>
            <select
              id="specialty"
              value={specialtyKey}
              onChange={(e) =>
                setSpecialtyKey(
                  e.target.value as keyof typeof t.auth.specialtyOptions
                )
              }
              className={inputClass}
            >
              {Object.entries(t.auth.specialtyOptions).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="bio" className="block text-sm font-medium mb-2">
            {t.auth.bio}
          </label>
          <div className="relative">
            <BookOpen
              size={18}
              className="absolute left-3 top-3 text-muted-foreground"
            />
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-muted border border-input focus:border-primary focus:ring-2 focus:ring-ring/20 outline-none transition-all resize-none"
              rows={3}
              placeholder="Cuéntanos sobre tu experiencia y filosofía de entrenamiento..."
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
            t.auth.registerCoach
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
