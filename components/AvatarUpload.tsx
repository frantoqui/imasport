"use client";

import { useRef, useState, useTransition } from "react";
import { uploadData } from "aws-amplify/storage";
import { Camera, Loader2, User } from "lucide-react";
import { mediaUrl } from "@/lib/media";
import { saveAvatarKey } from "@/lib/member-actions";

/**
 * Profile picture picker.
 *
 * The upload has to run in the browser because the S3 credentials live in the
 * Amplify session there. The avatars prefix is entity-scoped
 * (`avatars/{entity_id}/*`), so the path is given as a callback and the key we
 * store is the one Amplify resolved — guessing it would put the row out of
 * step with the object.
 *
 * The preview is a plain `<img>`: `mediaUrl()` points at `/api/media/...`,
 * which answers with a redirect to a presigned S3 URL, and `next/image`
 * cannot optimize a redirect to a host outside `next.config.ts`.
 */

const MAX_BYTES = 5 * 1024 * 1024;

function safeFileName(name: string): string {
  const cleaned = name
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(-60);
  return cleaned || "avatar.jpg";
}

export default function AvatarUpload({
  name,
  avatarKey,
  subtitle,
  plan,
}: {
  name: string;
  avatarKey: string | null;
  subtitle?: string | null;
  plan?: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [currentKey, setCurrentKey] = useState(avatarKey);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

  const preview = mediaUrl(currentKey);
  const busy = uploading || saving;

  async function handleFile(file: File) {
    setError(null);

    if (!file.type.startsWith("image/")) {
      setError("Elige un archivo de imagen (JPG, PNG o WebP).");
      return;
    }
    if (file.size > MAX_BYTES) {
      const mb = (file.size / (1024 * 1024)).toFixed(1);
      setError(`La imagen pesa ${mb} MB. El máximo es 5 MB.`);
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      const fileName = `${crypto.randomUUID()}-${safeFileName(file.name)}`;
      const upload = await uploadData({
        path: ({ identityId }) => `avatars/${identityId}/${fileName}`,
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

      // `upload.path` is the resolved key, with `{entity_id}` filled in.
      const resolvedKey = upload.path;

      startSaving(async () => {
        const result = await saveAvatarKey(resolvedKey);
        if (result.ok) {
          setCurrentKey(resolvedKey);
        } else {
          setError(result.error);
        }
      });
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No se pudo subir la imagen. Intenta de nuevo."
      );
    } finally {
      setUploading(false);
      setProgress(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-6 mb-6">
      <div className="flex items-center gap-6">
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center overflow-hidden">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={preview}
                alt={name}
                className="w-full h-full object-cover"
              />
            ) : (
              <User size={40} className="text-primary" />
            )}
          </div>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            aria-label="Cambiar foto de perfil"
            className="absolute bottom-0 right-0 p-2 bg-primary text-primary-foreground rounded-full hover:bg-primary-hover transition-colors disabled:opacity-60"
          >
            {busy ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Camera size={14} />
            )}
          </button>
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
        </div>

        <div className="min-w-0">
          <h2 className="text-xl font-bold truncate">{name}</h2>
          {subtitle && (
            <p className="text-muted-foreground text-sm">{subtitle}</p>
          )}
          {plan && (
            <p className="text-primary text-sm font-medium mt-1">{plan}</p>
          )}
          {progress !== null && (
            <p className="text-xs text-muted-foreground mt-1">
              Subiendo… {progress}%
            </p>
          )}
          {error && <p className="text-xs text-destructive mt-1">{error}</p>}
        </div>
      </div>
    </div>
  );
}
