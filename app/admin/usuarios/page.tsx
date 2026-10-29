import Link from "next/link";
import { UserCog } from "lucide-react";
import { requireRole } from "@/lib/dal";
import { roleFromGroups } from "@/lib/roles";
import { UsersTable, type UserRowData } from "@/components/admin/UsersTable";
import {
  APPROVAL_STATUSES,
  GROUP_FOR_ROLE,
  PAYMENT_STATUSES,
  PLAN_TIERS,
  ROLES,
  asEnum,
  type CognitoGroup,
} from "@/components/admin/types";
import {
  ErrorBanner,
  PageHeader,
  primaryBtnClass,
} from "@/components/admin/ui";
import { loadCognitoUsers, loadProfiles } from "../_lib/queries";

/** The Cognito group wins; the profile copy is only a fallback and a warning. */
function groupFor(
  cognitoGroups: string[] | null,
  profileRole: string | null
): CognitoGroup {
  if (cognitoGroups && cognitoGroups.length > 0) {
    const role = roleFromGroups(cognitoGroups);
    return GROUP_FOR_ROLE[
      role === "admin" ? "ADMIN" : role === "coach" ? "COACH" : "ATHLETE"
    ];
  }
  const fromProfile = asEnum(ROLES, profileRole);
  return fromProfile ? GROUP_FOR_ROLE[fromProfile] : "ATHLETES";
}

export default async function AdminUsersPage() {
  await requireRole("admin");

  const [profiles, cognito] = await Promise.all([
    loadProfiles(),
    loadCognitoUsers(),
  ]);

  const profileById = new Map(
    profiles.items.map((profile) => [profile.userId, profile])
  );

  // Start from Cognito so an account that never created a profile row is still
  // listed and manageable, then add any profile row Cognito does not know
  // about (a deleted account, or a seeded profile) so nothing is invisible.
  const rows: UserRowData[] = cognito.users.map((user) => {
    const profile = profileById.get(user.userId);
    return {
      userId: user.userId,
      email: user.email || profile?.email || "",
      name: profile?.name || user.name || "",
      phone: profile?.phone ?? (user.phone || null),
      group: groupFor(user.groups, profile?.role ?? null),
      profileRole: profile?.role ?? null,
      enabled: user.enabled,
      status: user.status,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      hasProfile: Boolean(profile),
      cognitoMissing: false,
      planTier: asEnum(PLAN_TIERS, profile?.planTier),
      planStatus: asEnum(PAYMENT_STATUSES, profile?.planStatus),
      discipline: profile?.discipline ?? null,
      coachStatus: asEnum(APPROVAL_STATUSES, profile?.coachStatus),
    };
  });

  const seen = new Set(rows.map((row) => row.userId));
  for (const profile of profiles.items) {
    if (seen.has(profile.userId)) continue;
    rows.push({
      userId: profile.userId,
      email: profile.email,
      name: profile.name,
      phone: profile.phone ?? null,
      group: groupFor(null, profile.role ?? null),
      profileRole: profile.role ?? null,
      enabled: profile.isActive !== false,
      status: "",
      emailVerified: false,
      createdAt: profile.createdAt ?? null,
      hasProfile: true,
      cognitoMissing: true,
      planTier: asEnum(PLAN_TIERS, profile.planTier),
      planStatus: asEnum(PAYMENT_STATUSES, profile.planStatus),
      discipline: profile.discipline ?? null,
      coachStatus: asEnum(APPROVAL_STATUSES, profile.coachStatus),
    });
  }

  rows.sort((a, b) => a.name.localeCompare(b.name) || a.email.localeCompare(b.email));

  const pending = rows.filter((row) => row.coachStatus === "PENDING").length;

  return (
    <>
      <PageHeader
        title="Usuarios"
        description="Cuentas de Cognito y sus perfiles. El rol real es el grupo de Cognito; el campo del perfil es una copia."
      >
        <Link href="/admin/usuarios/solicitudes" className={primaryBtnClass}>
          <UserCog size={16} />
          Solicitudes de coach
          {pending > 0 ? (
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-primary-foreground/20 text-xs">
              {pending}
            </span>
          ) : null}
        </Link>
      </PageHeader>

      <ErrorBanner message={profiles.error} />
      {profiles.truncated ? (
        <ErrorBanner message="Hay más perfiles de los que se alcanzó a leer; la lista está incompleta." />
      ) : null}

      <UsersTable rows={rows} cognitoError={cognito.error} />
    </>
  );
}
