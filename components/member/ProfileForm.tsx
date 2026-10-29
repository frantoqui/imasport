"use client";

import { useState, useTransition, type ReactNode } from "react";
import {
  AlertCircle,
  CheckCircle,
  Loader2,
  Mail,
  Phone,
  Ruler,
  Save,
  Scale,
  Target,
  User,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { saveProfile } from "@/lib/member-actions";
import type { ProfileRow } from "./types";

/**
 * Real profile editing.
 *
 * The three notification switches were decorative `<div>`s in the design; they
 * are now controlled toggles that persist to `UserProfile`. `goals` is read
 * from the row rather than seeded with hardcoded Spanish strings, and a goal
 * the user picked before the current option list still shows up selected.
 */

const inputClass =
  "w-full px-4 py-3 rounded-xl bg-muted border border-input focus:border-primary focus:ring-2 focus:ring-ring/20 outline-none transition-all";
const inputWithIconClass =
  "w-full pl-10 pr-4 py-3 rounded-xl bg-muted border border-input focus:border-primary focus:ring-2 focus:ring-ring/20 outline-none transition-all";

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-muted">
      <span className="text-sm font-medium">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors ${
          checked ? "bg-primary" : "bg-muted-foreground/30"
        }`}
      >
        <div
          className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
            checked ? "right-1" : "left-1"
          }`}
        />
      </button>
    </div>
  );
}

/** Empty string for a missing number, so the input stays controlled. */
function numText(value: number | null): string {
  return value === null ? "" : String(value);
}

function toNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

