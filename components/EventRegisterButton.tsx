"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Check,
  ChevronRight,
  Clock,
  Loader2,
  UserPlus,
} from "lucide-react";
import { client } from "@/lib/amplify-client";
import { useAuth } from "@/lib/auth-context";

/**
 * Event registration.
 *
 * Note what this component deliberately does *not* do: it never writes
 * `Event.spotsTaken`. `Event` is `allow.group("ADMINS")` for writes, so an
 * athlete updating that counter would just collect an authorization error. The
 * counter stays an admin-maintained denormalization; we only create and delete
 * the athlete's own `EventRegistration` row, which is what the schema entitles
 * them to.
 */

type RegistrationStatus = "REGISTERED" | "WAITLIST" | "CANCELLED" | "ATTENDED";

type RegistrationRow = {
  id: string;
  status?: RegistrationStatus | null;
};

type AmplifyErrors = readonly { message?: string }[] | null | undefined;

type ListResult = {
  data?: RegistrationRow[] | null;
  errors?: AmplifyErrors;
};

type MutationResult = {
  data?: RegistrationRow | null;
  errors?: AmplifyErrors;
};

type Props = {
  eventId: string;
  /** No spots left, so a new signup goes on the waiting list. */
  isFull?: boolean;
  /** The event already happened; registration is closed. */
  isPast?: boolean;
  /** `compact` matches the smaller button on the event cards. */
  variant?: "default" | "compact";
};

function messageOf(errors: AmplifyErrors): string | null {
  if (!errors?.length) return null;
  return (
    errors
      .map((e) => e.message)
      .filter((m): m is string => Boolean(m))
      .join(" ") || "No pudimos completar la operación. Intenta de nuevo."
  );
}

