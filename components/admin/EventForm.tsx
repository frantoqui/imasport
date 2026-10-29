"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Save, Users } from "lucide-react";
import { createEvent, updateEvent } from "@/lib/admin-actions";
import { MEDIA_PREFIXES } from "@/lib/media";
import { ImageUploadField } from "./ImageUploadField";
import { useAdminAction } from "./useAdminAction";
import {
  DISCIPLINES,
  nullIfBlank,
  numberOrNull,
  slugify,
  type Discipline,
  type EventInput,
} from "./types";
import {
  ErrorBanner,
  Field,
  SuccessBanner,
  cardClass,
  ghostBtnClass,
  inputClass,
  primaryBtnClass,
} from "./ui";

/** Event covers all live under one prefix so the bucket stays browsable. */
const EVENT_PREFIX = `${MEDIA_PREFIXES.public}eventos/`;

export type EventFormValues = {
  title: string;
  slug: string;
  description: string;
  date: string;
  time: string;
  location: string;
  category: Discipline | "";
  spots: string;
  priceMxn: string;
  imageKey: string | null;
  imageUrl: string | null;
  featured: boolean;
  published: boolean;
};

export const EMPTY_EVENT: EventFormValues = {
  title: "",
  slug: "",
  description: "",
  date: "",
  time: "",
  location: "",
  category: "",
  spots: "",
  priceMxn: "",
  imageKey: null,
  imageUrl: null,
  featured: false,
  published: false,
};

