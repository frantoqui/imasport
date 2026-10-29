"use client";

import { useState } from "react";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import { createCoach, deleteCoach, updateCoach } from "@/lib/admin-actions";
import { MEDIA_PREFIXES } from "@/lib/media";
import { ImageUploadField } from "./ImageUploadField";
import { useAdminAction } from "./useAdminAction";
import {
  DISCIPLINES,
  nullIfBlank,
  numberOrNull,
  type CoachInput,
  type Discipline,
} from "./types";
import {
  Badge,
  EmptyState,
  ErrorBanner,
  Field,
  SuccessBanner,
  cardClass,
  dangerBtnSmClass,
  ghostBtnSmClass,
  inputClass,
  primaryBtnClass,
  primaryBtnSmClass,
} from "./ui";

const COACH_PREFIX = `${MEDIA_PREFIXES.public}coaches/`;

export type CoachRowData = {
  id: string;
  userId: string | null;
  name: string;
  discipline: Discipline | null;
  certifications: string | null;
  bio: string | null;
  imageKey: string | null;
  imageUrl: string | null;
  instagram: string | null;
  specialty: string | null;
  yearsExperience: number | null;
  order: number | null;
  published: boolean;
  updatedAtKey: string;
};

export type AccountOption = { userId: string; label: string };

type Draft = {
  userId: string;
  name: string;
  discipline: Discipline | "";
  certifications: string;
  bio: string;
  imageKey: string | null;
  imageUrl: string | null;
  instagram: string;
  specialty: string;
  yearsExperience: string;
  order: string;
  published: boolean;
};

function draftFrom(coach: CoachRowData | null): Draft {
  return {
    userId: coach?.userId ?? "",
    name: coach?.name ?? "",
    discipline: coach?.discipline ?? "",
    certifications: coach?.certifications ?? "",
    bio: coach?.bio ?? "",
    imageKey: coach?.imageKey ?? null,
    imageUrl: coach?.imageUrl ?? null,
    instagram: coach?.instagram ?? "",
    specialty: coach?.specialty ?? "",
    yearsExperience:
      coach?.yearsExperience === null || coach?.yearsExperience === undefined
        ? ""
        : String(coach.yearsExperience),
    order: coach?.order === null || coach?.order === undefined ? "" : String(coach.order),
    published: coach?.published ?? false,
  };
}

