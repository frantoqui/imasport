"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { PhotoView } from "@/lib/public-views";

/**
 * Album grid plus lightbox.
 *
 * The grid is CSS multi-column so portrait and landscape shots pack together
 * without us needing to know their dimensions up front. The lightbox is a
 * focus-trapped dialog driven by arrow keys and Escape.
 */
export default function PhotoGallery({ photos }: { photos: PhotoView[] }) {
  const [index, setIndex] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  const isOpen = index !== null;
  const total = photos.length;

  const close = useCallback(() => setIndex(null), []);
  const prev = useCallback(
    () => setIndex((i) => (i === null ? null : (i - 1 + total) % total)),
    [total]
  );
  const next = useCallback(
    () => setIndex((i) => (i === null ? null : (i + 1) % total)),
    [total]
  );

  useEffect(() => {
    if (!isOpen) return;

    openerRef.current = document.activeElement as HTMLElement | null;
    const node = dialogRef.current;
    node?.focus();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        prev();
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        next();
        return;
      }
      if (event.key !== "Tab" || !node) return;

      // Keep Tab inside the dialog.
      const focusable = Array.from(
        node.querySelectorAll<HTMLElement>("button:not([disabled])")
      );
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && (active === first || active === node)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || active === node)) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      openerRef.current?.focus();
    };
  }, [isOpen, close, prev, next]);

  if (total === 0) {
    return (
      <p className="text-muted-foreground">
        Este álbum todavía no tiene fotos. Pronto publicaremos las imágenes.
      </p>
    );
  }

  const current = index === null ? null : photos[index];

  return (
    <>
      <div className="columns-2 md:columns-3 lg:columns-4 gap-4">
        {photos.map((photo, i) => (
          <button
            key={photo.id}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={
              photo.caption
                ? `Ampliar foto ${i + 1} de ${total}: ${photo.caption}`
                : `Ampliar foto ${i + 1} de ${total}`
            }
            className="group mb-4 block w-full break-inside-avoid overflow-hidden rounded-2xl border border-border bg-card focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {photo.src ? (
              <img
                src={photo.src}
                alt={photo.caption ?? ""}
                loading="lazy"
                decoding="async"
                className="w-full h-auto object-cover group-hover:opacity-90 transition-opacity"
              />
            ) : (
              <span className="block aspect-square bg-muted" />
            )}
            {photo.caption ? (
              <span className="block p-3 text-left text-xs text-muted-foreground">
                {photo.caption}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {current ? (
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label={current.caption ?? `Foto ${(index ?? 0) + 1} de ${total}`}
          tabIndex={-1}
          onClick={(event) => {
            // A click on the backdrop itself closes; clicks on the image or the
            // controls bubble from children and are ignored here.
            if (event.target === event.currentTarget) close();
          }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-black/90 p-4 outline-none"
        >
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <span className="text-sm text-white/70">
              {(index ?? 0) + 1} / {total}
            </span>
            <button
              type="button"
              onClick={close}
              aria-label="Cerrar la vista ampliada"
              className="p-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <X size={20} />
            </button>
          </div>

          <figure className="flex max-h-[80vh] max-w-5xl flex-col items-center gap-3">
            {current.src ? (
              <img
                src={current.src}
                alt={current.caption ?? ""}
                decoding="async"
                className="max-h-[70vh] w-auto rounded-2xl object-contain"
              />
            ) : null}
            {current.caption ? (
              <figcaption className="text-center text-sm text-white/80">
                {current.caption}
              </figcaption>
            ) : null}
          </figure>

          {total > 1 ? (
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={prev}
                aria-label="Foto anterior"
                className="p-3 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <ChevronLeft size={22} />
              </button>
              <button
                type="button"
                onClick={next}
                aria-label="Foto siguiente"
                className="p-3 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <ChevronRight size={22} />
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
