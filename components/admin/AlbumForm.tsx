"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { createAlbum, updateAlbum } from "@/lib/admin-actions";
import { MEDIA_PREFIXES } from "@/lib/media";
import { ImageUploadField } from "./ImageUploadField";
import { useAdminAction } from "./useAdminAction";
import {
  ALBUM_VISIBILITIES,
  VISIBILITY_LABELS,
  nullIfBlank,
  numberOrNull,
  slugify,
  type AlbumInput,
  type AlbumVisibility,
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

export type AlbumFormValues = {
  title: string;
  slug: string;
  description: string;
  coverKey: string | null;
  visibility: AlbumVisibility;
  published: boolean;
  order: string;
  eventId: string;
};

export const EMPTY_ALBUM: AlbumFormValues = {
  title: "",
  slug: "",
  description: "",
  coverKey: null,
  visibility: "PUBLIC",
  published: false,
  order: "",
  eventId: "",
};

export type EventOption = { id: string; title: string; date: string | null };

export function AlbumForm({
  albumId,
  initial,
  events,
}: {
  albumId?: string;
  initial: AlbumFormValues;
  events: EventOption[];
}) {
  const router = useRouter();
  const [values, setValues] = useState<AlbumFormValues>(initial);
  const { pending, error, message, run, setError } = useAdminAction();

  function set<K extends keyof AlbumFormValues>(key: K, value: AlbumFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  // The cover lives next to the album's photos, so a members-only album never
  // leaves a publicly readable cover behind.
  const coverPrefix =
    values.visibility === "PUBLIC"
      ? `${MEDIA_PREFIXES.public}galeria/`
      : `${MEDIA_PREFIXES.members}galeria/`;

  function toInput(): AlbumInput | null {
    if (!values.title.trim()) {
      setError("El título es obligatorio.");
      return null;
    }
    return {
      title: values.title.trim(),
      slug: nullIfBlank(values.slug) ?? slugify(values.title),
      description: nullIfBlank(values.description),
      coverKey: values.coverKey,
      visibility: values.visibility,
      published: values.published,
      order: numberOrNull(values.order),
      eventId: nullIfBlank(values.eventId),
    };
  }

  async function handleSubmit() {
    const input = toInput();
    if (!input) return;

    if (albumId) {
      await run(() => updateAlbum(albumId, input));
    } else {
      await run(
        () => createAlbum(input),
        // Straight into the album so photos can be uploaded right away.
        (id) => router.push(`/admin/galeria/${id}`)
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
              placeholder="Hyrox Open 2026"
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
              placeholder={values.title ? slugify(values.title) : "hyrox-open-2026"}
            />
          </Field>

          <Field label="Descripción" className="md:col-span-2">
            <textarea
              value={values.description}
              onChange={(e) => set("description", e.target.value)}
              rows={3}
              className={inputClass}
            />
          </Field>

          <Field
            label="Visibilidad"
            hint="Las fotos nuevas se suben a la carpeta que corresponde."
          >
            <select
              value={values.visibility}
              onChange={(e) =>
                set("visibility", e.target.value as AlbumVisibility)
              }
              className={inputClass}
            >
              {ALBUM_VISIBILITIES.map((visibility) => (
                <option key={visibility} value={visibility}>
                  {VISIBILITY_LABELS[visibility]}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Orden" hint="Menor primero. Vacío va al final.">
            <input
              type="number"
              value={values.order}
              onChange={(e) => set("order", e.target.value)}
              className={inputClass}
              placeholder="1"
            />
          </Field>

          <Field
            label="Evento vinculado"
            hint="Convierte el álbum en la galería de ese evento."
            className="md:col-span-2"
          >
            <select
              value={values.eventId}
              onChange={(e) => set("eventId", e.target.value)}
              className={inputClass}
            >
              <option value="">Sin evento</option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.title}
                  {event.date ? ` — ${event.date}` : ""}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </div>

      <div className={cardClass}>
        <ImageUploadField
          label="Portada del álbum"
          prefix={coverPrefix}
          imageKey={values.coverKey}
          onKeyChange={(key) => set("coverKey", key)}
          hint={`Se guarda en ${coverPrefix}`}
        />
      </div>

      <div className={cardClass}>
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
              Aparece en la galería del sitio. La visibilidad decide quién puede
              abrirlo.
            </span>
          </span>
        </label>
      </div>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className={primaryBtnClass}>
          {pending ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Save size={16} />
          )}
          {albumId ? "Guardar cambios" : "Crear álbum"}
        </button>
        <Link href="/admin/galeria" className={ghostBtnClass}>
          Cancelar
        </Link>
      </div>
    </form>
  );
}
