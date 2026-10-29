"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  AlertCircle,
  CheckCircle,
  ChevronRight,
  Clock,
  Loader2,
  Search,
  Star,
  TrendingUp,
  User,
  Users,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { mediaUrl } from "@/lib/media";
import { loadAthleteDetail } from "@/lib/member-actions";
import EvaluationForm from "./EvaluationForm";
import {
  formatDuration,
  mediumDateLabel,
  metricLabel,
  parseTimeOfDay,
  relativeDayLabel,
} from "./metrics";
import type {
  AthleteDetail,
  AthleteListRow,
  ClassSessionRow,
  SessionStatus,
} from "./types";

/**
 * Coach panel, tablet-first.
 *
 * The athlete list and today's classes come from the server render. Picking an
 * athlete pulls their history through a Server Action (which re-checks
 * `requireRole('coach')`) rather than shipping every athlete's full record to
 * the browser up front.
 */

const PLAN_LABELS: Record<string, string> = {
  basic: "Básico",
  pro: "Pro",
  elite: "Elite",
};

/**
 * The stored `status` wins; otherwise the class is placed against the clock.
 * `now` stays null until after mount so the server HTML and the first client
 * render agree.
 */
function sessionState(
  session: ClassSessionRow,
  nowMinutes: number | null
): SessionStatus {
  if (session.status) return session.status;
  const start = parseTimeOfDay(session.time);
  if (nowMinutes === null || start === null) return "upcoming";
  if (nowMinutes < start) return "upcoming";
  // Classes run about an hour; after that they count as done.
  return nowMinutes < start + 60 ? "active" : "completed";
}

