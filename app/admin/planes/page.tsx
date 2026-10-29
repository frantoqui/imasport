import { requireRole } from "@/lib/dal";
import { PlansManager, type PlanRowData } from "@/components/admin/PlansManager";
import { PLAN_TIERS, asEnum } from "@/components/admin/types";
import { ErrorBanner, PageHeader } from "@/components/admin/ui";
import { loadPlans } from "../_lib/queries";

export default async function AdminPlansPage() {
  await requireRole("admin");

  const plans = await loadPlans();

  const rows: PlanRowData[] = plans.items.map((plan) => ({
    id: plan.id,
    tier: asEnum(PLAN_TIERS, plan.tier),
    name: plan.name,
    nameEn: plan.nameEn ?? null,
    priceMxn: plan.priceMxn,
    // `a.string().array()` can come back with null holes; they are dropped so
    // the editor never renders an empty ghost row.
    features: (plan.features ?? []).filter(
      (feature): feature is string => typeof feature === "string"
    ),
    featuresEn: (plan.featuresEn ?? []).filter(
      (feature): feature is string => typeof feature === "string"
    ),
    popular: plan.popular === true,
    order: plan.order ?? null,
    active: plan.active !== false,
    updatedAtKey: plan.updatedAt ?? "",
  }));

  const popularCount = rows.filter((plan) => plan.popular).length;

  return (
    <>
      <PageHeader
        title="Planes"
        description="Alimentan la página pública de Planes. El orden y el plan destacado se ven tal cual en el sitio."
      />

      <ErrorBanner message={plans.error} />
      {popularCount > 1 ? (
        <ErrorBanner
          message={`Hay ${popularCount} planes marcados como populares. En el sitio solo debería destacarse uno: usa «Destacar este» en el que corresponda.`}
        />
      ) : null}

      <PlansManager plans={rows} />
    </>
  );
}
