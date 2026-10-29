"use client";

import Link from "next/link";
import {
  Activity,
  Calendar,
  CalendarPlus,
  ChevronRight,
  Flame,
  Images,
  MapPin,
  Trophy,
  User,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import DashboardCharts from "@/components/DashboardCharts";
import { achievementIcon, disciplineIcon } from "./icons";
import {
  formatDelta,
  formatDuration,
  mediumDateLabel,
  relativeDayLabel,
} from "./metrics";
import type {
  AchievementRow,
  AppointmentRow,
  BodyMetricRow,
  ClassSessionRow,
  DashboardStats,
  Discipline,
  EventRegistrationRow,
  ProgressRow,
  StatValue,
  WorkoutRow,
} from "./types";

/**
 * The athlete dashboard.
 *
 * Every number here is derived from real rows, and a brand-new athlete has
 * none of them — so each panel has a real empty state that tells them what to
 * do next. Nothing on this page invents a figure: when a month-over-month
 * delta cannot be computed honestly the delta line is simply absent.
 */

/**
 * Tailwind v4 only emits classes it can find in the source, so the tint is a
 * pair of literal strings rather than something built from the other at
 * runtime — a computed `bg-${colour}` would never make it into the CSS.
 */
function StatCard({
  label,
  value,
  stat,
  icon: Icon,
  tintBg,
  tintText,
  note,
  deltaSuffix,
}: {
  label: string;
  value: string;
  stat?: StatValue;
  icon: LucideIcon;
  tintBg: string;
  tintText: string;
  note?: string | null;
  deltaSuffix?: string;
}) {
  const delta = stat?.delta ?? null;

  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <div className="flex items-center gap-3 mb-2">
        <div className={`p-2 rounded-xl ${tintBg}`}>
          <Icon size={20} className={tintText} />
        </div>
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <div className="text-3xl font-black">{value}</div>
      {delta !== null ? (
        <div
          className={`text-xs mt-1 ${
            delta > 0
              ? "text-green-500"
              : delta < 0
              ? "text-muted-foreground"
              : "text-muted-foreground"
          }`}
        >
          {formatDelta(delta, deltaSuffix ?? "vs mes anterior")}
        </div>
      ) : note ? (
        <div className="text-xs text-muted-foreground mt-1">{note}</div>
      ) : null}
    </div>
  );
}

function EmptyPanel({
  icon: Icon,
  title,
  children,
  action,
}: {
  icon: LucideIcon;
  title: string;
  children: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="flex flex-col items-center text-center py-8 px-2">
      <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
        <Icon size={24} className="text-primary" />
      </div>
      <p className="font-bold text-sm">{title}</p>
      <p className="text-xs text-muted-foreground mt-1 max-w-[280px]">
        {children}
      </p>
      {action && (
        <Link
          href={action.href}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary-hover transition-colors"
        >
          {action.label}
          <ChevronRight size={14} />
        </Link>
      )}
    </div>
  );
}

