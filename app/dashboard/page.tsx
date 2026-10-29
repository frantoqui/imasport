import Navbar from "@/components/Navbar";
import DashboardView from "@/components/member/DashboardView";
import { deriveStats } from "@/components/member/metrics";
import type {
  AchievementRow,
  AppointmentRow,
  BodyMetricRow,
  ClassSessionRow,
  EventRegistrationRow,
  ProgressRow,
  WorkoutRow,
} from "@/components/member/types";
import { getMyProfile, requireSession } from "@/lib/dal";
import {
  getMyAchievements,
  getMyAppointments,
  getMyBodyMetrics,
  getMyEventRegistrations,
  getMyProgress,
  getMyWorkouts,
  getNextClass,
} from "@/lib/member-queries";

/**
 * Athlete dashboard.
 *
 * `proxy.ts` already keeps signed-out visitors away, but that is an optimistic
 * pre-filter — the page gates itself, and every read below runs as the viewer
 * so AppSync enforces ownership regardless.
 *
 * Reads are issued in parallel and each one is allowed to fail on its own: a
 * single unavailable panel degrades to its empty state and the reason is shown
 * once at the top, rather than taking the whole dashboard down.
 */
export const metadata = {
  title: "Mi Panel de Progreso | IMASPORT",
};

/**
 * Resolves a read, collecting the reason instead of throwing. The label is
 * part of the message because "No current user" on its own tells nobody which
 * panel is empty and why.
 */
async function soft<T>(
  label: string,
  promise: Promise<T>,
  fallback: T,
  problems: string[]
): Promise<T> {
  try {
    return await promise;
  } catch (error) {
    problems.push(
      `${label}: ${error instanceof Error ? error.message : String(error)}`
    );
    return fallback;
  }
}

export default async function DashboardPage() {
  const session = await requireSession();
  const problems: string[] = [];

  const [
    profile,
    workouts,
    progress,
    bodyMetrics,
    achievements,
    nextClass,
    registrations,
    appointments,
  ] = await Promise.all([
    soft("Perfil", getMyProfile(), null, problems),
    soft<WorkoutRow[]>(
      "Entrenamientos",
      getMyWorkouts(session.userId),
      [],
      problems
    ),
    soft<ProgressRow[]>(
      "Progreso",
      getMyProgress(session.userId),
      [],
      problems
    ),
    soft<BodyMetricRow[]>(
      "Métricas corporales",
      getMyBodyMetrics(session.userId),
      [],
      problems
    ),
    soft<AchievementRow[]>(
      "Logros",
      getMyAchievements(session.userId),
      [],
      problems
    ),
    soft<ClassSessionRow | null>("Próxima clase", getNextClass(), null, problems),
    soft<EventRegistrationRow[]>(
      "Eventos",
      getMyEventRegistrations(session.userId),
      [],
      problems
    ),
    soft<AppointmentRow[]>(
      "Citas",
      getMyAppointments(session.userId),
      [],
      problems
    ),
  ]);

  const stats = deriveStats(workouts, progress);

  const upcomingAppointments = appointments.filter(
    (appointment) =>
      appointment.status !== "CANCELLED" && appointment.status !== "COMPLETED"
  );

  return (
    <>
      <Navbar />
      <DashboardView
        name={profile?.name || session.email}
        discipline={profile?.discipline ?? null}
        stats={stats}
        workouts={workouts}
        recentWorkouts={workouts.slice(0, 5)}
        progress={progress}
        bodyMetrics={bodyMetrics}
        achievements={achievements}
        nextClass={nextClass}
        registrations={registrations}
        appointments={upcomingAppointments}
        loadError={problems.length > 0 ? problems.join(" · ") : null}
      />
    </>
  );
}
