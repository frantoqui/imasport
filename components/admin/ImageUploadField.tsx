"use client";

import { useRef, useState } from "react";
import { uploadData } from "aws-amplify/storage";
import { ImageOff, Loader2, Trash2, Upload } from "lucide-react";
import { buildMediaKey, mediaUrl } from "@/lib/media";
import { Field, ghostBtnSmClass, inputSmClass, labelClass } from "./ui";

/**
 * Cover-image picker: uploads straight to S3 from the browser and hands the
 * resulting key back to the caller, which stores it on the model.
 *
 * The upload has to happen client-side — the Amplify storage credentials live
 * in the browser session — so the pattern throughout the panel is "upload
 * here, then pass the key to a Server Action".
 *
 * Previews use a plain `<img>`: `mediaUrl()` points at `/api/media/...`, which
 * answers with a 307 redirect to a presigned S3 URL, and `next/image` cannot
 * optimize a redirect to a host that is not in `next.config.ts`.
 */
export function ImageUploadField({
  label,
  prefix,
  imageKey,
  onKeyChange,
  imageUrl,
  onUrlChange,
  hint,
}: {
  label: string;
  /** Destination prefix, e.g. `public/eventos/`. */
  prefix: string;
  imageKey: string | null;
  onKeyChange: (key: string | null) => void;
  /** Supply both to also allow pasting an external URL. */
  imageUrl?: string | null;
  onUrlChange?: (url: string | null) => void;
  hint?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const preview = mediaUrl(imageKey) ?? mediaUrl(imageUrl ?? null);

  async function handleFile(file: File) {
    setError(null);
    setProgress(0);
    const key = buildMediaKey(prefix, file.name);
    try {
      await uploadData({
        path: key,
        data: file,
        options: {
          contentType: file.type,
          onProgress: ({ transferredBytes, totalBytes }) => {
            if (totalBytes) {
              setProgress(Math.round((transferredBytes / totalBytes) * 100));
            }
          },
        },
      }).result;
      onKeyChange(key);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "No se pudo subir la imagen."
      );
    } finally {
      setProgress(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <label className={labelClass}>{label}</label>

      <div className="flex items-start gap-4">
        <div className="w-28 h-20 rounded-xl bg-muted border border-border overflow-hidden flex items-center justify-center shrink-0">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt=""
              loading="lazy"
              className="w-full h-full object-cover"
            />
          ) : (
            <ImageOff size={20} className="text-muted-foreground" />
          )}
        </div>

        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={progress !== null}
              className={ghostBtnSmClass}
            >
              {progress !== null ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  {progress}%
                </>
              ) : (
                <>
                  <Upload size={14} />
                  Subir imagen
                </>
              )}
            </button>

            {imageKey ? (
              <button
                type="button"
                onClick={() => onKeyChange(null)}
                className={ghostBtnSmClass}
              >
                <Trash2 size={14} />
                Quitar
              </button>
            ) : null}
          </div>

          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleFile(file);
            }}
          />

          {imageKey ? (
            <p className="text-xs text-muted-foreground break-all">
              Guardado en <code>{imageKey}</code>
            </p>
          ) : null}

          {onUrlChange ? (
            <Field
              label="…o usa una URL externa"
              hint="Se ignora si ya hay una imagen subida."
            >
              <input
                type="url"
                value={imageUrl ?? ""}
                onChange={(event) =>
                  onUrlChange(event.target.value.trim() || null)
                }
                placeholder="https://images.unsplash.com/..."
                className={inputSmClass}
              />
            </Field>
          ) : null}

          {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
        </div>
      </div>
    </div>
  );
}
