"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Loader2,
  Save,
  Search,
  ShieldAlert,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import {
  setUserEnabled,
  setUserRole,
  updateUserPlan,
} from "@/lib/admin-actions";
import { useAdminAction } from "./useAdminAction";
import {
  APPROVAL_LABELS,
  COGNITO_GROUPS,
  GROUP_LABELS,
  PAYMENT_STATUSES,
  PAYMENT_STATUS_LABELS,
  PLAN_TIERS,
  asEnum,
  type ApprovalStatus,
  type CognitoGroup,
  type PaymentStatus,
  type PlanTier,
} from "./types";
import {
  Badge,
  EmptyState,
  ErrorBanner,
  SuccessBanner,
  TableShell,
  dangerBtnSmClass,
  formatDateTime,
  ghostBtnSmClass,
  inputClass,
  inputSmClass,
  primaryBtnSmClass,
  tdClass,
  thClass,
} from "./ui";

export type UserRowData = {
  userId: string;
  email: string;
  name: string;
  phone: string | null;
  /** Authoritative group membership, from Cognito. */
  group: CognitoGroup;
  /** Denormalized copy on the profile; shown when it disagrees. */
  profileRole: string | null;
  enabled: boolean;
  /** Cognito account status, e.g. CONFIRMED / UNCONFIRMED. */
  status: string;
  emailVerified: boolean;
  createdAt: string | null;
  hasProfile: boolean;
  /** True when Cognito has no record of this id (orphan profile row). */
  cognitoMissing: boolean;
  planTier: PlanTier | null;
  planStatus: PaymentStatus | null;
  discipline: string | null;
  coachStatus: ApprovalStatus | null;
};

