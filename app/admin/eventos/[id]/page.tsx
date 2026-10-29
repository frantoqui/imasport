import { notFound } from "next/navigation";
import { requireRole } from "@/lib/dal";
import { EventForm, type EventFormValues } from "@/components/admin/EventForm";
import { ErrorBanner, PageHeader } from "@/components/admin/ui";
import { asEnum, DISCIPLINES } from "@/components/admin/types";
import { loadEvent, loadRegistrations } from "../../_lib/queries";

export default async function EditEventPage({
  params,
}: PageProps<"/admin/eventos/[id]">) {
  await requireRole("admin");
  const { id } = await params;

  const { event, error } = await loadEvent(id);

  if (error) {
    return (
      <>
        <PageHeader title="Evento" />
        <ErrorBanner message={error} />
      </>
    );
  }
  if (!event) notFound();

  const registrations = await loadRegistrations(id);

  const initial: EventFormValues = {
    title: event.title,
    slug: event.slug ?? "",
    description: event.description ?? "",
    date: event.date ?? "",
    time: event.time ?? "",
    location: event.location ?? "",
    category: asEnum(DISCIPLINES, event.category) ?? "",
    spots: event.spots === null || event.spots === undefined ? "" : String(event.spots),
    priceMxn:
      event.priceMxn === null || event.priceMxn === undefined
        ? ""
        : String(event.priceMxn),
    imageKey: event.imageKey ?? null,
    imageUrl: event.imageUrl ?? null,
    featured: event.featured === true,
    published: event.published === true,
  };

  return (
    <>
      <PageHeader title={event.title} description="Editar evento" />
      <ErrorBanner message={registrations.error} />
      <EventForm
        eventId={event.id}
        initial={initial}
        spotsTaken={event.spotsTaken}
        registrationCount={registrations.items.length}
      />
    </>
  );
}
