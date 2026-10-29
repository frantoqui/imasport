"use client";

import { useState } from "react";
import { CheckCircle2, Download, Loader2, Trash2 } from "lucide-react";
import { deleteRegistration, setRegistrationStatus } from "@/lib/admin-actions";
import { useAdminAction } from "./useAdminAction";
import {
  REGISTRATION_STATUSES,
  REGISTRATION_STATUS_LABELS,
  asEnum,
  slugify,
  type RegistrationStatus,
} from "./types";
import {
  Badge,
  EmptyState,
  ErrorBanner,
  SuccessBanner,
  TableShell,
  dangerBtnSmClass,
  formatDateTime,
  ghostBtnClass,
  ghostBtnSmClass,
  iconBtnClass,
  inputSmClass,
  primaryBtnSmClass,
  tdClass,
  thClass,
} from "./ui";

export type RegistrationRowData = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  status: RegistrationStatus | null;
  notes: string | null;
  createdAt: string | null;
};

const STATUS_TONE: Record<RegistrationStatus, "success" | "warning" | "danger" | "primary"> =
  {
    REGISTERED: "success",
    WAITLIST: "warning",
    CANCELLED: "danger",
    ATTENDED: "primary",
  };

/** RFC-4180 quoting: wrap every field and double any embedded quote. */
function csvCell(value: string | null | undefined): string {
  return `"${(value ?? "").replace(/"/g, '""')}"`;
}

export function RegistrationsTable({
  eventId,
  eventTitle,
  rows,
}: {
  eventId: string;
  eventTitle: string;
  rows: RegistrationRowData[];
}) {
  const [filter, setFilter] = useState<RegistrationStatus | "">("");
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const { pending, error, message, run } = useAdminAction();

  const visible = filter === "" ? rows : rows.filter((r) => r.status === filter);

  const counts = REGISTRATION_STATUSES.map((status) => ({
    status,
    total: rows.filter((r) => r.status === status).length,
  }));

  /**
   * Builds the CSV from the rows already on screen — no extra endpoint, and
   * what you export is exactly what you are looking at.
   */
  function downloadCsv() {
    const header = [
      "Nombre",
      "Email",
      "Teléfono",
      "Estatus",
      "Notas",
      "Fecha de inscripción",
    ];
    const lines = [
      header.map(csvCell).join(","),
      ...visible.map((row) =>
        [
          csvCell(row.name),
          csvCell(row.email),
          csvCell(row.phone),
          csvCell(row.status ? REGISTRATION_STATUS_LABELS[row.status] : ""),
          csvCell(row.notes),
          csvCell(row.createdAt ? formatDateTime(row.createdAt) : ""),
        ].join(",")
      ),
    ];

    // The BOM is what makes Excel on Windows read the accents correctly.
    const blob = new Blob(["﻿", lines.join("\r\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `inscripciones-${slugify(eventTitle) || eventId}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  if (rows.length === 0) {
    return (
      <div className="bg-card border border-border rounded-2xl">
        <EmptyState
          title="Nadie se ha inscrito todavía"
          description="Las inscripciones llegan desde la página pública del evento. Cuando haya alguien, aquí podrás cambiar su estatus, marcar asistencia y exportar la lista."
        />
      </div>
    );
  }

  return (
    <>
      <ErrorBanner message={error} />
      <SuccessBanner message={message} />

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setFilter("")}
            className={
              filter === ""
                ? primaryBtnSmClass
                : `${ghostBtnSmClass} border-border`
            }
          >
            Todas ({rows.length})
          </button>
          {counts.map(({ status, total }) => (
            <button
              key={status}
              type="button"
              onClick={() => setFilter(status)}
              className={
                filter === status
                  ? primaryBtnSmClass
                  : `${ghostBtnSmClass} border-border`
              }
            >
              {REGISTRATION_STATUS_LABELS[status]} ({total})
            </button>
          ))}
        </div>

        <button type="button" onClick={downloadCsv} className={ghostBtnClass}>
          <Download size={16} />
          Descargar CSV ({visible.length})
        </button>
      </div>

      <TableShell>
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b border-border">
            <tr>
              <th className={thClass}>Atleta</th>
              <th className={thClass}>Contacto</th>
              <th className={thClass}>Estatus</th>
              <th className={thClass}>Inscrito</th>
              <th className={`${thClass} text-right`}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr key={row.id} className="border-b border-border last:border-0">
                <td className={tdClass}>
                  <div className="font-semibold">{row.name}</div>
                  {row.notes ? (
                    <div className="text-xs text-muted-foreground max-w-xs">
                      {row.notes}
                    </div>
                  ) : null}
                </td>

                <td className={tdClass}>
                  <div className="text-xs">{row.email}</div>
                  <div className="text-xs text-muted-foreground">
                    {row.phone ?? "Sin teléfono"}
                  </div>
                </td>

                <td className={tdClass}>
                  <div className="flex items-center gap-2">
                    <select
                      value={row.status ?? ""}
                      disabled={pending}
                      onChange={(event) => {
                        const next = asEnum(
                          REGISTRATION_STATUSES,
                          event.target.value
                        );
                        if (next) {
                          void run(() =>
                            setRegistrationStatus(row.id, eventId, next)
                          );
                        }
                      }}
                      className={`${inputSmClass} w-40`}
                    >
                      {row.status === null ? (
                        <option value="">Sin estatus</option>
                      ) : null}
                      {REGISTRATION_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {REGISTRATION_STATUS_LABELS[status]}
                        </option>
                      ))}
                    </select>
                    {row.status ? (
                      <Badge tone={STATUS_TONE[row.status]}>
                        {REGISTRATION_STATUS_LABELS[row.status]}
                      </Badge>
                    ) : null}
                  </div>
                </td>

                <td className={tdClass}>
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(row.createdAt)}
                  </span>
                </td>

                <td className={`${tdClass} text-right`}>
                  {confirmingId === row.id ? (
                    <div className="inline-flex items-center gap-2">
                      <span className="text-xs">¿Borrar?</span>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() =>
                          void run(
                            () => deleteRegistration(row.id, eventId),
                            () => setConfirmingId(null)
                          )
                        }
                        className={dangerBtnSmClass}
                      >
                        {pending ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : null}
                        Sí
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmingId(null)}
                        className={ghostBtnSmClass}
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        title="Marcar asistencia"
                        aria-label="Marcar asistencia"
                        disabled={pending || row.status === "ATTENDED"}
                        onClick={() =>
                          void run(() =>
                            setRegistrationStatus(row.id, eventId, "ATTENDED")
                          )
                        }
                        className={iconBtnClass}
                      >
                        <CheckCircle2
                          size={16}
                          className={
                            row.status === "ATTENDED"
                              ? "text-primary"
                              : "text-muted-foreground"
                          }
                        />
                      </button>
                      <button
                        type="button"
                        title="Borrar"
                        aria-label="Borrar"
                        disabled={pending}
                        onClick={() => setConfirmingId(row.id)}
                        className={iconBtnClass}
                      >
                        <Trash2 size={16} className="text-destructive" />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableShell>

      {visible.length === 0 ? (
        <p className="text-sm text-muted-foreground mt-4">
          Ninguna inscripción con ese estatus.
        </p>
      ) : null}
    </>
  );
}
