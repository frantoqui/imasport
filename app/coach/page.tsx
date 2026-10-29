import Navbar from "@/components/Navbar";
import CoachPanel from "@/components/member/CoachPanel";
import type {
  AthleteListRow,
  ClassSessionRow,
} from "@/components/member/types";
import { getMyProfile, requireRole } from "@/lib/dal";
import { getAthletes, getTodaysClasses } from "@/lib/member-queries";

/**
 * Coach panel.
 *
 * `requireRole('coach')` gates the page itself; admins pass too because
 * `isAtLeast` treats admin as at least a coach. Every write the panel performs
 * goes through a Server Action that re-checks the same role, since rendering
 * this page is not a security boundary.
 */
export const metadata = {
  title: "Panel de Coach | IMASPORT",
};

export default async function CoachPage() {
  const session = await requireRole("coach");
  const problems: string[] = [];

  const [profile, athletesResult, classesResult] = await Promise.allSettled([
    getMyProfile(),
    getAthletes(),
    getTodaysClasses(),
  ]);

  const collect = (result: PromiseSettledResult<unknown>) => {
    if (result.status === "rejected") {
      problems.push(
        result.reason instanceof Error
          ? result.reason.message
          : String(result.reason)
      );
    }
  };
  collect(athletesResult);
  collect(classesResult);

  const athletes: AthleteListRow[] =
    athletesResult.status === "fulfilled" ? athletesResult.value : [];
  const todaysClasses: ClassSessionRow[] =
    classesResult.status === "fulfilled" ? classesResult.value : [];

  const coachName =
    (profile.status === "fulfilled" ? profile.value?.name : null) ||
    session.email;

  return (
    <>
      <Navbar />
      <CoachPanel
        coachName={coachName}
        athletes={athletes}
        todaysClasses={todaysClasses}
        loadError={problems.length > 0 ? problems.join(" · ") : null}
      />
    </>
  );
}
