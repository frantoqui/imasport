import AvatarUpload from "@/components/AvatarUpload";
import Navbar from "@/components/Navbar";
import ProfileForm from "@/components/member/ProfileForm";
import ProfileHeader from "@/components/member/ProfileHeader";
import ScheduleSection from "@/components/member/ScheduleSection";
import { longMonthLabel, monthKey } from "@/components/member/metrics";
import type {
  AppointmentRow,
  CoachRow,
  ProfileRow,
} from "@/components/member/types";
import { requireSession } from "@/lib/dal";
import {
  getCoaches,
  getMyAppointments,
  getMyProfileRow,
} from "@/lib/member-queries";

/**
 * Profile page.
 *
 * The page gates itself with `requireSession` — `proxy.ts` is only an
 * optimistic pre-filter — and loads the viewer's own row, their appointments
 * and the published coach cards in parallel. Writes all go through Server
 * Actions in `lib/member-actions.ts`, which re-check the session and scope
 * every update to `session.userId`.
 */
export const metadata = {
  title: "Mi Perfil | IMASPORT",
};

const PLAN_LABELS: Record<string, string> = {
  basic: "Plan Básico",
  pro: "Plan Pro",
  elite: "Plan Elite",
};

export default async function ProfilePage() {
  const session = await requireSession();

  const [profileResult, appointmentsResult, coachesResult] =
    await Promise.allSettled([
      getMyProfileRow(session.userId),
      getMyAppointments(session.userId),
      getCoaches(),
    ]);

  const loadError =
    profileResult.status === "rejected"
      ? profileResult.reason instanceof Error
        ? profileResult.reason.message
        : String(profileResult.reason)
      : null;

  // A profile row can genuinely be missing (sign-up interrupted before
  // confirmation), so the form starts from an empty row the user can save.
  const profile: ProfileRow =
    (profileResult.status === "fulfilled" ? profileResult.value : null) ?? {
      userId: session.userId,
      email: session.email,
      name: "",
      phone: null,
      discipline: null,
      planTier: null,
      planStatus: null,
      memberSince: null,
      age: null,
      weightKg: null,
      heightCm: null,
      bodyFatPct: null,
      goals: [],
      avatarKey: null,
      notifyClasses: true,
      notifyWorkouts: true,
      notifyWeekly: false,
      coachStatus: "NONE",
      bio: null,
      certifications: null,
      yearsExperience: null,
      specialty: null,
    };

  const appointments: AppointmentRow[] =
    appointmentsResult.status === "fulfilled" ? appointmentsResult.value : [];
  const coaches: CoachRow[] =
    coachesResult.status === "fulfilled" ? coachesResult.value : [];

  const memberSince = profile.memberSince
    ? `Miembro desde ${longMonthLabel(monthKey(profile.memberSince))}`
    : "Bienvenido a IMASPORT";

  const planLine = [
    profile.planTier ? PLAN_LABELS[profile.planTier] : null,
    profile.discipline,
  ]
    .filter(Boolean)
    .join(" — ");

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-20 pb-12 px-4">
        <div className="max-w-3xl mx-auto">
          <ProfileHeader />

          {loadError && (
            <div className="mb-6 p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-sm text-destructive">
              No se pudo cargar tu perfil: {loadError}
            </div>
          )}

          <AvatarUpload
            name={profile.name || session.email}
            avatarKey={profile.avatarKey}
            subtitle={memberSince}
            plan={planLine || null}
          />

          <ProfileForm profile={profile}>
            <ScheduleSection coaches={coaches} appointments={appointments} />
          </ProfileForm>
        </div>
      </main>
    </>
  );
}
