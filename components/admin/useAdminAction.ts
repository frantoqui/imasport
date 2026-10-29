"use client";

import { useCallback, useState } from "react";
import type { ActionResult } from "./types";

/**
 * Runs an admin Server Action and keeps its pending / error / success state.
 *
 * Every action returns an `ActionResult` rather than throwing, so the error
 * ends up next to the control the admin just used. The `catch` is only for
 * transport failures (offline, 500) — those would otherwise surface as an
 * unhandled rejection and leave the button spinning forever.
 */
export function useAdminAction() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const run = useCallback(
    async <T,>(
      action: () => Promise<ActionResult<T>>,
      onSuccess?: (data: T) => void
    ): Promise<ActionResult<T>> => {
      setPending(true);
      setError(null);
      setMessage(null);
      try {
        const result = await action();
        if (result.ok) {
          setMessage(result.message ?? null);
          onSuccess?.(result.data);
        } else {
          setError(result.error);
        }
        return result;
      } catch (cause) {
        const text =
          cause instanceof Error
            ? cause.message
            : "No se pudo contactar al servidor.";
        setError(text);
        return { ok: false, error: text };
      } finally {
        setPending(false);
      }
    },
    []
  );

  const reset = useCallback(() => {
    setError(null);
    setMessage(null);
  }, []);

  return { pending, error, message, run, reset, setError };
}