export default function ProfileForm({
  profile,
  children,
}: {
  profile: ProfileRow;
  /**
   * Rendered between Preferences and the save button, which is where the
   * design puts the scheduling card.
   */
  children?: ReactNode;
}) {
  const { t } = useI18n();

  const [name, setName] = useState(profile.name);
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [age, setAge] = useState(numText(profile.age));
  const [weight, setWeight] = useState(numText(profile.weightKg));
  const [height, setHeight] = useState(numText(profile.heightCm));
  const [bodyFat, setBodyFat] = useState(numText(profile.bodyFatPct));
  const [goals, setGoals] = useState<string[]>(profile.goals);
  const [notifyClasses, setNotifyClasses] = useState(profile.notifyClasses);
  const [notifyWorkouts, setNotifyWorkouts] = useState(profile.notifyWorkouts);
  const [notifyWeekly, setNotifyWeekly] = useState(profile.notifyWeekly);

  const [saving, startSaving] = useTransition();
  const [status, setStatus] = useState<
    { kind: "ok" | "error"; message: string } | null
  >(null);

  // A goal stored on the row that is no longer offered still has to be
  // visible, otherwise saving would quietly drop it.
  const options = [
    ...t.profile.goalOptions,
    ...goals.filter((goal) => !t.profile.goalOptions.includes(goal)),
  ];

  const toggleGoal = (goal: string) =>
    setGoals((prev) =>
      prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal]
    );

  function handleSave() {
    setStatus(null);
    startSaving(async () => {
      const result = await saveProfile({
        name,
        phone,
        age: toNumber(age),
        weightKg: toNumber(weight),
        heightCm: toNumber(height),
        bodyFatPct: toNumber(bodyFat),
        goals,
        notifyClasses,
        notifyWorkouts,
        notifyWeekly,
      });

      setStatus(
        result.ok
          ? { kind: "ok", message: "Cambios guardados." }
          : { kind: "error", message: result.error }
      );
    });
  }

  return (
    <>
      {/* Personal Info */}
      <div className="bg-card border border-border rounded-2xl p-6 mb-6">
        <h3 className="text-lg font-bold mb-4">{t.profile.personalInfo}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2" htmlFor="profile-name">
              {t.auth.name}
            </label>
            <div className="relative">
              <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                id="profile-name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className={inputWithIconClass}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" htmlFor="profile-email">
              {t.auth.email}
            </label>
            <div className="relative">
              <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                id="profile-email"
                type="email"
                value={profile.email}
                readOnly
                disabled
                className={`${inputWithIconClass} opacity-60 cursor-not-allowed`}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Tu correo es tu usuario de acceso y no se puede cambiar aquí.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" htmlFor="profile-phone">
              {t.auth.phone}
            </label>
            <div className="relative">
              <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                id="profile-phone"
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="+52 443 000 0000"
                className={inputWithIconClass}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" htmlFor="profile-age">
              {t.profile.age}
            </label>
            <input
              id="profile-age"
              type="number"
              min={10}
              max={100}
              value={age}
              onChange={(event) => setAge(event.target.value)}
              placeholder="28"
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {/* Body Metrics */}
      <div className="bg-card border border-border rounded-2xl p-6 mb-6">
        <h3 className="text-lg font-bold mb-4">{t.dashboard.bodyMetrics}</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2" htmlFor="profile-weight">
              {t.profile.weight}
            </label>
            <div className="relative">
              <Scale size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                id="profile-weight"
                type="number"
                step={0.1}
                value={weight}
                onChange={(event) => setWeight(event.target.value)}
                placeholder="76"
                className={inputWithIconClass}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" htmlFor="profile-height">
              {t.profile.height}
            </label>
            <div className="relative">
              <Ruler size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                id="profile-height"
                type="number"
                step={0.5}
                value={height}
                onChange={(event) => setHeight(event.target.value)}
                placeholder="175"
                className={inputWithIconClass}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" htmlFor="profile-bodyfat">
              % Grasa Corporal
            </label>
            <input
              id="profile-bodyfat"
              type="number"
              step={0.1}
              value={bodyFat}
              onChange={(event) => setBodyFat(event.target.value)}
              placeholder="15.8"
              className={inputClass}
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Estas cifras son tu referencia actual. El historial de la gráfica lo
          registra tu coach en cada medición.
        </p>
      </div>

      {/* Goals */}
      <div className="bg-card border border-border rounded-2xl p-6 mb-6">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Target size={18} className="text-primary" />
          {t.profile.goals}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {options.map((goal) => (
            <button
              key={goal}
              type="button"
              aria-pressed={goals.includes(goal)}
              onClick={() => toggleGoal(goal)}
              className={`py-3 px-4 rounded-xl border text-sm font-medium transition-all ${
                goals.includes(goal)
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:border-primary/50"
              }`}
            >
              {goal}
            </button>
          ))}
        </div>
      </div>

      {/* Preferences */}
      <div className="bg-card border border-border rounded-2xl p-6 mb-6">
        <h3 className="text-lg font-bold mb-4">{t.profile.preferences}</h3>
        <div className="space-y-4">
          <Toggle
            label="Notificaciones de clase"
            checked={notifyClasses}
            onChange={setNotifyClasses}
          />
          <Toggle
            label="Recordatorios de entrenamiento"
            checked={notifyWorkouts}
            onChange={setNotifyWorkouts}
          />
          <Toggle
            label="Resumen semanal por email"
            checked={notifyWeekly}
            onChange={setNotifyWeekly}
          />
        </div>
      </div>

      {children}

      {/* Save */}
      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="w-full flex items-center justify-center gap-2 py-4 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary-hover transition-colors disabled:opacity-70"
      >
        {saving ? (
          <Loader2 size={18} className="animate-spin" />
        ) : (
          <Save size={18} />
        )}
        {t.profile.save}
      </button>

      {status && (
        <div
          className={`mt-4 flex items-start gap-2 p-4 rounded-xl text-sm ${
            status.kind === "ok"
              ? "bg-primary/10 border border-primary/20 text-primary"
              : "bg-destructive/10 border border-destructive/20 text-destructive"
          }`}
        >
          {status.kind === "ok" ? (
            <CheckCircle size={18} className="shrink-0" />
          ) : (
            <AlertCircle size={18} className="shrink-0" />
          )}
          <span className="font-medium">{status.message}</span>
        </div>
      )}
    </>
  );
}