export function EventForm({
  eventId,
  initial,
  spotsTaken,
  registrationCount,
}: {
  /** Omitted when creating. */
  eventId?: string;
  initial: EventFormValues;
  spotsTaken?: number | null;
  registrationCount?: number;
}) {
  const router = useRouter();
  const [values, setValues] = useState<EventFormValues>(initial);
  const { pending, error, message, run, setError } = useAdminAction();

  function set<K extends keyof EventFormValues>(key: K, value: EventFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function toInput(): EventInput | null {
    if (!values.title.trim()) {
      setError("El título es obligatorio.");
      return null;
    }
    if (!values.date) {
      setError("La fecha es obligatoria.");
      return null;
    }
    return {
      title: values.title.trim(),
      // An empty slug is derived from the title rather than left null, so the
      // public page always has something to build a URL from.
      slug: nullIfBlank(values.slug) ?? slugify(values.title),
      description: nullIfBlank(values.description),
      date: values.date,
      time: nullIfBlank(values.time),
      location: nullIfBlank(values.location),
      category: values.category === "" ? null : values.category,
      spots: numberOrNull(values.spots),
      priceMxn: numberOrNull(values.priceMxn),
      imageKey: values.imageKey,
      imageUrl: nullIfBlank(values.imageUrl),
      featured: values.featured,
      published: values.published,
    };
  }

  async function handleSubmit() {
    const input = toInput();
    if (!input) return;

    if (eventId) {
      await run(() => updateEvent(eventId, input));
    } else {
      await run(
        () => createEvent(input),
        () => router.push("/admin/eventos")
      );
    }
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void handleSubmit();
      }}
      className="space-y-6"
    >
      <ErrorBanner message={error} />
      <SuccessBanner message={message} />

      <div className={cardClass}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Título *" className="md:col-span-2">
            <input
              type="text"
              value={values.title}
              onChange={(e) => set("title", e.target.value)}
              className={inputClass}
              placeholder="Hyrox Morelia 2026"
            />
          </Field>

          <Field
            label="Slug"
            hint="Si lo dejas vacío se genera del título."
            className="md:col-span-2"
          >
            <input
              type="text"
              value={values.slug}
              onChange={(e) => set("slug", e.target.value)}
              className={inputClass}
              placeholder={values.title ? slugify(values.title) : "hyrox-morelia-2026"}
            />
          </Field>

          <Field label="Descripción" className="md:col-span-2">
            <textarea
              value={values.description}
              onChange={(e) => set("description", e.target.value)}
              rows={4}
              className={inputClass}
              placeholder="De qué se trata el evento, qué incluye, requisitos…"
            />
          </Field>

          <Field label="Fecha *">
            <input
              type="date"
              value={values.date}
              onChange={(e) => set("date", e.target.value)}
              className={inputClass}
            />
          </Field>

          <Field label="Hora" hint="Texto libre, se muestra tal cual.">
            <input
              type="text"
              value={values.time}
              onChange={(e) => set("time", e.target.value)}
              className={inputClass}
              placeholder="8:00 AM"
            />
          </Field>

          <Field label="Lugar">
            <input
              type="text"
              value={values.location}
              onChange={(e) => set("location", e.target.value)}
              className={inputClass}
              placeholder="IMASPORT Morelia"
            />
          </Field>

          <Field label="Categoría">
            <select
              value={values.category}
              onChange={(e) => set("category", e.target.value as Discipline | "")}
              className={inputClass}
            >
              <option value="">Sin categoría</option>
              {DISCIPLINES.map((discipline) => (
                <option key={discipline} value={discipline}>
                  {discipline}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Lugares disponibles">
            <input
              type="number"
              min={0}
              value={values.spots}
              onChange={(e) => set("spots", e.target.value)}
              className={inputClass}
              placeholder="60"
            />
          </Field>

          <Field label="Precio (MXN)">
            <input
              type="number"
              min={0}
              step="1"
              value={values.priceMxn}
              onChange={(e) => set("priceMxn", e.target.value)}
              className={inputClass}
              placeholder="850"
            />
          </Field>
        </div>
      </div>

      <div className={cardClass}>
        <ImageUploadField
          label="Imagen de portada"
          prefix={EVENT_PREFIX}
          imageKey={values.imageKey}
          onKeyChange={(key) => set("imageKey", key)}
          imageUrl={values.imageUrl}
          onUrlChange={(url) => set("imageUrl", url)}
          hint={`Se guarda en ${EVENT_PREFIX}`}
        />
      </div>

      <div className={cardClass}>
        <h3 className="font-bold mb-4">Visibilidad</h3>
        <div className="space-y-3">
          <label className="flex items-center gap-3 p-3 rounded-xl bg-muted cursor-pointer">
            <input
              type="checkbox"
              checked={values.published}
              onChange={(e) => set("published", e.target.checked)}
              className="w-4 h-4 accent-primary"
            />
            <span className="text-sm">
              <span className="font-medium">Publicado</span>
              <span className="block text-xs text-muted-foreground">
                Visible en el sitio público. Sin esto queda como borrador.
              </span>
            </span>
          </label>

          <label className="flex items-center gap-3 p-3 rounded-xl bg-muted cursor-pointer">
            <input
              type="checkbox"
              checked={values.featured}
              onChange={(e) => set("featured", e.target.checked)}
              className="w-4 h-4 accent-primary"
            />
            <span className="text-sm">
              <span className="font-medium">Destacado</span>
              <span className="block text-xs text-muted-foreground">
                Se muestra primero en la sección de eventos.
              </span>
            </span>
          </label>
        </div>
      </div>

      {eventId ? (
        <div className={cardClass}>
          <h3 className="font-bold mb-3">Inscripciones</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground text-xs">
                Lugares ocupados (contador)
              </div>
              <div className="text-2xl font-black">{spotsTaken ?? 0}</div>
              <div className="text-xs text-muted-foreground">
                Campo <code>spotsTaken</code>, de solo lectura. Se recalcula al
                cambiar una inscripción.
              </div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs">
                Inscripciones reales
              </div>
              <div className="text-2xl font-black">{registrationCount ?? 0}</div>
              <div className="text-xs text-muted-foreground">
                Incluye lista de espera y cancelados.
              </div>
            </div>
          </div>
          <Link
            href={`/admin/eventos/${eventId}/inscripciones`}
            className={`${ghostBtnClass} mt-4`}
          >
            <Users size={16} />
            Administrar inscripciones
          </Link>
        </div>
      ) : null}

      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className={primaryBtnClass}>
          {pending ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Save size={16} />
          )}
          {eventId ? "Guardar cambios" : "Crear evento"}
        </button>
        <Link href="/admin/eventos" className={ghostBtnClass}>
          Cancelar
        </Link>
      </div>
    </form>
  );
}
