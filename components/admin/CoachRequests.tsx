"use client";

import { useState } from "react";
import { Check, Loader2, X } from "lucide-react";
import { approveCoach, rejectCoach } from "@/lib/admin-actions";
import { useAdminAction } from "./useAdminAction";
import {
  EmptyState,
  ErrorBanner,
  SuccessBanner,
  cardClass,
  dangerBtnSmClass,
  ghostBtnSmClass,
  primaryBtnSmClass,
} from "./ui";

export type CoachRequestData = {
  userId: string;
  name: string;
  email: string;
  phone: string | null;
  discipline: string | null;
  specialty: string | null;
  certifications: string | null;
  yearsExperience: number | null;
  bio: string | null;
};

/**
 * Coach applications waiting for a decision.
 *
 * Approving does three things at once (profile status, Cognito group, role
 * copy) and can optionally create the public coach card prefilled from the
 * application — the card starts unpublished so an admin reviews it first.
 */
export function CoachRequests({ requests }: { requests: CoachRequestData[] }) {
  const [createCard, setCreateCard] = useState<Record<string, boolean>>({});
  const [rejecting, setRejecting] = useState<string | null>(null);
  const { pending, error, message, run } = useAdminAction();

  if (requests.length === 0) {
    return (
      <div className="bg-card border border-border rounded-2xl">
        <EmptyState
          title="No hay solicitudes pendientes"
          description="Cuando alguien se registre como coach desde /register-coach aparecerá aquí para que la apruebes o la rechaces."
        />
      </div>
    );
  }

  return (
    <>
      <ErrorBanner message={error} />
      <SuccessBanner message={message} />

      <div className="space-y-4">
        {requests.map((request) => {
          const withCard = createCard[request.userId] ?? true;

          return (
            <div key={request.userId} className={cardClass}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="font-bold">{request.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {request.email}
                    {request.phone ? ` · ${request.phone}` : ""}
                  </p>
                </div>
                <div className="text-right text-sm">
                  <div className="font-medium">{request.discipline ?? "Sin disciplina"}</div>
                  <div className="text-muted-foreground text-xs">
                    {request.yearsExperience !== null
                      ? `${request.yearsExperience} año(s) de experiencia`
                      : "Experiencia no indicada"}
                  </div>
                </div>
              </div>

              <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Especialidad</dt>
                  <dd>{request.specialty ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Certificaciones</dt>
                  <dd>{request.certifications ?? "—"}</dd>
                </div>
                <div className="md:col-span-2">
                  <dt className="text-xs text-muted-foreground">Bio</dt>
                  <dd className="whitespace-pre-wrap">{request.bio ?? "—"}</dd>
                </div>
              </dl>

              <label className="flex items-center gap-2 mt-4 text-sm">
                <input
                  type="checkbox"
                  checked={withCard}
                  onChange={(e) =>
                    setCreateCard((prev) => ({
                      ...prev,
                      [request.userId]: e.target.checked,
                    }))
                  }
                  className="w-4 h-4 accent-primary"
                />
                Crear su ficha pública de coach (como borrador)
              </label>

              <div className="flex flex-wrap items-center gap-2 mt-4">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    void run(() =>
                      approveCoach(request.userId, {
                        createCoachProfile: withCard,
                      })
                    )
                  }
                  className={primaryBtnSmClass}
                >
                  {pending ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Check size={14} />
                  )}
                  Aprobar y hacer coach
                </button>

                {rejecting === request.userId ? (
                  <>
                    <span className="text-xs">¿Rechazar la solicitud?</span>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() =>
                        void run(
                          () => rejectCoach(request.userId),
                          () => setRejecting(null)
                        )
                      }
                      className={dangerBtnSmClass}
                    >
                      Sí, rechazar
                    </button>
                    <button
                      type="button"
                      onClick={() => setRejecting(null)}
                      className={ghostBtnSmClass}
                    >
                      Cancelar
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => setRejecting(request.userId)}
                    className={dangerBtnSmClass}
                  >
                    <X size={14} />
                    Rechazar
                  </button>
                )}
              </div>

              <p className="text-xs text-muted-foreground mt-3">
                Aprobar mueve la cuenta al grupo COACHES y actualiza el rol del
                perfil. Rechazar solo marca la solicitud; la cuenta sigue siendo
                de atleta.
              </p>
            </div>
          );
        })}
      </div>
    </>
  );
}