function CoachEditor({
  coach,
  accounts,
  onCancel,
}: {
  coach: CoachRowData | null;
  accounts: AccountOption[];
  onCancel?: () => void;
}) {
  const [draft, setDraft] = useState<Draft>(() => draftFrom(coach));
  const [confirming, setConfirming] = useState(false);
  const { pending, error, message, run, setError } = useAdminAction();

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function toInput(): CoachInput | null {
    if (!draft.name.trim()) {
      setError("El nombre es obligatorio.");
      return null;
    }
    return {
      userId: nullIfBlank(draft.userId),
      name: draft.name.trim(),
      discipline: draft.discipline === "" ? null : draft.discipline,
      certifications: nullIfBlank(draft.certifications),
      bio: nullIfBlank(draft.bio),
      imageKey: draft.imageKey,
      imageUrl: nullIfBlank(draft.imageUrl),
      instagram: nullIfBlank(draft.instagram),
      specialty: nullIfBlank(draft.specialty),
      yearsExperience: numberOrNull(draft.yearsExperience),
      order: numberOrNull(draft.order),
      published: draft.published,
    };
  }

  async function save() {
    const input = toInput();
    if (!input) return;
    if (coach) {
      await run(() => updateCoach(coach.id, input));
    } else {
      await run(
        () => createCoach(input),
        () => onCancel?.()
      );
    }
  }

  return (
    <div className={cardClass}>
      <ErrorBanner message={error} />
      <SuccessBanner message={message} />

      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <h3 className="font-bold">{coach ? coach.name : "Nuevo coach"}</h3>
          {coach ? (
            coach.published ? (
              <Badge tone="success">Publicado</Badge>
            ) : (
              <Badge tone="warning">Borrador</Badge>
            )
          ) : null}
          {coach?.userId ? <Badge tone="neutral">Con cuenta</Badge> : null}
        </div>

        {coach ? (
          <div className="flex items-center gap-2">
            {confirming ? (
              <>
                <span className="text-xs">¿Borrar la ficha?</span>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => void run(() => deleteCoach(coach.id))}
                  className={dangerBtnSmClass}
                >
                  {pending ? <Loader2 size={14} className="animate-spin" /> : null}
                  Sí
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  className={ghostBtnSmClass}
                >
                  No
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setConfirming(true)}
                className={dangerBtnSmClass}
              >
                <Trash2 size={14} />
                Borrar
              </button>
            )}
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Nombre *">
          <input
            type="text"
            value={draft.name}
            onChange={(e) => set("name", e.target.value)}
            className={inputClass}
            placeholder="Carlos Méndez"
          />
        </Field>

        <Field label="Disciplina">
          <select
            value={draft.discipline}
            onChange={(e) => set("discipline", e.target.value as Discipline | "")}
            className={inputClass}
          >
            <option value="">Sin disciplina</option>
            {DISCIPLINES.map((discipline) => (
              <option key={discipline} value={discipline}>
                {discipline}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Especialidad">
          <input
            type="text"
            value={draft.specialty}
            onChange={(e) => set("specialty", e.target.value)}
            className={inputClass}
            placeholder="Halterofilia y técnica"
          />
        </Field>

        <Field label="Certificaciones">
          <input
            type="text"
            value={draft.certifications}
            onChange={(e) => set("certifications", e.target.value)}
            className={inputClass}
            placeholder="CF-L2, Hyrox Trainer"
          />
        </Field>

        <Field label="Años de experiencia">
          <input
            type="number"
            min={0}
            value={draft.yearsExperience}
            onChange={(e) => set("yearsExperience", e.target.value)}
            className={inputClass}
            placeholder="8"
          />
        </Field>

        <Field label="Instagram" hint="Solo el usuario, sin @ ni URL.">
          <input
            type="text"
            value={draft.instagram}
            onChange={(e) => set("instagram", e.target.value)}
            className={inputClass}
            placeholder="coachcarlos"
          />
        </Field>

        <Field label="Bio" className="md:col-span-2">
          <textarea
            value={draft.bio}
            onChange={(e) => set("bio", e.target.value)}
            rows={3}
            className={inputClass}
          />
        </Field>

        <Field
          label="Cuenta vinculada"
          hint="Opcional. Conecta la ficha pública con un usuario real."
        >
          <select
            value={draft.userId}
            onChange={(e) => set("userId", e.target.value)}
            className={inputClass}
          >
            <option value="">Sin vincular</option>
            {accounts.map((account) => (
              <option key={account.userId} value={account.userId}>
                {account.label}
              </option>
            ))}
            {draft.userId &&
            !accounts.some((account) => account.userId === draft.userId) ? (
              <option value={draft.userId}>{draft.userId} (no encontrada)</option>
            ) : null}
          </select>
        </Field>

        <Field label="Orden" hint="Menor primero en el grid de coaches.">
          <input
            type="number"
            value={draft.order}
            onChange={(e) => set("order", e.target.value)}
            className={inputClass}
            placeholder="1"
          />
        </Field>

        <div className="md:col-span-2">
          <ImageUploadField
            label="Foto"
            prefix={COACH_PREFIX}
            imageKey={draft.imageKey}
            onKeyChange={(key) => set("imageKey", key)}
            imageUrl={draft.imageUrl}
            onUrlChange={(url) => set("imageUrl", url)}
            hint={`Se guarda en ${COACH_PREFIX}`}
          />
        </div>

        <label className="md:col-span-2 flex items-center gap-3 p-3 rounded-xl bg-muted cursor-pointer">
          <input
            type="checkbox"
            checked={draft.published}
            onChange={(e) => set("published", e.target.checked)}
            className="w-4 h-4 accent-primary"
          />
          <span className="text-sm">
            <span className="font-medium">Publicado</span>
            <span className="block text-xs text-muted-foreground">
              Aparece en el grid de coaches del sitio.
            </span>
          </span>
        </label>
      </div>

      <div className="flex items-center gap-2 mt-6">
        <button
          type="button"
          disabled={pending}
          onClick={() => void save()}
          className={primaryBtnSmClass}
        >
          {pending ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Save size={14} />
          )}
          {coach ? "Guardar coach" : "Crear coach"}
        </button>
        {onCancel ? (
          <button type="button" onClick={onCancel} className={ghostBtnSmClass}>
            Cancelar
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function CoachesManager({
  coaches,
  accounts,
}: {
  coaches: CoachRowData[];
  accounts: AccountOption[];
}) {
  const [creating, setCreating] = useState(false);

  return (
    <div className="space-y-6">
      {creating ? (
        <CoachEditor
          coach={null}
          accounts={accounts}
          onCancel={() => setCreating(false)}
        />
      ) : (
        <button
          type="button"
          onClick={() => setCreating(true)}
          className={primaryBtnClass}
        >
          <Plus size={16} />
          Nuevo coach
        </button>
      )}

      {coaches.length === 0 && !creating ? (
        <div className="bg-card border border-border rounded-2xl">
          <EmptyState
            title="No hay fichas de coach"
            description="El grid de coaches del sitio se arma con estas fichas. Son independientes de las cuentas: puedes publicar a alguien que todavía no tiene usuario."
          >
            <button
              type="button"
              onClick={() => setCreating(true)}
              className={`${primaryBtnClass} mt-2`}
            >
              <Plus size={16} />
              Crear la primera
            </button>
          </EmptyState>
        </div>
      ) : null}

      {coaches.map((coach) => (
        <CoachEditor
          key={`${coach.id}-${coach.updatedAtKey}`}
          coach={coach}
          accounts={accounts}
        />
      ))}
    </div>
  );
}
