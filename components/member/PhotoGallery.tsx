"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Images, User, X } from "lucide-react";
import { mediaUrl } from "@/lib/media";
import { longMonthLabel, mediumDateLabel } from "./metrics";
import type { AthletePhotoRow } from "./types";

/**
 * The athlete's own progress photos, newest first and grouped by month.
 *
 * Thumbnails and the lightbox both load through `/api/media/<key>`, which
 * authorizes the viewer before redirecting to a presigned URL — a raw S3 URL
 * is never rendered. `next/image` cannot optimize that redirect, so these are
 * plain `<img>` elements.
 */

type MonthGroup = {
  key: string;
  label: string;
  photos: AthletePhotoRow[];
};

export default function PhotoGallery({
  photos,
}: {
  photos: AthletePhotoRow[];
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const groups = useMemo<MonthGroup[]>(() => {
    const byMonth = new Map<string, AthletePhotoRow[]>();
    for (const photo of photos) {
      const date = photo.takenAt ?? photo.createdAt;
      const key = date.slice(0, 7);
      const list = byMonth.get(key);
      if (list) list.push(photo);
      else byMonth.set(key, [photo]);
    }
    return [...byMonth.entries()]
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, items]) => ({
        key,
        label: longMonthLabel(key),
        photos: items,
      }));
  }, [photos]);

  // A single flat order so the lightboxs arrows walk every month in sequence.
  const ordered = useMemo(
    () => groups.flatMap((group) => group.photos),
    [groups]
  );

  const step = useCallback(
    (delta: number) =>
      setOpenIndex((current) => {
        if (current === null) return current;
        const next = current + delta;
        if (next < 0 || next >= ordered.length) return current;
        return next;
      }),
    [ordered.length]
  );

  useEffect(() => {
    if (openIndex === null) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenIndex(null);
      if (event.key === "ArrowRight") step(1);
      if (event.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openIndex, step]);

  if (photos.length === 0) {
    return (
      <div className="bg-card border border-border rounded-2xl p-12 text-center">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Images size={36} className="text-primary" />
        </div>
        <h3 className="text-xl font-bold mb-2">Todavía no hay fotos</h3>
        <p className="text-muted-foreground max-w-md mx-auto">
          Tus coaches toman fotos durante las sesiones para documentar tu
          técnica y tu progreso. En cuanto tengas la primera, aparecerá aquí.
        </p>
      </div>
    );
  }

  const open = openIndex === null ? null : ordered[openIndex];

  return (
    <>
      <div className="space-y-8">
        {groups.map((group) => (
          <section key={group.key}>
            <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
              <span className="capitalize">{group.label}</span>
              <span className="text-xs font-medium text-muted-foreground">
                {group.photos.length}{" "}
                {group.photos.length === 1 ? "foto" : "fotos"}
              </span>
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {group.photos.map((photo) => {
                const url = mediaUrl(photo.key);
                const index = ordered.indexOf(photo);
                return (
                  <button
                    key={photo.id}
                    type="button"
                    onClick={() => setOpenIndex(index)}
                    className="group text-left bg-card border border-border rounded-2xl overflow-hidden hover:border-primary transition-colors"
                  >
                    <div className="aspect-square bg-muted overflow-hidden">
                      {url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={url}
                          alt={photo.caption ?? "Foto de progreso"}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      )}
                    </div>
                    <div className="p-3">
                      <div className="text-sm font-medium truncate">
                        {photo.caption ?? "Sesión de entrenamiento"}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {mediumDateLabel(
                          (photo.takenAt ?? photo.createdAt).slice(0, 10)
                        )}
                        {photo.coachName && ` • Coach ${photo.coachName}`}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={open.caption ?? "Foto de progreso"}
          onClick={() => setOpenIndex(null)}
        >
          <button
            type="button"
            onClick={() => setOpenIndex(null)}
            aria-label="Cerrar"
            className="absolute top-4 right-4 p-3 rounded-full bg-card border border-border hover:border-primary transition-colors"
          >
            <X size={20} />
          </button>

          {openIndex !== null && openIndex > 0 && (
            <button
              type="button"
              aria-label="Foto anterior"
              onClick={(event) => {
                event.stopPropagation();
                step(-1);
              }}
              className="absolute left-4 p-3 rounded-full bg-card border border-border hover:border-primary transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
          )}

          {openIndex !== null && openIndex < ordered.length - 1 && (
            <button
              type="button"
              aria-label="Foto siguiente"
              onClick={(event) => {
                event.stopPropagation();
                step(1);
              }}
              className="absolute right-4 p-3 rounded-full bg-card border border-border hover:border-primary transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          )}

          <figure
            className="max-w-4xl w-full"
            onClick={(event) => event.stopPropagation()}
          >
            {mediaUrl(open.key) && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={mediaUrl(open.key) as string}
                alt={open.caption ?? "Foto de progreso"}
                className="w-full max-h-[75vh] object-contain rounded-2xl"
              />
            )}
            <figcaption className="mt-4 bg-card border border-border rounded-2xl p-4">
              <div className="font-bold">
                {open.caption ?? "Sesión de entrenamiento"}
              </div>
              <div className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap mt-1">
                <span>
                  {mediumDateLabel((open.takenAt ?? open.createdAt).slice(0, 10))}
                </span>
                {open.coachName && (
                  <span className="flex items-center gap-1">
                    <User size={12} />
                    Coach {open.coachName}
                  </span>
                )}
                <span className="text-xs">
                  {openIndex !== null ? openIndex + 1 : 0} / {ordered.length}
                </span>
              </div>
            </figcaption>
          </figure>
        </div>
      )}
    </>
  );
}