export function UsersTable({
  rows,
  cognitoError,
}: {
  rows: UserRowData[];
  cognitoError: string | null;
}) {
  const [query, setQuery] = useState("");
  const [groupFilter, setGroupFilter] = useState<CognitoGroup | "">("");
  const [confirmingAdmin, setConfirmingAdmin] = useState<string | null>(null);
  const [planDrafts, setPlanDrafts] = useState<
    Record<string, { tier: PlanTier | ""; status: PaymentStatus | "" }>
  >({});

  const { pending, error, message, run } = useAdminAction();

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (groupFilter !== "" && row.group !== groupFilter) return false;
      if (needle === "") return true;
      return (
        row.name.toLowerCase().includes(needle) ||
        row.email.toLowerCase().includes(needle) ||
        row.userId.toLowerCase().includes(needle)
      );
    });
  }, [rows, query, groupFilter]);

  function planDraft(row: UserRowData) {
    return (
      planDrafts[row.userId] ?? {
        tier: row.planTier ?? "",
        status: row.planStatus ?? "",
      }
    );
  }

  function setPlanDraft(
    row: UserRowData,
    patch: Partial<{ tier: PlanTier | ""; status: PaymentStatus | "" }>
  ) {
    setPlanDrafts((prev) => ({
      ...prev,
      [row.userId]: { ...planDraft(row), ...patch },
    }));
  }

  function clearPlanDraft(userId: string) {
    setPlanDrafts((prev) => {
      const next = { ...prev };
      delete next[userId];
      return next;
    });
  }

  function changeGroup(row: UserRowData, group: CognitoGroup) {
    // Granting full admin is the one change worth a second look.
    if (group === "ADMINS") {
      setConfirmingAdmin(row.userId);
      return;
    }
    setConfirmingAdmin(null);
    void run(() => setUserRole(row.userId, group));
  }

  if (rows.length === 0) {
    return (
      <>
        <ErrorBanner message={cognitoError} />
        <div className="bg-card border border-border rounded-2xl">
          <EmptyState
            title="No hay usuarios"
            description="En cuanto alguien se registre en el sitio aparecerá aquí, incluso antes de que complete su perfil."
          />
        </div>
      </>
    );
  }

  return (
    <>
      <ErrorBanner message={cognitoError} />
      <ErrorBanner message={error} />
      <SuccessBanner message={message} />

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-56">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre, correo o id"
            className={`${inputClass} pl-10`}
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setGroupFilter("")}
            className={groupFilter === "" ? primaryBtnSmClass : ghostBtnSmClass}
          >
            Todos ({rows.length})
          </button>
          {COGNITO_GROUPS.map((group) => (
            <button
              key={group}
              type="button"
              onClick={() => setGroupFilter(group)}
              className={groupFilter === group ? primaryBtnSmClass : ghostBtnSmClass}
            >
              {GROUP_LABELS[group]} ({rows.filter((r) => r.group === group).length})
            </button>
          ))}
        </div>
      </div>

      <TableShell>
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b border-border">
            <tr>
              <th className={thClass}>Usuario</th>
              <th className={thClass}>Rol</th>
              <th className={thClass}>Plan</th>
              <th className={thClass}>Cuenta</th>
              <th className={`${thClass} text-right`}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => {
              const draft = planDraft(row);
              const planDirty = Boolean(planDrafts[row.userId]);
              const roleMismatch =
                row.hasProfile &&
                row.profileRole !== null &&
                row.profileRole !== roleForGroup(row.group);

              return (
                <tr key={row.userId} className="border-b border-border last:border-0">
                  <td className={tdClass}>
                    <div className="font-semibold">{row.name || "(sin nombre)"}</div>
                    <div className="text-xs text-muted-foreground">{row.email}</div>
                    <div className="text-xs text-muted-foreground">
                      {row.phone ?? "Sin teléfono"}
                      {row.discipline ? ` · ${row.discipline}` : ""}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {!row.hasProfile ? (
                        <Badge tone="warning">Sin perfil</Badge>
                      ) : null}
                      {row.cognitoMissing ? (
                        <Badge tone="danger">Sin cuenta en Cognito</Badge>
                      ) : null}
                      {row.coachStatus && row.coachStatus !== "NONE" ? (
                        <Badge
                          tone={
                            row.coachStatus === "PENDING"
                              ? "warning"
                              : row.coachStatus === "APPROVED"
                                ? "success"
                                : "danger"
                          }
                        >
                          Coach: {APPROVAL_LABELS[row.coachStatus]}
                        </Badge>
                      ) : null}
                    </div>
                  </td>

                  <td className={tdClass}>
                    <select
                      value={row.group}
                      disabled={pending || row.cognitoMissing}
                      title={
                        row.cognitoMissing
                          ? "Este perfil no tiene cuenta de Cognito, así que no hay grupo que cambiar."
                          : undefined
                      }
                      onChange={(event) => {
                        const group = asEnum(COGNITO_GROUPS, event.target.value);
                        if (group && group !== row.group) changeGroup(row, group);
                      }}
                      className={`${inputSmClass} w-40`}
                    >
                      {COGNITO_GROUPS.map((group) => (
                        <option key={group} value={group}>
                          {GROUP_LABELS[group]}
                        </option>
                      ))}
                    </select>

                    {roleMismatch ? (
                      <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                        El perfil dice {row.profileRole}; se corrige al cambiar el
                        rol.
                      </p>
                    ) : null}

                    {confirmingAdmin === row.userId ? (
                      <div className="mt-2 p-3 rounded-xl border border-destructive/40 bg-destructive/5 space-y-2 w-64">
                        <p className="text-xs flex items-start gap-2">
                          <ShieldAlert size={14} className="mt-0.5 shrink-0" />
                          <span>
                            <strong>{row.name || row.email}</strong> tendrá acceso
                            total al panel: puede borrar contenido y cambiar
                            roles, incluido el tuyo.
                          </span>
                        </p>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() =>
                              void run(
                                () => setUserRole(row.userId, "ADMINS"),
                                () => setConfirmingAdmin(null)
                              )
                            }
                            className={dangerBtnSmClass}
                          >
                            {pending ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : null}
                            Hacer admin
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmingAdmin(null)}
                            className={ghostBtnSmClass}
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </td>

                  <td className={tdClass}>
                    {row.hasProfile ? (
                      <div className="space-y-2 w-44">
                        <select
                          value={draft.tier}
                          disabled={pending}
                          onChange={(e) =>
                            setPlanDraft(row, {
                              tier: (asEnum(PLAN_TIERS, e.target.value) ??
                                "") as PlanTier | "",
                            })
                          }
                          className={inputSmClass}
                        >
                          <option value="">Sin plan</option>
                          {PLAN_TIERS.map((tier) => (
                            <option key={tier} value={tier}>
                              {tier}
                            </option>
                          ))}
                        </select>

                        <select
                          value={draft.status}
                          disabled={pending}
                          onChange={(e) =>
                            setPlanDraft(row, {
                              status: (asEnum(PAYMENT_STATUSES, e.target.value) ??
                                "") as PaymentStatus | "",
                            })
                          }
                          className={inputSmClass}
                        >
                          <option value="">Sin estatus</option>
                          {PAYMENT_STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {PAYMENT_STATUS_LABELS[status]}
                            </option>
                          ))}
                        </select>

                        {planDirty ? (
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() =>
                              void run(
                                () =>
                                  updateUserPlan(
                                    row.userId,
                                    draft.tier === "" ? null : draft.tier,
                                    draft.status === "" ? null : draft.status
                                  ),
                                () => clearPlanDraft(row.userId)
                              )
                            }
                            className={primaryBtnSmClass}
                          >
                            {pending ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <Save size={14} />
                            )}
                            Guardar plan
                          </button>
                        ) : null}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        Sin perfil que editar
                      </span>
                    )}
                  </td>

                  <td className={tdClass}>
                    <div className="flex flex-wrap gap-1">
                      {row.enabled ? (
                        <Badge tone="success">Habilitada</Badge>
                      ) : (
                        <Badge tone="danger">Deshabilitada</Badge>
                      )}
                      {row.status ? (
                        <Badge
                          tone={row.status === "CONFIRMED" ? "neutral" : "warning"}
                        >
                          {row.status}
                        </Badge>
                      ) : null}
                      {!row.emailVerified && !row.cognitoMissing ? (
                        <Badge tone="warning">Correo sin verificar</Badge>
                      ) : null}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {row.createdAt ? formatDateTime(row.createdAt) : "—"}
                    </div>
                  </td>

                  <td className={`${tdClass} text-right`}>
                    <div className="flex flex-col items-end gap-2">
                      <button
                        type="button"
                        disabled={pending || row.cognitoMissing}
                        title={
                          row.cognitoMissing
                            ? "Solo se puede habilitar o deshabilitar una cuenta que exista en Cognito."
                            : undefined
                        }
                        onClick={() =>
                          void run(() => setUserEnabled(row.userId, !row.enabled))
                        }
                        className={row.enabled ? dangerBtnSmClass : ghostBtnSmClass}
                      >
                        {row.enabled ? (
                          <ToggleRight size={14} />
                        ) : (
                          <ToggleLeft size={14} />
                        )}
                        {row.enabled ? "Deshabilitar" : "Habilitar"}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </TableShell>

      {visible.length === 0 ? (
        <p className="text-sm text-muted-foreground mt-4">
          Ningún usuario coincide con la búsqueda.
        </p>
      ) : null}
    </>
  );
}

function roleForGroup(group: CognitoGroup): string {
  return group === "ADMINS" ? "ADMIN" : group === "COACHES" ? "COACH" : "ATHLETE";
}
