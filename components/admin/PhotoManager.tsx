"use client";

import { useRef, useState } from "react";
import { uploadData } from "aws-amplify/storage";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Loader2,
  Save,
  Trash2,
  Upload,
} from "lucide-react";
import { addPhotos, deletePhoto, reorderPhotos, updatePhoto } from "@/lib/admin-actions";
import { MEDIA_PREFIXES, buildMediaKey, mediaUrl } from "@/lib/media";
import { useAdminAction } from "./useAdminAction";
import { numberOrNull, nullIfBlank, type AlbumVisibility } from "./types";
import {
  EmptyState,
  ErrorBanner,
  SuccessBanner,
  cardClass,
  dangerBtnSmClass,
  ghostBtnSmClass,
  iconBtnClass,
  inputSmClass,
  primaryBtnClass,
  primaryBtnSmClass,
} from "./ui";

export type PhotoRowData = {
  id: string;
  key: string;
  caption: string | null;
  order: number | null;
};

/**
 * The album's photos land under the prefix that matches its visibility, so S3
 * access control and the album's own visibility can never disagree: a MEMBERS
 * album's files are not readable by a logged-out visitor even if the album is
 * later published by mistake.
 */
function prefixFor(visibility: AlbumVisibility): string {
  return visibility === "PUBLIC"
    ? `${MEDIA_PREFIXES.public}galeria/`
    : `${MEDIA_PREFIXES.members}galeria/`;
}

/** How many files are sent to S3 at once. */
const UPLOAD_CONCURRENCY = 3;

type UploadState = {
  name: string;
  progress: number;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
};

