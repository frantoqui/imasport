"use client";

import { useState } from "react";
import { UserPlus, Loader2, CheckCircle, AlertCircle, Eye, EyeOff } from "lucide-react";
import { createCoachAccount } from "@/lib/admin-actions";
import { DISCIPLINES, type Discipline } from "./types";

/**
 * Creates a coach account outright.
 *
 * Coaches have no self-service sign-up, so this is the only path. The admin
 * sets the initial password and passes it on directly — no invitation e-mail
 * is sent, which also keeps coach onboarding off Cognito's daily mail quota.
 */
export function AddCoachForm() {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<
    { kind: "ok" | "error"; message: string } | null
  >(null);
  const [showPassword, setShowPassword] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [discipline, setDiscipline] = useState<Discipline | "">("");
  const [certifications, setCertifications] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [yearsExperience, setYearsExperience] = useState("");
  const [bio, setBio] = useState("");
  const [createCard, setCreateCard] = useState(true);

  /** Satisfies the Cognito policy, so the admin never sees a raw rejection. */
  function suggestPassword() {
    const pick = (set: string, n: number) =>
      Array.from(
        { length: n },
        () => set[Math.floor(Math.random() * set.length)]
      ).join("");
    setPassword(
      pick("ABCDEFGHJKLMNPQRSTUVWXYZ", 3) +
        pick("abcdefghijkmnopqrstuvwxyz", 5) +
        pick("23456789", 2) +
        pick("!@#$%&*?", 2)
    );
    setShowPassword(true);
  }

  function reset() {
    setName("");
    setEmail("");
    setPassword("");
    setDiscipline("");
    setCertifications("");
    setSpecialty("");
    setYearsExperience("");
    setBio("");
    setCreateCard(true);
    setShowPassword(false);
  }

  async function submit() {
    setSaving(true);
    setStatus(null);
    try {
      const result = await createCoachAccount({
        name,
        email,
        password,
        discipline: discipline === "" ? null : discipline,
        certifications: certifications.trim() || null,
        specialty: specialty.trim() || null,
        yearsExperience: yearsExperience ? Number(yearsExperience) : null,
        bio: bio.trim() || null,
        createCard,
      });

      if (result.ok) {
        setStatus({
          kind: "ok",
          message: result.message ?? "Coach creado.",
        });
        reset();
        setOpen(false);
      } else {
        setStatus({ kind: "error", message: result.error });
      }
    } catch (error) {
      setStatus({
        kind: "error",
        message:
          error instanceof Error ? error.message : "No se pudo crear el coach.",
      });
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "w-full px-4 py-3 rounded-xl bg-muted border border-input focus:border-primary focus:ring-2 focus:ring-ring/20 outline-none transition-all";
  const labelClass = "block text-sm font-bold mb-2";

  return (
    <div className="bg-card border border-border rounded-2xl p-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <UserPlus size={18} className="text-primary" />
            Añadir coach
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Los coaches no se registran por su cuenta. Crea la cuenta aquí y
            entrégale la contraseña directamente.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setOpen((v) => !v);
            setStatus(null);
          }}
          className="px-4 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary-hover transition-colors"
        >
          {open ? "Cancelar" : "Nuevo coach"}
        </button>
      </div>

      {status && (
        <div
          className={`mt-4 flex items-start gap-2 p-4 rounded-xl ${
            status.kind === "ok"
              ? "bg-green-500/10 border border-green-500/20 text-green-600"
              : "bg-destructive/10 border border-destructive/20 text-destructive"
          }`}
          role="alert"
        >
          {status.kind === "ok" ? (
            <CheckCircle size={18} className="shrink-0 mt-0.5" />
          ) : (
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
          )}
          <span className="font-medium">{status.message}</span>
        </div>
      )}

      {open && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass} htmlFor="coach-name">
              Nombre completo
            </label>
            <input
              id="coach-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
              placeholder="Ana Rodríguez"
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="coach-email">
              Correo
            </label>
            <input
              id="coach-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              placeholder="ana@imasport.mx"
            />
          </div>

          <div className="md:col-span-2">
            <label className={labelClass} htmlFor="coach-password">
              Contraseña inicial
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  id="coach-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClass}
                  placeholder="Mínimo 8 caracteres"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={
                    showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <button
                type="button"
                onClick={suggestPassword}
                className="px-4 py-3 rounded-xl bg-muted border border-input font-medium hover:bg-muted/70 transition-colors whitespace-nowrap"
              >
                Generar
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Necesita mayúscula, minúscula, número y símbolo. Pídele al coach
              que la cambie desde &ldquo;¿Olvidaste tu contraseña?&rdquo; en
              cuanto entre.
            </p>
          </div>

          <div>
            <label className={labelClass} htmlFor="coach-discipline">
              Disciplina
            </label>
            <select
              id="coach-discipline"
              value={discipline}
              onChange={(e) => setDiscipline(e.target.value as Discipline | "")}
              className={inputClass}
            >
              <option value="">Sin especificar</option>
              {DISCIPLINES.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass} htmlFor="coach-specialty">
              Especialidad
            </label>
            <input
              id="coach-specialty"
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              className={inputClass}
              placeholder="Resistencia"
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="coach-certs">
              Certificaciones
            </label>
            <input
              id="coach-certs"
              value={certifications}
              onChange={(e) => setCertifications(e.target.value)}
              className={inputClass}
              placeholder="Hyrox Master Trainer, CrossFit L1"
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="coach-years">
              Años de experiencia
            </label>
            <input
              id="coach-years"
              type="number"
              min={0}
              max={60}
              value={yearsExperience}
              onChange={(e) => setYearsExperience(e.target.value)}
              className={inputClass}
              placeholder="6"
            />
          </div>

          <div className="md:col-span-2">
            <label className={labelClass} htmlFor="coach-bio">
              Biografía
            </label>
            <textarea
              id="coach-bio"
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className={inputClass}
              placeholder="Atleta Hyrox con participaciones internacionales…"
            />
          </div>

          <label className="md:col-span-2 flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={createCard}
              onChange={(e) => setCreateCard(e.target.checked)}
              className="w-4 h-4 accent-[var(--primary)]"
            />
            <span className="text-sm">
              Crear también su ficha pública (como borrador, sin publicar)
            </span>
          </label>

          <div className="md:col-span-2">
            <button
              type="button"
              onClick={submit}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary-hover transition-colors disabled:opacity-70"
            >
              {saving ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <UserPlus size={18} />
              )}
              Crear coach
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
