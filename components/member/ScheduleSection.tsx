"use client";

import { useState, useTransition } from "react";
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  Clock,
  Loader2,
  X,
  XCircle,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cancelAppointment, createAppointment } from "@/lib/member-actions";
import { mediumDateLabel, todayKey } from "./metrics";
import type { AppointmentRow, CoachRow } from "./types";

/**
 * "Agendar Sesión con Coach" — real `Appointment` rows.
 *
 * A booking is created with status PENDING; a coach confirms it from their own
 * panel. The athlete can cancel, which sets CANCELLED rather than deleting,
 * so the coach still sees what happened to the slot.
 */

const selectClass =
  "w-full px-4 py-3 rounded-xl bg-muted border border-input focus:border-primary outline-none transition-all";

const TIMES = [
  "7:00 AM",
  "8:00 AM",
  "9:00 AM",
  "10:00 AM",
  "5:00 PM",
  "6:00 PM",
  "7:00 PM",
  "8:00 PM",
];

const STATUS_STYLES = {
  PENDING: {
    label: "Pendiente",
    tint: "bg-yellow-500/10",
    icon: "text-yellow-500",
  },
  CONFIRMED: {
    label: "Confirmada",
    tint: "bg-green-500/10",
    icon: "text-green-500",
  },
  COMPLETED: {
    label: "Completada",
    tint: "bg-muted",
    icon: "text-muted-foreground",
  },
  CANCELLED: {
    label: "Cancelada",
    tint: "bg-destructive/10",
    icon: "text-destructive",
  },
} as const;

export default function ScheduleSection({
  coaches,
  appointments,
}: {
  coaches: CoachRow[];
  appointments: AppointmentRow[];
}) {
  const { t } = useI18n();

  const sessionTypes = [
    t.schedule.types.evaluation,
    t.schedule.types.personal,
    t.schedule.types.technique,
    t.schedule.types.planning,
  ];

  const [coachId, setCoachId] = useState(coaches[0]?.id ?? "");
  const [sessionType, setSessionType] = useState(sessionTypes[0]);
  const [date, setDate] = useState("");
  const [time, setTime] = useState(TIMES[0]);
  const [pending, startPending] = useTransition();
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [status, setStatus] = useState<
    { kind: "ok" | "error"; message: string } | null
  >(null);

  const upcoming = appointments.filter(
    (appointment) => appointment.status !== "CANCELLED"
  );

  function handleBook() {
    setStatus(null);
    const coach = coaches.find((c) => c.id === coachId);

    startPending(async () => {
      const result = await createAppointment({
        // CoachProfile is a curated card; `userId` is only set when the coach
        // has a real account, so it is sent as-is and may be null.
        coachId: coach?.userId ?? null,
        coachName: coach?.name ?? null,
        sessionType,
        date,
        time,
      });

      if (result.ok) {
        setStatus({
          kind: "ok",
          message: "Cita solicitada. Tu coach la confirmará pronto.",
        });
        setDate("");
      } else {
        setStatus({ kind: "error", message: result.error });
      }
    });
  }

  function handleCancel(appointmentId: string) {
    setStatus(null);
    setCancellingId(appointmentId);
    startPending(async () => {
      const result = await cancelAppointment(appointmentId);
      setCancellingId(null);
      setStatus(
        result.ok
          ? { kind: "ok", message: "Cita cancelada." }
          : { kind: "error", message: result.error }
      );
    });
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-6 mb-6">
      <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
        <Calendar size={18} className="text-primary" />
        {t.schedule.title}
      </h3>

      {coaches.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Todavía no hay coaches publicados para agendar. Vuelve pronto.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2" htmlFor="appointment-coach">
                {t.schedule.selectCoach}
              </label>
              <select
                id="appointment-coach"
                value={coachId}
                onChange={(event) => setCoachId(event.target.value)}
                className={selectClass}
              >
                {coaches.map((coach) => (
                  <option key={coach.id} value={coach.id}>
                    {coach.name}
                    {coach.discipline ? ` — ${coach.discipline}` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" htmlFor="appointment-type">
                {t.schedule.sessionType}
              </label>
              <select
                id="appointment-type"
                value={sessionType}
                onChange={(event) => setSessionType(event.target.value)}
                className={selectClass}
              >
                {sessionTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" htmlFor="appointment-date">
                {t.schedule.selectDate}
              </label>
              <input
                id="appointment-date"
                type="date"
                value={date}
                min={todayKey()}
                onChange={(event) => setDate(event.target.value)}
                className={selectClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" htmlFor="appointment-time">
                {t.schedule.selectTime}
              </label>
              <select
                id="appointment-time"
                value={time}
                onChange={(event) => setTime(event.target.value)}
                className={selectClass}
              >
                {TIMES.map((slot) => (
                  <option key={slot} value={slot}>
                    {slot}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={handleBook}
            disabled={pending || !date}
            className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary-hover transition-colors disabled:opacity-70"
          >
            {pending && !cancellingId ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Calendar size={16} />
            )}
            {t.schedule.confirm}
          </button>
        </>
      )}

      {status && (
        <div
          className={`mt-4 flex items-start gap-2 p-3 rounded-xl text-sm ${
            status.kind === "ok"
              ? "bg-primary/10 border border-primary/20 text-primary"
              : "bg-destructive/10 border border-destructive/20 text-destructive"
          }`}
        >
          {status.kind === "ok" ? (
            <CheckCircle size={16} className="shrink-0" />
          ) : (
            <AlertCircle size={16} className="shrink-0" />
          )}
          <span className="font-medium">{status.message}</span>
        </div>
      )}

      {/* Upcoming Appointments */}
      <div className="mt-6 pt-4 border-t border-border">
        <h4 className="text-sm font-bold mb-3 flex items-center gap-2">
          <Clock size={14} className="text-muted-foreground" />
          {t.schedule.upcoming}
        </h4>
        {upcoming.length > 0 ? (
          <div className="space-y-2">
            {upcoming.map((appointment) => {
              const style =
                STATUS_STYLES[appointment.status ?? "PENDING"] ??
                STATUS_STYLES.PENDING;
              const cancellable =
                appointment.status === "PENDING" ||
                appointment.status === "CONFIRMED";

              return (
                <div
                  key={appointment.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-muted"
                >
                  <div className={`p-2 rounded-lg ${style.tint}`}>
                    <Calendar size={14} className={style.icon} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {appointment.sessionType ?? "Sesión"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {appointment.coachName
                        ? `Coach ${appointment.coachName} • `
                        : ""}
                      {mediumDateLabel(appointment.date)}
                      {appointment.time && `, ${appointment.time}`}
                    </div>
                  </div>
                  <span className={`text-xs font-medium ${style.icon} shrink-0`}>
                    {style.label}
                  </span>
                  {cancellable ? (
                    <button
                      type="button"
                      onClick={() => handleCancel(appointment.id)}
                      disabled={pending}
                      aria-label={`Cancelar ${appointment.sessionType ?? "sesión"}`}
                      className="p-2 rounded-lg hover:bg-background text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50 shrink-0"
                    >
                      {cancellingId === appointment.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <X size={14} />
                      )}
                    </button>
                  ) : (
                    <XCircle size={14} className="text-transparent shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {t.schedule.noSessions}. Elige un coach arriba para tu primera
            sesión.
          </p>
        )}
      </div>
    </div>
  );
}