export function PhotoManager({
  albumId,
  visibility,
  photos,
}: {
  albumId: string;
  visibility: AlbumVisibility;
  photos: PhotoRowData[];
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploads, setUploads] = useState<UploadState[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  /** Per-photo caption/order edits, only present while dirty. */
  const [drafts, setDrafts] = useState<
    Record<string, { caption: string; order: string }>
  >({});
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  /**
   * Optimistic order from the arrows.
   *
   * It is kept only while it is a permutation of the ids the server sent: that
   * makes it self-reconciling. Once the reorder lands, the server's order
   * matches it anyway, and if a photo is added or deleted the set changes and
   * the server's order takes over again — no sync effect needed.
   */
  const [override, setOverride] = useState<string[] | null>(null);

  const { pending, error, message, run } = useAdminAction();

  const byId = new Map(photos.map((photo) => [photo.id, photo]));
  const propIds = photos.map((photo) => photo.id);
  const overrideUsable =
    override !== null &&
    override.length === propIds.length &&
    override.every((id) => byId.has(id));
  const order = overrideUsable && override ? override : propIds;

  const ordered = order
    .map((id) => byId.get(id))
    .filter((photo): photo is PhotoRowData => Boolean(photo));

  const prefix = prefixFor(visibility);

  async function handleFiles(files: File[]) {
    if (files.length === 0) return;

    setUploadError(null);
    setUploading(true);
    setUploads(
      files.map((file) => ({ name: file.name, progress: 0, status: "pending" }))
    );

    const nextOrderStart =
      photos.reduce((max, photo) => Math.max(max, photo.order ?? 0), 0) + 1;

    const uploaded: { index: number; key: string }[] = [];
    const queue = files.map((file, index) => ({ file, index }));

    function patch(index: number, patchValue: Partial<UploadState>) {
      setUploads((prev) =>
        prev.map((item, i) => (i === index ? { ...item, ...patchValue } : item))
      );
    }

    // A small worker pool: concurrent enough to be fast, capped so a drop of
    // 40 photos does not open 40 parallel S3 connections.
    async function worker() {
      for (;;) {
        const job = queue.shift();
        if (!job) return;
        const key = buildMediaKey(prefix, job.file.name);
        patch(job.index, { status: "uploading" });
        try {
          await uploadData({
            path: key,
            data: job.file,
            options: {
              contentType: job.file.type,
              onProgress: ({ transferredBytes, totalBytes }) => {
                if (totalBytes) {
                  patch(job.index, {
                    progress: Math.round((transferredBytes / totalBytes) * 100),
                  });
                }
              },
            },
          }).result;
          uploaded.push({ index: job.index, key });
          patch(job.index, { status: "done", progress: 100 });
        } catch (cause) {
          patch(job.index, {
            status: "error",
            error: cause instanceof Error ? cause.message : "Falló la subida.",
          });
        }
      }
    }

    await Promise.all(
      Array.from({ length: Math.min(UPLOAD_CONCURRENCY, files.length) }, worker)
    );

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";

    if (uploaded.length === 0) {
      setUploadError(
        "Ninguna imagen se subió a S3, así que no se creó ninguna foto."
      );
      return;
    }

    // Keep the on-screen order of the chosen files.
    uploaded.sort((a, b) => a.index - b.index);

    await run(
      () =>
        addPhotos(
          albumId,
          uploaded.map((item, i) => ({
            key: item.key,
            caption: null,
            order: nextOrderStart + i,
          }))
        ),
      () => setUploads([])
    );
  }

  function draftFor(photo: PhotoRowData) {
    return (
      drafts[photo.id] ?? {
        caption: photo.caption ?? "",
        order: photo.order === null || photo.order === undefined ? "" : String(photo.order),
      }
    );
  }

  function setDraft(photo: PhotoRowData, patch: Partial<{ caption: string; order: string }>) {
    setDrafts((prev) => ({
      ...prev,
      [photo.id]: { ...draftFor(photo), ...patch },
    }));
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= ordered.length) return;

    const next = [...order];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved);
    setOverride(next);

    void run(() =>
      reorderPhotos(next.map((id, position) => ({ id, order: position + 1 })))
    );
  }

  return (
    <div className="space-y-6">
      <div className={cardClass}>
        <h3 className="font-bold mb-1">Subir fotos</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Se guardan en <code>{prefix}</code> porque el álbum es{" "}
          {visibility === "PUBLIC" ? "público" : "solo para miembros"}. Puedes
          seleccionar varias a la vez; se suben {UPLOAD_CONCURRENCY} en paralelo.
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            void handleFiles(files);
          }}
        />

        <button
          type="button"
          disabled={uploading || pending}
          onClick={() => fileInputRef.current?.click()}
          className={primaryBtnClass}
        >
          {uploading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Upload size={16} />
          )}
          Seleccionar imágenes
        </button>

        <ErrorBanner message={uploadError} />

        {uploads.length > 0 ? (
          <ul className="mt-4 space-y-2">
            {uploads.map((upload, index) => (
              <li key={`${upload.name}-${index}`} className="text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate">{upload.name}</span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {upload.status === "done"
                      ? "Listo"
                      : upload.status === "error"
                        ? "Error"
                        : upload.status === "uploading"
                          ? `${upload.progress}%`
                          : "En cola"}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-muted mt-1 overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      upload.status === "error" ? "bg-destructive" : "bg-primary"
                    }`}
                    style={{
                      width: `${upload.status === "error" ? 100 : upload.progress}%`,
                    }}
                  />
                </div>
                {upload.error ? (
                  <p className="text-xs text-destructive mt-1">{upload.error}</p>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <ErrorBanner message={error} />
      <SuccessBanner message={message} />

      {ordered.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl">
          <EmptyState
            title="Este álbum no tiene fotos"
            description="Sube la primera con el botón de arriba. Después podrás ponerle pie de foto y ordenarla."
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {ordered.map((photo, index) => {
            const draft = draftFor(photo);
            const dirty = Boolean(drafts[photo.id]);
            const src = mediaUrl(photo.key);

            return (
              <div
                key={photo.id}
                className="bg-card border border-border rounded-2xl overflow-hidden flex flex-col"
              >
                <div className="aspect-video bg-muted">
                  {src ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={src}
                      alt={photo.caption ?? ""}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  ) : null}
                </div>

                <div className="p-4 space-y-3 flex-1 flex flex-col">
                  <input
                    type="text"
                    value={draft.caption}
                    onChange={(e) => setDraft(photo, { caption: e.target.value })}
                    placeholder="Pie de foto"
                    className={inputSmClass}
                  />

                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={draft.order}
                      onChange={(e) => setDraft(photo, { order: e.target.value })}
                      placeholder="Orden"
                      className={`${inputSmClass} w-24`}
                    />

                    <button
                      type="button"
                      title="Subir en el orden"
                      aria-label="Subir en el orden"
                      disabled={pending || index === 0}
                      onClick={() => move(index, -1)}
                      className={iconBtnClass}
                    >
                      <ArrowUp size={16} />
                    </button>
                    <button
                      type="button"
                      title="Bajar en el orden"
                      aria-label="Bajar en el orden"
                      disabled={pending || index === ordered.length - 1}
                      onClick={() => move(index, 1)}
                      className={iconBtnClass}
                    >
                      <ArrowDown size={16} />
                    </button>

                    <span className="text-xs text-muted-foreground ml-auto">
                      #{index + 1}
                    </span>
                  </div>

                  <p className="text-[11px] text-muted-foreground break-all">
                    {photo.key}
                  </p>

                  <div className="flex items-center gap-2 mt-auto">
                    <button
                      type="button"
                      disabled={pending || !dirty}
                      onClick={() =>
                        void run(
                          () =>
                            updatePhoto(photo.id, {
                              caption: nullIfBlank(draft.caption),
                              order: numberOrNull(draft.order),
                            }),
                          () =>
                            setDrafts((prev) => {
                              const next = { ...prev };
                              delete next[photo.id];
                              return next;
                            })
                        )
                      }
                      className={dirty ? primaryBtnSmClass : ghostBtnSmClass}
                    >
                      {dirty ? <Save size={14} /> : <Check size={14} />}
                      {dirty ? "Guardar" : "Guardado"}
                    </button>

                    {confirmingId === photo.id ? (
                      <>
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() =>
                            void run(
                              () => deletePhoto(photo.id),
                              () => setConfirmingId(null)
                            )
                          }
                          className={dangerBtnSmClass}
                        >
                          {pending ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : null}
                          Sí, borrar
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmingId(null)}
                          className={ghostBtnSmClass}
                        >
                          No
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => setConfirmingId(photo.id)}
                        className={dangerBtnSmClass}
                      >
                        <Trash2 size={14} />
                        Borrar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Borrar una foto elimina su registro, no el archivo en S3. Algunas fotos
        del contenido inicial apuntan a una URL externa en lugar de a un objeto
        del bucket; se muestran igual y también se pueden borrar.
      </p>
    </div>
  );
}
