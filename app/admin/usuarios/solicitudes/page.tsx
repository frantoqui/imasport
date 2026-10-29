import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/dal";
import {
  CoachRequests,
  type CoachRequestData,
} from "@/components/admin/CoachRequests";
import { ErrorBanner, PageHeader, ghostBtnClass } from "@/components/admin/ui";
import { loadProfiles } from "../../_lib/queries";

export default async function CoachRequestsPage() {
  await requireRole("admin");

  const profiles = await loadProfiles();

  const requests: CoachRequestData[] = profiles.items
    .filter((profile) => profile.coachStatus === "PENDING")
    .map((profile) => ({
      userId: profile.userId,
      name: profile.name,
      email: profile.email,
      phone: profile.phone ?? null,
      discipline: profile.discipline ?? null,
      specialty: profile.specialty ?? null,
      certifications: profile.certifications ?? null,
      yearsExperience: profile.yearsExperience ?? null,
      bio: profile.bio ?? null,
    }));

  return (
    <>
      <Link href="/admin/usuarios" className={`${ghostBtnClass} mb-4`}>
        <ArrowLeft size={16} />
        Usuarios
      </Link>

      <PageHeader
        title="Solicitudes de coach"
        description="Perfiles con coachStatus en PENDING."
      />

      <ErrorBanner message={profiles.error} />

      <CoachRequests requests={requests} />
    </>
  );
}
