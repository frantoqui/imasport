"use client";

import { useState } from "react";
import {
  GripVertical,
  Loader2,
  Plus,
  Save,
  Star,
  Trash2,
  X,
} from "lucide-react";
import {
  createPlan,
  deletePlan,
  setPopularPlan,
  updatePlan,
} from "@/lib/admin-actions";
import { useAdminAction } from "./useAdminAction";
import {
  PLAN_TIERS,
  nullIfBlank,
  numberOrNull,
  type PlanInput,
  type PlanTier,
} from "./types";
import {
  Badge,
  EmptyState,
  ErrorBanner,
  Field,
  SuccessBanner,
  cardClass,
  dangerBtnSmClass,
  formatMxn,
  ghostBtnSmClass,
  inputClass,
  inputSmClass,
  labelClass,
  primaryBtnClass,
  primaryBtnSmClass,
} from "./ui";

export type PlanRowData = {
  id: string;
  tier: PlanTier | null;
  name: string;
  nameEn: string | null;
  priceMxn: number;
  features: string[];
  featuresEn: string[];
  popular: boolean;
  order: number | null;
  active: boolean;
  /** `updatedAt`, used to remount the editor once a save has landed. */
  updatedAtKey: string;
};

type Draft = {
  tier: PlanTier;
  name: string;
  nameEn: string;
  priceMxn: string;
  features: string[];
  featuresEn: string[];
  popular: boolean;
  order: string;
  active: boolean;
};

function draftFrom(plan: PlanRowData | null): Draft {
  return {
    tier: plan?.tier ?? "basic",
    name: plan?.name ?? "",
    nameEn: plan?.nameEn ?? "",
    priceMxn: plan ? String(plan.priceMxn) : "",
    features: plan?.features ?? [],
    featuresEn: plan?.featuresEn ?? [],
    popular: plan?.popular ?? false,
    order: plan?.order === null || plan?.order === undefined ? "" : String(plan.order),
    active: plan?.active ?? true,
  };
}

/** Editable string list for `features` / `featuresEn`. */
function FeatureList({
  label,
  values,
  onChange,
}: {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
}) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      <div className="space-y-2">
        {values.map((value, index) => (
          <div key={index} className="flex items-center gap-2">
            <GripVertical size={14} className="text-muted-foreground shrink-0" />
            <input
              type="text"
              value={value}
              onChange={(event) =>
                onChange(
                  values.map((item, i) => (i === index ? event.target.value : item))
                )
              }
              className={inputSmClass}
              placeholder="Acceso ilimitado a clases"
            />
            <button
              type="button"
              aria-label="Quitar"
              onClick={() => onChange(values.filter((_, i) => i !== index))}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
            >
              <X size={14} className="text-destructive" />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onChange([...values, ""])}
        className={`${ghostBtnSmClass} mt-2`}
      >
        <Plus size={14} />
        Agregar
      </button>
      {values.length === 0 ? (
        <p className="text-xs text-muted-foreground mt-2">
          Sin elementos: se guarda vacío (null) en lugar de una lista vacía.
        </p>
      ) : null}
    </div>
  );
}