function initialsOf(name: string): string {
  return (
    name
      .split(" ")
      .map((part) => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"
  );
}

export default function CoachPanel({
  coachName,
  athletes,
  todaysClasses,
  loadError,
}: {
  coachName: string;
  athletes: AthleteListRow[];
  todaysClasses: ClassSessionRow[];
  loadError: string | null;
}) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AthleteDetail | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [loading, startLoading] = useTransition();
  const [nowMinutes, setNowMinutes] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setNowMinutes(now.getHours() * 60 + now.getMinutes());
    };
    tick();
    const interval = setInterval(tick, 60_000);
    return () => clearInterval(interval);
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return athletes;
    return athletes.filter(
      (athlete) =>
        athlete.name.toLowerCase().includes(needle) ||
        athlete.email.toLowerCase().includes(needle) ||
        (athlete.discipline ?? "").toLowerCase().includes(needle)
    );
  }, [athletes, query]);

  const selected = athletes.find((a) => a.userId === selectedId) ?? null;

  const classStates = todaysClasses.map((session) => ({
    session,
    state: sessionState(session, nowMinutes),
  }));
  const current =
    classStates.find((entry) => entry.state === "active") ??
    classStates.find((entry) => entry.state === "upcoming") ??
    null;

  function loadDetail(athleteId: string) {
    setDetailError(null);
    startLoading(async () => {
      const result = await loadAthleteDetail(athleteId);
      if (result.ok) setDetail(result.data);
      else {
        setDetail(null);
        setDetailError(result.error);
      }
    });
  }

  function selectAthlete(athleteId: string) {
    setSelectedId(athleteId);
    setDetail(null);
    loadDetail(athleteId);
  }

  // Latest value per metric, so the coach sees where the athlete stands.
  const latestProgress = useMemo(() => {
    if (!detail) return [];
    const latest = new Map<string, { value: number; unit: string | null; date: string }>();
    for (const row of detail.progress) {
      const current = latest.get(row.metric);
      if (!current || row.date >= current.date) {
        latest.set(row.metric, {
          value: row.value,
          unit: row.unit,
          date: row.date,
        });
      }
    }
    return [...latest.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(0, 12);
  }, [detail]);

  return (
    <main className="min-h-screen pt-20 pb-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between gap-4 mb-8 flex-wrap">
          <div>
            <h1 className="text-3xl font-black">{t.coach.title}</h1>
            <p className="text-muted-foreground">
              Coach <span className="text-primary font-bold">{coachName}</span>
              {athletes.length > 0 &&
                ` — ${athletes.length} atleta${
                  athletes.length === 1 ? "" : "s"
                }`}
            </p>
          </div>
          {current && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 border border-primary/20">
              <Clock size={16} className="text-primary" />
              <span className="text-sm font-medium">
                {current.session.time ?? "Hoy"} — {current.session.name}
              </span>
            </div>
          )}
        </div>

        {loadError && (
          <div className="mb-6 p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-sm text-destructive">
            Algunos datos no se pudieron cargar: {loadError}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: athletes + today's classes */}
          <div className="space-y-6">
            <div className="bg-card border border-border rounded-2xl p-5">
              <h3 className="font-bold mb-3 flex items-center gap-2">
                <User size={16} className="text-primary" />
                {t.coach.selectStudent}
              </h3>
              <div className="relative mb-3">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  type="text"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-muted border border-input focus:border-primary outline-none text-sm"
                  placeholder="Buscar atleta..."
                  aria-label="Buscar atleta"
                />
              </div>

              {athletes.length === 0 ? (
                <div className="text-center py-6">
                  <Users size={28} className="text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm font-medium">Aún no hay atletas</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    En cuanto alguien se registre aparecerá en esta lista.
                  </p>
                </div>
              ) : filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Ningún atleta coincide con “{query}”.
                </p>
              ) : (
                <div className="space-y-1 max-h-[340px] overflow-y-auto">
                  {filtered.map((athlete) => {
                    const avatar = mediaUrl(athlete.avatarKey);
                    return (
                      <button
                        key={athlete.userId}
                        onClick={() => selectAthlete(athlete.userId)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors text-left ${
                          selectedId === athlete.userId
                            ? "bg-primary/10 border border-primary/30"
                            : "hover:bg-muted"
                        }`}
                      >
                        <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary overflow-hidden shrink-0">
                          {avatar ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={avatar}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            initialsOf(athlete.name)
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">
                            {athlete.name || athlete.email}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {athlete.discipline ?? "Sin disciplina"}
                            {athlete.planTier &&
                              ` • ${PLAN_LABELS[athlete.planTier] ?? athlete.planTier}`}
                            {" • "}
                            {athlete.lastSessionDate
                              ? relativeDayLabel(athlete.lastSessionDate)
                              : "Sin sesiones"}
                          </div>
                        </div>
                        <ChevronRight size={14} className="text-muted-foreground shrink-0" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="bg-card border border-border rounded-2xl p-5">
              <h3 className="font-bold mb-3 flex items-center gap-2">
                <Clock size={16} className="text-primary" />
                {t.coach.todaysSessions}
              </h3>
              {classStates.length > 0 ? (
                <div className="space-y-2">
                  {classStates.map(({ session, state }) => (
                    <div
                      key={session.id}
                      className={`flex items-center gap-3 p-3 rounded-xl ${
                        state === "active"
                          ? "bg-primary/10 border border-primary/20"
                          : "bg-muted/50"
                      }`}
                    >
                      <div
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          state === "completed"
                            ? "bg-green-500"
                            : state === "active"
                            ? "bg-primary animate-pulse"
                            : "bg-muted-foreground"
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {session.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {session.time ?? "Horario por confirmar"}
                          {session.enrolled != null &&
                            ` • ${session.enrolled} atleta${
                              session.enrolled === 1 ? "" : "s"
                            }`}
                          {session.capacity != null && ` / ${session.capacity}`}
                        </div>
                      </div>
                      {state === "completed" && (
                        <CheckCircle size={14} className="text-green-500 shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Hoy no hay clases programadas.
                </p>
              )}
            </div>
          </div>

          {/* Right: evaluation + history */}
          <div className="lg:col-span-2 space-y-6">
            {selected ? (
              <>
                <EvaluationForm
                  athlete={selected}
                  onSaved={() => loadDetail(selected.userId)}
                />

                {detailError && (
                  <div className="flex items-start gap-2 p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-sm text-destructive">
                    <AlertCircle size={18} className="shrink-0" />
                    <span className="font-medium">{detailError}</span>
                  </div>
                )}

                {/* Latest readings */}
                <div className="bg-card border border-border rounded-2xl p-6">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <TrendingUp size={18} className="text-primary" />
                    {t.coach.studentProgress}
                    {loading && (
                      <Loader2 size={14} className="animate-spin text-muted-foreground" />
                    )}
                  </h3>
                  {latestProgress.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {latestProgress.map(([metric, row]) => (
                        <div key={metric} className="p-3 rounded-xl bg-muted">
                          <div className="text-xs text-muted-foreground truncate">
                            {metricLabel(metric)}
                          </div>
                          <div className="font-black text-lg">
                            {row.unit === "s"
                              ? formatDuration(row.value)
                              : row.value}
                            {row.unit && row.unit !== "s" && (
                              <span className="text-xs font-medium text-muted-foreground ml-1">
                                {row.unit}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {mediumDateLabel(row.date)}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Este atleta todavía no tiene métricas. Guarda una
                      evaluación con números y aparecerán aquí y en su panel.
                    </p>
                  )}
                </div>

                {/* Evaluation history */}
                <div className="bg-card border border-border rounded-2xl p-6">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Star size={18} className="text-primary" />
                    {t.coach.history}
                  </h3>
                  {detail && detail.evaluations.length > 0 ? (
                    <div className="space-y-3">
                      {detail.evaluations.slice(0, 8).map((evaluation) => (
                        <div
                          key={evaluation.id}
                          className="flex items-center gap-4 p-3 rounded-xl bg-muted"
                        >
                          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                            <span className="text-sm font-bold text-primary">
                              {evaluation.performance ?? "—"}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">
                              {evaluation.discipline ?? "Evaluación"}
                              {evaluation.coachName &&
                                ` • ${evaluation.coachName}`}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {mediumDateLabel(evaluation.date)} • T{" "}
                              {evaluation.technique ?? "—"} / E{" "}
                              {evaluation.effort ?? "—"}
                            </div>
                          </div>
                          <div className="text-sm text-muted-foreground max-w-[220px] truncate hidden sm:block">
                            {evaluation.notes ?? ""}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {loading
                        ? "Cargando historial…"
                        : "Sin evaluaciones previas. Esta será la primera."}
                    </p>
                  )}

                  {detail && detail.photos.length > 0 && (
                    <div className="mt-6 pt-4 border-t border-border">
                      <h4 className="text-sm font-bold mb-3">
                        Fotos de progreso ({detail.photos.length})
                      </h4>
                      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                        {detail.photos.slice(0, 12).map((photo) => {
                          const url = mediaUrl(photo.key);
                          return (
                            <div
                              key={photo.id}
                              className="aspect-square rounded-xl overflow-hidden bg-muted border border-border"
                              title={photo.caption ?? undefined}
                            >
                              {url && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={url}
                                  alt={photo.caption ?? "Foto de progreso"}
                                  loading="lazy"
                                  className="w-full h-full object-cover"
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="bg-card border border-border rounded-2xl p-12 text-center">
                <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <User size={40} className="text-muted-foreground" />
                </div>
                <h3 className="text-xl font-bold mb-2">
                  {t.coach.selectStudent}
                </h3>
                <p className="text-muted-foreground">
                  {athletes.length === 0
                    ? "Cuando haya atletas registrados podrás evaluarlos desde aquí."
                    : "Selecciona un atleta de la lista para comenzar la evaluación"}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
