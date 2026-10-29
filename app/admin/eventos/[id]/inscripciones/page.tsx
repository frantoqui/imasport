import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/dal";
import {
  RegistrationsTable,
  type RegistrationRowData,
} from "@/components/admin/RegistrationsTable";
import {
  ErrorBanner,
  PageHeader,
  formatDate,
  ghostBtnClass,
} from "@/components/admin/ui";
import { REGISTRATION_STATUSES, asEnum } from "@/components/admin/types";
import { loadEvent, loadRegistrations } from "../../../_lib/queries";

export default async function EventRegistrationsPage({
  params,
}: PageProps<"/admin/eventos/[id]/inscripciones">) {
  await requireRole("admin");
  const { id } = await params;

  const [{ event, error: eventError }, registrations] = await Promise.all([
    loadEvent(id),
    loadRegistrations(id),
  ]);

  if (eventError) {
    return (
      <>
        <PageHeader title="Inscripciones" />
        <ErrorBanner message={eventError} />
      </>
    );
  }
  if (!event) notFound();

  const rows: RegistrationRowData[] = registrations.items.map((registration) => ({
    id: registration.id,
    name: registration.name,
    email: registration.email,
    phone: registration.phone ?? null,
    status: asEnum(REGISTRATION_STATUSES, registration.status),
    notes: registration.notes ?? null,
    createdAt: registration.createdAt ?? null,
  }));

  const occupying = rows.filter(
    (r) => r.status === "REGISTERED" || r.status === "ATTENDED"
  ).length;

  return (
    <>
      <Link href="/admin/eventos" className={`${ghostBtnClass} mb-4`}>
        <ArrowLeft size={16} />
        Eventos
      </Link>

      <PageHeader
        title={`Inscripciones — ${event.title}`}
        description={`${formatDate(event.date)} · ${occupying} lugar(es) ocupado(s)${
          event.spots ? ` de ${event.spots}` : ""
        } · contador guardado: ${event.spotsTaken ?? 0}`}
      >
        <Link href={`/admin/eventos/${event.id}`} className={ghostBtnClass}>
          Editar evento
        </Link>
      </PageHeader>

      <ErrorBanner message={registrations.error} />
      {registrations.truncated ? (
        <ErrorBanner message="Hay más inscripciones de las que se alcanzó a leer; la lista y el CSV están incompletos." />
      ) : null}

      <RegistrationsTable
        eventId={event.id}
        eventTitle={event.title}
        rows={rows}
      />
    </>
  );
}