export default function DashboardView({
  name,
  discipline,
  stats,
  workouts,
  recentWorkouts,
  progress,
  bodyMetrics,
  achievements,
  nextClass,
  registrations,
  appointments,
  loadError,
}: {
  name: string;
  discipline: Discipline | null;
  stats: DashboardStats;
  /** Full history, used by the weekly calories chart. */
  workouts: WorkoutRow[];
  /** The handful shown in "Entrenamientos Recientes". */
  recentWorkouts: WorkoutRow[];
  progress: ProgressRow[];
  bodyMetrics: BodyMetricRow[];
  achievements: AchievementRow[];
  nextClass: ClassSessionRow | null;
  registrations: EventRegistrationRow[];
  appointments: AppointmentRow[];
  loadError: string | null;
}) {
  const { t } = useI18n();
  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const firstName = name.split(" ")[0] || name;

  return (
    <main className="min-h-screen pt-20 pb-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black">{t.dashboard.title}</h1>
            <p className="text-muted-foreground">
              {t.dashboard.welcome},{" "}
              <span className="text-primary font-bold">{firstName}</span>! ⚡
            </p>
          </div>
          <Link
            href="/profile"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-card border border-border hover:border-primary transition-colors"
          >
            <User size={18} />
            <span className="hidden sm:inline text-sm font-medium">
              {t.nav.profile}
            </span>
          </Link>
        </div>

        {loadError && (
          <div className="mb-6 p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-sm text-destructive">
            Algunos datos no se pudieron cargar: {loadError}
          </div>
        )}

        {/* Stats Grid — all four derived from Workout and ProgressEntry rows */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            label={t.dashboard.stats.sessions}
            value={String(stats.sessionsThisMonth.value)}
            stat={stats.sessionsThisMonth}
            icon={Activity}
            tintBg="bg-blue-500/10"
            tintText="text-blue-500"
            note={
              stats.sessionsThisMonth.value === 0
                ? "Tu primera sesión cuenta"
                : "Primer mes registrado"
            }
          />
          <StatCard
            label={t.dashboard.stats.streak}
            value={
              stats.streakDays === 1
                ? "1 día"
                : `${stats.streakDays} días`
            }
            icon={Flame}
            tintBg="bg-orange-500/10"
            tintText="text-orange-500"
            note={
              stats.streakDays === 0
                ? "Entrena hoy para empezar"
                : stats.streakDays >= 7
                ? "¡Sigue así!"
                : "En construcción"
            }
          />
          <StatCard
            label={t.dashboard.stats.pr}
            value={String(stats.prsThisMonth.value)}
            stat={stats.prsThisMonth}
            icon={Trophy}
            tintBg="bg-purple-500/10"
            tintText="text-purple-500"
            note={
              stats.prsThisMonth.value === 0
                ? "Tus récords aparecen aquí"
                : null
            }
          />
          <StatCard
            label={t.dashboard.stats.calories}
            value={stats.caloriesThisMonth.value.toLocaleString("es-MX")}
            stat={stats.caloriesThisMonth}
            icon={Zap}
            tintBg="bg-red-500/10"
            tintText="text-red-500"
            note={
              stats.caloriesThisMonth.value === 0
                ? "Se suman por entrenamiento"
                : null
            }
            deltaSuffix="kcal vs mes anterior"
          />
        </div>

        {/* Charts */}
        <DashboardCharts
          progress={progress}
          workouts={workouts}
          bodyMetrics={bodyMetrics}
          initialDiscipline={discipline}
        />

        {/* Recent Workouts & Achievements */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <div className="bg-card border border-border rounded-2xl p-6">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Calendar size={18} className="text-primary" />
              {t.dashboard.recentWorkouts}
            </h3>
            {recentWorkouts.length > 0 ? (
              <div className="space-y-3">
                {recentWorkouts.map((workout) => {
                  const Icon = disciplineIcon(workout.type);
                  return (
                    <div
                      key={workout.id}
                      className="flex items-center gap-4 p-3 rounded-xl hover:bg-muted transition-colors"
                    >
                      <div className="p-2 rounded-xl bg-primary/10">
                        <Icon size={18} className="text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">
                          {workout.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {workout.type ?? "Entrenamiento"} •{" "}
                          {relativeDayLabel(workout.date)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold">
                          {formatDuration(workout.durationSec)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {workout.calories != null
                            ? `${workout.calories} kcal`
                            : "—"}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyPanel icon={Activity} title="Aún sin entrenamientos">
                En cuanto registres tu primera sesión aparecerá aquí, con su
                duración y las calorías quemadas.
              </EmptyPanel>
            )}
          </div>

          <div className="bg-card border border-border rounded-2xl p-6">
            <h3 className="text-lg font-bold mb-4 flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <Trophy size={18} className="text-primary" />
                {t.dashboard.achievements}
              </span>
              {achievements.length > 0 && (
                <span className="text-xs font-medium text-muted-foreground">
                  {unlockedCount}/{achievements.length}
                </span>
              )}
            </h3>
            {achievements.length > 0 ? (
              <div className="space-y-3">
                {achievements.map((achievement) => {
                  const Icon = achievementIcon(achievement.icon);
                  return (
                    <div
                      key={achievement.code}
                      className={`flex items-center gap-4 p-3 rounded-xl ${
                        achievement.unlocked ? "bg-primary/5" : "opacity-50"
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                          achievement.unlocked
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted border-2 border-dashed border-border"
                        }`}
                      >
                        {achievement.unlocked ? (
                          <Icon size={16} />
                        ) : (
                          <span className="text-xs">?</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">
                          {achievement.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {achievement.description ??
                            (achievement.unlocked ? "Desbloqueado" : "Por desbloquear")}
                        </div>
                      </div>
                      {achievement.unlocked && (
                        <span className="text-xs text-primary font-medium">
                          ✓
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyPanel icon={Trophy} title="Logros en camino">
                Todavía no hay logros configurados. Pronto podrás desbloquearlos
                entrenando.
              </EmptyPanel>
            )}
          </div>
        </div>

        {/* Upcoming events the athlete signed up for */}
        <div className="mt-6 bg-card border border-border rounded-2xl p-6">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <CalendarPlus size={18} className="text-primary" />
            Mis Próximos Eventos
          </h3>
          {registrations.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {registrations.map((registration) => (
                <div
                  key={registration.id}
                  className="flex items-center gap-4 p-3 rounded-xl bg-muted"
                >
                  <div className="p-2 rounded-xl bg-primary/10 shrink-0">
                    <CalendarPlus size={18} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">
                      {registration.eventTitle}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1 flex-wrap">
                      {mediumDateLabel(registration.eventDate)}
                      {registration.eventTime && ` • ${registration.eventTime}`}
                      {registration.eventLocation && (
                        <>
                          {" • "}
                          <MapPin size={11} />
                          {registration.eventLocation}
                        </>
                      )}
                    </div>
                  </div>
                  <span className="text-xs font-medium text-primary shrink-0">
                    {registration.status === "WAITLIST"
                      ? "Lista de espera"
                      : registration.status === "ATTENDED"
                      ? "Asistido"
                      : "Inscrito"}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyPanel
              icon={CalendarPlus}
              title="Sin eventos próximos"
              action={{ href: "/#eventos", label: "Ver eventos" }}
            >
              Inscríbete a una competencia o reto para verlo aquí con su fecha y
              lugar.
            </EmptyPanel>
          )}
        </div>

        {/* Next Class */}
        <div className="mt-6 bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 rounded-2xl p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <div className="p-3 rounded-xl bg-primary text-primary-foreground shrink-0">
                <Calendar size={24} />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold">{t.dashboard.nextClass}</h3>
                {nextClass ? (
                  <p className="text-sm text-muted-foreground">
                    {nextClass.name} — {relativeDayLabel(nextClass.date)}
                    {nextClass.time && ` ${nextClass.time}`}
                    {nextClass.coachName && ` — Coach ${nextClass.coachName}`}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Todavía no hay clases publicadas. Consulta con tu coach o
                    agenda una sesión desde tu perfil.
                  </p>
                )}
              </div>
            </div>
            <Link
              href="/profile"
              className="hidden sm:flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary-hover transition-colors shrink-0"
            >
              {nextClass ? "Agendar sesión" : "Agendar"}
              <ChevronRight size={16} />
            </Link>
          </div>

          {appointments.length > 0 && (
            <div className="mt-4 pt-4 border-t border-primary/20 flex flex-wrap gap-2">
              {appointments.slice(0, 3).map((appointment) => (
                <span
                  key={appointment.id}
                  className="text-xs px-3 py-1.5 rounded-full bg-card border border-border"
                >
                  {appointment.sessionType ?? "Sesión"} •{" "}
                  {mediumDateLabel(appointment.date)}
                  {appointment.time && ` ${appointment.time}`}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-center">
          <Link
            href="/mis-fotos"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-card border border-border hover:border-primary transition-colors text-sm font-medium"
          >
            <Images size={16} className="text-primary" />
            Ver mis fotos de progreso
            <ChevronRight size={14} />
          </Link>
        </div>
      </div>
    </main>
  );
}