export default function EventRegisterButton({
  eventId,
  isFull = false,
  isPast = false,
  variant = "default",
}: Props) {
  const { viewer, loading } = useAuth();
  /**
   * The lookup result, tagged with the user it belongs to. Tagging means a
   * sign-out or an account switch invalidates it by derivation, so the effect
   * below never has to reset state synchronously.
   */
  const [lookup, setLookup] = useState<{
    userId: string;
    registration: RegistrationRow | null;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const profile = viewer?.profile ?? null;
  const userId = viewer?.userId ?? null;
  const resolved =
    userId && lookup && lookup.userId === userId ? lookup : null;
  const registration = resolved?.registration ?? null;
  const checking = Boolean(userId) && resolved === null;

  /**
   * Looks for a live registration of this viewer for this event. Keyed on the
   * user id rather than the whole viewer object, which `useAuth` re-creates on
   * every token refresh.
   */
  useEffect(() => {
    if (loading || !userId) return;

    let cancelled = false;

    const run = async () => {
      try {
        // Annotated so TypeScript compares against this flat shape instead of
        // the generated client's deeply generic result type.
        const fetchMine = async (): Promise<ListResult> =>
          client.models.EventRegistration.list({
            filter: {
              eventId: { eq: eventId },
              userId: { eq: userId },
            },
            limit: 20,
          });

        const { data, errors } = await fetchMine();
        if (cancelled) return;

        const problem = messageOf(errors);
        if (problem) console.error("[EventRegisterButton] list:", problem);

        const live = data?.find((row) => row.status !== "CANCELLED") ?? null;
        setLookup({ userId, registration: live });
      } catch (err) {
        if (cancelled) return;
        console.error("[EventRegisterButton] list falló:", err);
        // Treat an unreadable list as "no registration" so the athlete still
        // gets a usable button instead of a permanent spinner.
        setLookup({ userId, registration: null });
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [eventId, loading, userId]);

  const register = useCallback(async () => {
    if (!viewer || !profile) return;
    setBusy(true);
    setError(null);

    try {
      const create = async (): Promise<MutationResult> =>
        client.models.EventRegistration.create({
          eventId,
          userId: viewer.userId,
          name: profile.name,
          email: profile.email,
          phone: profile.phone ?? null,
          status: isFull ? "WAITLIST" : "REGISTERED",
        });

      const { data, errors } = await create();
      const problem = messageOf(errors);
      if (problem) {
        setError(problem);
        return;
      }
      if (data) setLookup({ userId: viewer.userId, registration: data });
    } catch (err) {
      console.error("[EventRegisterButton] create falló:", err);
      setError("No pudimos registrar tu inscripción. Intenta de nuevo.");
    } finally {
      setBusy(false);
    }
  }, [eventId, isFull, profile, viewer]);

  const cancel = useCallback(async () => {
    if (!viewer || !registration) return;
    setBusy(true);
    setError(null);

    try {
      const remove = async (): Promise<MutationResult> =>
        client.models.EventRegistration.delete({ id: registration.id });

      const { errors } = await remove();
      const problem = messageOf(errors);
      if (problem) {
        setError(problem);
        return;
      }
      setLookup({ userId: viewer.userId, registration: null });
    } catch (err) {
      console.error("[EventRegisterButton] delete falló:", err);
      setError("No pudimos cancelar tu inscripción. Intenta de nuevo.");
    } finally {
      setBusy(false);
    }
  }, [registration, viewer]);

  const compact = variant === "compact";
  const base = compact
    ? "inline-flex items-center justify-center gap-1 px-4 py-2 text-sm font-bold rounded-xl transition-colors"
    : "inline-flex items-center justify-center gap-2 px-6 py-3 font-bold rounded-xl transition-colors";
  const primary = `${base} bg-primary text-primary-foreground hover:bg-primary-hover disabled:opacity-60`;
  const quiet = `${base} bg-card border border-border text-muted-foreground`;
  const iconSize = compact ? 14 : 16;

  if (isPast) {
    return (
      <span className={quiet}>
        <Clock size={iconSize} />
        Evento finalizado
      </span>
    );
  }

  if (loading || checking) {
    return (
      <span className={quiet} aria-live="polite">
        <Loader2 size={iconSize} className="animate-spin" />
        Cargando…
      </span>
    );
  }

  if (!viewer) {
    return (
      <Link
        href={`/login?next=/eventos/${encodeURIComponent(eventId)}`}
        className={primary}
      >
        Inicia sesión para inscribirte
        <ChevronRight size={iconSize} />
      </Link>
    );
  }

  // The registration row needs a name and an email, and the profile is the only
  // place we have them. Better to send the athlete to fill it in than to invent
  // placeholder contact details for an event list.
  if (!profile) {
    return (
      <Link href="/profile" className={primary}>
        Completa tu perfil para inscribirte
        <ChevronRight size={iconSize} />
      </Link>
    );
  }

  if (registration) {
    const waitlisted = registration.status === "WAITLIST";
    return (
      <div className="flex flex-col gap-2">
        <span className="inline-flex items-center gap-2 text-sm font-bold text-primary">
          <Check size={iconSize} />
          {waitlisted ? "Estás en lista de espera" : "Ya estás inscrito"}
        </span>
        <button
          type="button"
          onClick={cancel}
          disabled={busy}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-xl border border-border bg-card hover:border-primary/50 transition-colors disabled:opacity-60"
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : null}
          Cancelar inscripción
        </button>
        {error ? <ErrorNote message={error} /> : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={register}
        disabled={busy}
        className={primary}
      >
        {busy ? (
          <Loader2 size={iconSize} className="animate-spin" />
        ) : (
          <UserPlus size={iconSize} />
        )}
        {isFull ? "Unirme a la lista de espera" : "Inscribirme"}
      </button>
      {error ? <ErrorNote message={error} /> : null}
    </div>
  );
}

function ErrorNote({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="flex items-start gap-2 text-sm text-destructive max-w-xs"
    >
      <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
      {message}
    </p>
  );
}
