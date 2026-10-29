"use client";

import { useState } from "react";
import Link from "next/link";
import { Images, Loader2, Pencil, Trash2 } from "lucide-react";
import { deleteAlbum } from "@/lib/admin-actions";
import { useAdminAction } from "./useAdminAction";
import { dangerBtnSmClass, ghostBtnSmClass, iconBtnClass } from "./ui";

/**
 * Album row actions. The delete step spells out how many photo rows go with
 * the album, because DynamoDB has no cascade and the action removes them
 * explicitly.
 */
export function AlbumRowActions({
  albumId,
  title,
  photoCount,
}: {
  albumId: string;
  title: string;
  photoCount: number;
}) {
  const [confirming, setConfirming] = useState(false);
  const { pending, error, run } = useAdminAction();

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex items-center justify-end gap-1">
        <Link href={`/admin/galeria/${albumId}`} title="Fotos" className={iconBtnClass}>
          <Images size={16} />
        </Link>
        <Link
          href={`/admin/galeria/${albumId}`}
          title="Editar"
          className={iconBtnClass}
        >
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
            ¿Borrar <strong>{title}</strong>
            {photoCount > 0
              ? ` y sus ${photoCount} foto(s)?`
              : "? (no tiene fotos)"}{" "}
            Los archivos quedan en S3.
          </p>
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                void run(
                  () => deleteAlbum(albumId),
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