function PlanEditor({
  plan,
  onCancel,
}: {
  plan: PlanRowData | null;
  onCancel?: () => void;
}) {
  const [draft, setDraft] = useState<Draft>(() => draftFrom(plan));
  const [confirming, setConfirming] = useState(false);
  const { pending, error, message, run, setError } = useAdminAction();

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function toInput(): PlanInput | null {
    if (!draft.name.trim()) {
      setError("El nombre es obligatorio.");
      return null;
    }
    const price = numberOrNull(draft.priceMxn);
    if (price === null) {
      setError("El precio es obligatorio.");
      return null;
    }
    return {
      tier: draft.tier,
      name: draft.name.trim(),
      nameEn: nullIfBlank(draft.nameEn),
      priceMxn: price,
      features: draft.features,
      featuresEn: draft.featuresEn,
      popular: draft.popular,
      order: numberOrNull(draft.order),
      active: draft.active,
    };
  }

  async function save() {
    const input = toInput();
    if (!input) return;
    if (plan) {
      await run(() => updatePlan(plan.id, input));
    } else {
      await run(
        () => createPlan(input),
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
          <h3 className="font-bold">
            {plan ? plan.name : "Nuevo plan"}
            {plan ? (
              <span className="text-muted-foreground font-normal">
                {" "}
                · {formatMxn(plan.priceMxn)}
              </span>
            ) : null}
          </h3>
          {plan?.popular ? <Badge tone="primary">Popular</Badge> : null}
          {plan && !plan.active ? <Badge tone="warning">Inactivo</Badge> : null}
        </div>

        {plan ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={pending || plan.popular}
              onClick={() => void run(() => setPopularPlan(plan.id))}
              className={ghostBtnSmClass}
              title="Marcar como el plan destacado y quitar la marca a los demás"
            >
              <Star size={14} className={plan.popular ? "text-primary" : ""} />
              {plan.popular ? "Es el destacado" : "Destacar este"}
            </button>

            {confirming ? (
              <>
                <span className="text-xs">¿Borrar el plan?</span>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => void run(() => deletePlan(plan.id))}
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

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Field label="Tier *" hint="Define el plan en el código del sitio.">
          <select
            value={draft.tier}
            onChange={(e) => set("tier", e.target.value as PlanTier)}
            className={inputClass}
          >
            {PLAN_TIERS.map((tier) => (
              <option key={tier} value={tier}>
                {tier}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Nombre *">
          <input
            type="text"
            value={draft.name}
            onChange={(e) => set("name", e.target.value)}
            className={inputClass}
            placeholder="Plan Pro"
          />
        </Field>

        <Field label="Nombre (inglés)">
          <input
            type="text"
            value={draft.nameEn}
            onChange={(e) => set("nameEn", e.target.value)}
            className={inputClass}
            placeholder="Pro Plan"
          />
        </Field>

        <Field label="Precio MXN *">
          <input
            type="number"
            min={0}
            value={draft.priceMxn}
            onChange={(e) => set("priceMxn", e.target.value)}
            className={inputClass}
            placeholder="1200"
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <FeatureList
          label="Beneficios (español)"
          values={draft.features}
          onChange={(values) => set("features", values)}
        />
        <FeatureList
          label="Beneficios (inglés)"
          values={draft.featuresEn}
          onChange={(values) => set("featuresEn", values)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 items-end">
        <Field label="Orden" hint="Menor primero en la página de planes.">
          <input
            type="number"
            value={draft.order}
            onChange={(e) => set("order", e.target.value)}
            className={inputClass}
            placeholder="1"
          />
        </Field>

        <label className="flex items-center gap-3 p-3 rounded-xl bg-muted cursor-pointer">
          <input
            type="checkbox"
            checked={draft.popular}
            onChange={(e) => set("popular", e.target.checked)}
            className="w-4 h-4 accent-primary"
          />
          <span className="text-sm">
            <span className="font-medium">Popular</span>
            <span className="block text-xs text-muted-foreground">
              Resalta la tarjeta. Usa «Destacar este» para dejarlo único.
            </span>
          </span>
        </label>

        <label className="flex items-center gap-3 p-3 rounded-xl bg-muted cursor-pointer">
          <input
            type="checkbox"
            checked={draft.active}
            onChange={(e) => set("active", e.target.checked)}
            className="w-4 h-4 accent-primary"
          />
          <span className="text-sm">
            <span className="font-medium">Activo</span>
            <span className="block text-xs text-muted-foreground">
              Si no, no se muestra en el sitio.
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
          {plan ? "Guardar plan" : "Crear plan"}
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

export function PlansManager({ plans }: { plans: PlanRowData[] }) {
  const [creating, setCreating] = useState(false);

  return (
    <div className="space-y-6">
      {creating ? (
        <PlanEditor plan={null} onCancel={() => setCreating(false)} />
      ) : (
        <button
          type="button"
          onClick={() => setCreating(true)}
          className={primaryBtnClass}
        >
          <Plus size={16} />
          Nuevo plan
        </button>
      )}

      {plans.length === 0 && !creating ? (
        <div className="bg-card border border-border rounded-2xl">
          <EmptyState
            title="No hay planes"
            description="Los planes alimentan la página pública de Planes. Crea el primero para que la sección deje de estar vacía."
          >
            <button
              type="button"
              onClick={() => setCreating(true)}
              className={`${primaryBtnClass} mt-2`}
            >
              <Plus size={16} />
              Crear el primero
            </button>
          </EmptyState>
        </div>
      ) : null}

      {plans.map((plan) => (
        // Remounting on a changed row keeps the editor in step with the server
        // after a save, without a sync effect.
        <PlanEditor key={`${plan.id}-${plan.updatedAtKey}`} plan={plan} />
      ))}
    </div>
  );
}
