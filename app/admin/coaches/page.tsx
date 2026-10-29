import { requireRole } from "@/lib/dal";
import {
  CoachesManager,
  type AccountOption,
  type CoachRowData,
} from "@/components/admin/CoachesManager";
import { DISCIPLINES, asEnum } from "@/components/admin/types";
import { ErrorBanner, PageHeader } from "@/components/admin/ui";
import { loadCoaches, loadProfiles } from "../_lib/queries";

export default async function AdminCoachesPage() {
  await requireRole("admin");

  const [coaches, profiles] = await Promise.all([loadCoaches(), loadProfiles()]);

  const rows: CoachRowData[] = coaches.items.map((coach) => ({
    id: coach.id,
    userId: coach.userId ?? null,
    name: coach.name,
    discipline: asEnum(DISCIPLINES, coach.discipline),
    certifications: coach.certifications ?? null,
    bio: coach.bio ?? null,
    imageKey: coach.imageKey ?? null,
    imageUrl: coach.imageUrl ?? null,
    instagram: coach.instagram ?? null,
    specialty: coach.specialty ?? null,
    yearsExperience: coach.yearsExperience ?? null,
    order: coach.order ?? null,
    published: coach.published === true,
    updatedAtKey: coach.updatedAt ?? "",
  }));

  // Coaches first in the picker, since that is who a card is usually linked to.
  const accounts: AccountOption[] = profiles.items
    .slice()
    .sort((a, b) => {
      const rank = (role: string | null | undefined) =>
        role === "COACH" ? 0 : role === "ADMIN" ? 1 : 2;
      return rank(a.role) - rank(b.role) || a.name.localeCompare(b.name);
    })
    .map((profile) => ({
      userId: profile.userId,
      label: `${profile.name} — ${profile.email}${
        profile.role ? ` (${profile.role})` : ""
      }`,
    }));

  return (
    <>
      <PageHeader
        title="Coaches"
        description="Fichas públicas del grid de coaches. No son cuentas: puedes vincularlas a una si existe."
      />

      <ErrorBanner message={coaches.error} />
      <ErrorBanner message={profiles.error} />

      <CoachesManager coaches={rows} accounts={accounts} />
    </>
  );
}
