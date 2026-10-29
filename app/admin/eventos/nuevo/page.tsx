import { requireRole } from "@/lib/dal";
import { EMPTY_EVENT, EventForm } from "@/components/admin/EventForm";
import { PageHeader } from "@/components/admin/ui";

export default async function NewEventPage() {
  await requireRole("admin");

  return (
    <>
      <PageHeader
        title="Nuevo evento"
        description="Se crea como borrador hasta que marques «Publicado»."
      />
      <EventForm initial={EMPTY_EVENT} />
    </>
  );
}
