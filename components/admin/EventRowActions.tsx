"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, Loader2, Pencil, Star, Trash2, Users } from "lucide-react";
import { deleteEvent, setEventFlags } from "@/lib/admin-actions";
import { useAdminAction } from "./useAdminAction";
import { dangerBtnSmClass, ghostBtnSmClass, iconBtnClass } from "./ui";

/**
 * Inline actions for one row of the events table: publish / feature toggles,
 * links to edit and to the registrations, and a two-step delete.
 */
export function EventRowActions({
  eventId,
  title,
  published,
  featured,
  registrationCount,
}: {
  eventId: string;
  title: string;
  published: boolean;
  featured: boolean;
  registrationCount: number;
}) {
  const [confirming, setConfirming] = useState(false);
  const [alsoDeleteRegistrations, setAlsoDeleteRegistrations] = useState(false);
  const { pending, error, run } = useAdminAction();

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex items-center justify-end gap-1">
        <button
          type="button"
          title={published ? "Despublicar" : "Publicar"}
          aria-label={published ? "Despublicar" : "Publicar"}
          disabled={pending}
          onClick={() =>
            void run(() => setEventFlags(eventId, { published: !published }))
          }
          className={iconBtnClass}
        >
          {published ? (
            <Eye size={16} className="text-primary" />
          ) : (
            <EyeOff size={16} className="text-muted-foreground" />
          )}
        </button>

        <button
          type="button"
          title={featured ? "Quitar de destacados" : "Destacar"}
          aria-label={featured ? "Quitar de destacados" : "Destacar"}
          disabled={pending}
          onClick={() =>
            void run(() => setEventFlags(eventId, { featured: !featured }))
          }
          className={iconBtnClass}
        >
          <Star
            size={16}
            className={featured ? "text-primary" : "text-muted-foreground"}
          />
        </button>

        <Link
          href={`/admin/eventos/${eventId}/inscripciones`}
          title="Inscripciones"
          className={iconBtnClass}
        >
          <Users size={16} />
        </Link>

        <Link href={`/admin/eventos/${eventId}`} title="Editar" className={iconBtnClass}>
          <Pencil size={16} />
        </Link>

        <button
          type="button"
          title="Borrar"
          aria-label="Borrar"
          disabled={pending}
          onClick={() => setConfirming((value) => !value)}
          className={iconBtnClass}
        >
          <Trash2 size={16} className="text-destructive" />
        </button>
      </div>

      {confirming ? (
        <div className="w-72 text-left p-3 rounded-xl border border-destructive/40 bg-destructive/5 space-y-2">
          <p className="text-xs">
            ¿Borrar <strong>{title}</strong>? Esta acción no se puede deshacer.
          </p>

          {registrationCount > 0 ? (
            <label className="flex items-start gap-2 text-xs">
              <input
                type="checkbox"
                checked={alsoDeleteRegistrations}
                onChange={(e) => setAlsoDeleteRegistrations(e.target.checked)}
                className="mt-0.5 accent-primary"
              />
              <span>
                Borrar también sus {registrationCount} inscripción(es). Sin esto
                el evento no se borra.
              </span>
            </label>
          ) : (
            <p className="text-xs text-muted-foreground">
              No tiene inscripciones. Los álbumes vinculados se conservan y
              quedan sin evento.
            </p>
          )}

          {error ? <p className="text-xs text-destructive">{error}</p> : null}

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                void run(
                  () =>
                    deleteEvent(eventId, {
                      deleteRegistrations: alsoDeleteRegistrations,
                    }),
                  () => setConfirming(false)
                )
              }
              className={dangerBtnSmClass}
            >
              {pending ? <Loader2 size={14} className="animate-spin" /> : null}
              Sí, borrar
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className={ghostBtnSmClass}
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : error ? (
        <p className="text-xs text-destructive max-w-xs text-right">{error}</p>
      ) : null}
    </div>
  );
}
