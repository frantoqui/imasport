"use client";

import { useState } from "react";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import { createFaq, deleteFaq, updateFaq } from "@/lib/admin-actions";
import { useAdminAction } from "./useAdminAction";
import { nullIfBlank, numberOrNull, type FaqInput } from "./types";
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

export type FaqRowData = {
  id: string;
  question: string;
  answer: string;
  questionEn: string | null;
  answerEn: string | null;
  order: number | null;
  published: boolean;
  updatedAtKey: string;
};

type Draft = {
  question: string;
  answer: string;
  questionEn: string;
  answerEn: string;
  order: string;
  published: boolean;
};

function draftFrom(faq: FaqRowData | null): Draft {
  return {
    question: faq?.question ?? "",
    answer: faq?.answer ?? "",
    questionEn: faq?.questionEn ?? "",
    answerEn: faq?.answerEn ?? "",
    order: faq?.order === null || faq?.order === undefined ? "" : String(faq.order),
    published: faq?.published ?? true,
  };
}

function FaqEditor({
  faq,
  onCancel,
}: {
  faq: FaqRowData | null;
  onCancel?: () => void;
}) {
  const [draft, setDraft] = useState<Draft>(() => draftFrom(faq));
  const [confirming, setConfirming] = useState(false);
  const { pending, error, message, run, setError } = useAdminAction();

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function toInput(): FaqInput | null {
    if (!draft.question.trim()) {
      setError("La pregunta es obligatoria.");
      return null;
    }
    if (!draft.answer.trim()) {
      setError("La respuesta es obligatoria.");
      return null;
    }
    return {
      question: draft.question.trim(),
      answer: draft.answer.trim(),
      questionEn: nullIfBlank(draft.questionEn),
      answerEn: nullIfBlank(draft.answerEn),
      order: numberOrNull(draft.order),
      published: draft.published,
    };
  }

  async function save() {
    const input = toInput();
    if (!input) return;
    if (faq) {
      await run(() => updateFaq(faq.id, input));
    } else {
      await run(
        () => createFaq(input),
        () => onCancel?.()
      );
    }
  }

  return (
    <div className={cardClass}>
      <ErrorBanner message={error} />
      <SuccessBanner message={message} />

      <div className="flex flex-wrap items-start justify-between gap-2 mb-4">
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="font-bold truncate">
            {faq ? faq.question : "Nueva pregunta"}
          </h3>
          {faq ? (
            faq.published ? (
              <Badge tone="success">Publicada</Badge>
            ) : (
              <Badge tone="warning">Oculta</Badge>
            )
          ) : null}
        </div>

        {faq ? (
          <div className="flex items-center gap-2">
            {confirming ? (
              <>
                <span className="text-xs">¿Borrar?</span>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => void run(() => deleteFaq(faq.id))}
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
        <Field label="Pregunta (español) *">
          <input
            type="text"
            value={draft.question}
            onChange={(e) => set("question", e.target.value)}
            className={inputClass}
            placeholder="¿Necesito experiencia previa?"
          />
        </Field>

        <Field label="Pregunta (inglés)">
          <input
            type="text"
            value={draft.questionEn}
            onChange={(e) => set("questionEn", e.target.value)}
            className={inputClass}
            placeholder="Do I need previous experience?"
          />
        </Field>

        <Field label="Respuesta (español) *">
          <textarea
            value={draft.answer}
            onChange={(e) => set("answer", e.target.value)}
            rows={4}
            className={inputClass}
          />
        </Field>

        <Field label="Respuesta (inglés)">
          <textarea
            value={draft.answerEn}
            onChange={(e) => set("answerEn", e.target.value)}
            rows={4}
            className={inputClass}
          />
        </Field>

        <Field label="Orden" hint="Menor primero en la sección de FAQ.">
          <input
            type="number"
            value={draft.order}
            onChange={(e) => set("order", e.target.value)}
            className={inputClass}
            placeholder="1"
          />
        </Field>

        <label className="flex items-center gap-3 p-3 rounded-xl bg-muted cursor-pointer self-end">
          <input
            type="checkbox"
            checked={draft.published}
            onChange={(e) => set("published", e.target.checked)}
            className="w-4 h-4 accent-primary"
          />
          <span className="text-sm font-medium">Publicada</span>
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
          {faq ? "Guardar" : "Crear pregunta"}
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

export function FaqManager({ faqs }: { faqs: FaqRowData[] }) {
  const [creating, setCreating] = useState(false);

  return (
    <div className="space-y-6">
      {creating ? (
        <FaqEditor faq={null} onCancel={() => setCreating(false)} />
      ) : (
        <button
          type="button"
          onClick={() => setCreating(true)}
          className={primaryBtnClass}
        >
          <Plus size={16} />
          Nueva pregunta
        </button>
      )}

      {faqs.length === 0 && !creating ? (
        <div className="bg-card border border-border rounded-2xl">
          <EmptyState
            title="No hay preguntas"
            description="La sección de preguntas frecuentes del sitio se queda vacía hasta que agregues la primera."
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

      {faqs.map((faq) => (
        <FaqEditor key={`${faq.id}-${faq.updatedAtKey}`} faq={faq} />
      ))}
    </div>
  );
}
