"use client";

import { useState, useTransition } from "react";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Loader2,
  Send,
  Shield,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { requestCoachRole } from "@/lib/member-actions";
import type { ApprovalStatus } from "./types";

/**
 * "Solicitar ser coach".
 *
 * Sign-up stashes the coach intent in localStorage and only applies it at the
 * first sign-in, so confirming the e-mail on another device loses it. This is
 * the second chance: the user re-sends the same details and an admin reviews
 * them.
 *
 * Setting `coachStatus` grants nothing by itself — the privilege is the
 * Cognito group, which only an admin can change. And because a group change
 * only reaches the user when their token refreshes, an approved applicant is
 * told to sign in again rather than being promised instant access.
 */

const inputClass =
  "w-full px-4 py-3 rounded-xl bg-muted border border-input focus:border-primary focus:ring-2 focus:ring-ring/20 outline-none transition-all";

export default function CoachRequestCard({
  coachStatus,
  certifications: initialCertifications,
  yearsExperience: initialYears,
  specialty: initialSpecialty,
  bio: initialBio,
}: {
  coachStatus: ApprovalStatus | null;
  certifications: string | null;
  yearsExperience: number | null;
  specialty: string | null;
  bio: string | null;
}) {
  const { t } = useI18n();
  const [certifications, setCertifications] = useState(
    initialCertifications ?? ""
  );
  const [years, setYears] = useState(
    initialYears === null ? "" : String(initialYears)
  );
  const [specialty, setSpecialty] = useState(initialSpecialty ?? "");
  const [bio, setBio] = useState(initialBio ?? "");
  const [sending, startSending] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const status: ApprovalStatus = coachStatus ?? "NONE";

  if (status === "APPROVED") {
    return (
      <div className="bg-card border border-border rounded-2xl p-6 mb-6">
        <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
          <CheckCircle size={18} className="text-primary" />
          Solicitud de coach aprobada
        </h3>
        <p className="text-sm text-muted-foreground">
          Tu cuenta ya está aprobada como coach. Si el panel de coach todavía no
          te aparece, cierra sesión y vuelve a entrar para actualizar tus
          permisos.
        </p>
      </div>
    );
  }

  if (status === "PENDING" || sent) {
    return (
      <div className="bg-card border border-border rounded-2xl p-6 mb-6">
        <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
          <Clock size={18} className="text-yellow-500" />
          Solicitud en revisión
        </h3>
        <p className="text-sm text-muted-foreground">
          Recibimos tu solicitud para ser coach. Un administrador la revisará y
          te avisaremos en cuanto haya respuesta.
        </p>
      </div>
    );
  }

  function handleSend() {
    setError(null);
    startSending(async () => {
      const result = await requestCoachRole({
        certifications,
        yearsExperience: years.trim() === "" ? null : Number(years),
        specialty,
        bio,
      });
      if (result.ok) setSent(true);
      else setError(result.error);
    });
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-6 mb-6">
      <h3 className="text-lg font-bold mb-1 flex items-center gap-2">
        <Shield size={18} className="text-primary" />
        Solicitar ser coach
      </h3>
      <p className="text-sm text-muted-foreground mb-4">
        {status === "REJECTED"
          ? "Tu solicitud anterior no fue aprobada. Puedes actualizar tus datos y enviarla de nuevo."
          : "¿Entrenas a otros atletas? Envía tus datos y un administrador revisará tu solicitud."}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-2" htmlFor="coach-certs">
            {t.auth.certifications}
          </label>
          <input
            id="coach-certs"
            type="text"
            value={certifications}
            onChange={(event) => setCertifications(event.target.value)}
            placeholder="CF-L2, Hyrox Trainer…"
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2" htmlFor="coach-years">
            {t.auth.experience}
          </label>
          <input
            id="coach-years"
            type="number"
            min={0}
            max={60}
            value={years}
            onChange={(event) => setYears(event.target.value)}
            placeholder="5"
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2" htmlFor="coach-specialty">
            Especialidad
          </label>
          <input
            id="coach-specialty"
            type="text"
            value={specialty}
            onChange={(event) => setSpecialty(event.target.value)}
            placeholder="CrossFit, Hyrox…"
            className={inputClass}
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-2" htmlFor="coach-bio">
            {t.auth.bio}
          </label>
          <textarea
            id="coach-bio"
            value={bio}
            onChange={(event) => setBio(event.target.value)}
            rows={4}
            placeholder="Cuéntanos tu trayectoria como entrenador…"
            className={`${inputClass} resize-none`}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={handleSend}
        disabled={sending}
        className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary-hover transition-colors disabled:opacity-70"
      >
        {sending ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <Send size={16} />
        )}
        Enviar solicitud
      </button>

      {error && (
        <div className="mt-4 flex items-start gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-sm text-destructive">
          <AlertCircle size={16} className="shrink-0" />
          <span className="font-medium">{error}</span>
        </div>
      )}
    </div>
  );
}
