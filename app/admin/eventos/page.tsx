import Link from "next/link";
import { Plus } from "lucide-react";
import { requireRole } from "@/lib/dal";
import { mediaUrl } from "@/lib/media";
import { EventRowActions } from "@/components/admin/EventRowActions";
import {
  Badge,
  EmptyState,
  ErrorBanner,
  PageHeader,
  TableShell,
  formatDate,
  formatMxn,
  primaryBtnClass,
  tdClass,
  thClass,
} from "@/components/admin/ui";
import { loadAllRegistrations, loadEvents, todayIso } from "../_lib/queries";

export default async function AdminEventsPage() {
  await requireRole("admin");

  const [events, registrations] = await Promise.all([
    loadEvents(),
    // Every registration, grouped below, so each row can show the true count
    // next to the denormalized `spotsTaken`.
    loadAllRegistrations(),
  ]);

  const countByEvent = new Map<string, number>();
  for (const registration of registrations.items) {
    countByEvent.set(
      registration.eventId,
      (countByEvent.get(registration.eventId) ?? 0) + 1
    );
  }

  const today = todayIso();

  return (
    <>
      <PageHeader
        title="Eventos"
        description="Competencias y actividades que aparecen en el sitio público."
      >
        <Link href="/admin/eventos/nuevo" className={primaryBtnClass}>
          <Plus size={16} />
          Nuevo evento
        </Link>
      </PageHeader>

      <ErrorBanner message={events.error} />
      {registrations.error ? (
        <ErrorBanner
          message={`No se pudieron contar las inscripciones: ${registrations.error}`}
        />
      ) : null}
      {events.truncated ? (
        <ErrorBanner message="Hay más eventos de los que se alcanzó a leer; la lista está incompleta." />
      ) : null}

      {events.items.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl">
          <EmptyState
            title="Todavía no hay eventos"
            description="Los eventos publicados se muestran en la portada y en la sección de eventos. Crea el primero para empezar."
            actionHref="/admin/eventos/nuevo"
            actionLabel="Crear el primero"
          />
        </div>
      ) : (
        <TableShell>
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className={thClass}>Evento</th>
                <th className={thClass}>Fecha</th>
                <th className={thClass}>Categoría</th>
                <th className={thClass}>Lugares</th>
                <th className={thClass}>Precio</th>
                <th className={thClass}>Estado</th>
                <th className={`${thClass} text-right`}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {events.items.map((event) => {
                const cover = mediaUrl(event.imageKey) ?? mediaUrl(event.imageUrl);
                const registrationCount = countByEvent.get(event.id) ?? 0;
                const isPast = (event.date ?? "") < today;

                return (
                  <tr key={event.id} className="border-b border-border last:border-0">
                    <td className={tdClass}>
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-9 rounded-lg bg-muted overflow-hidden shrink-0">
                          {cover ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={cover}
                              alt=""
                              loading="lazy"
                              className="w-full h-full object-cover"
                            />
                          ) : null}
                        </div>
                        <div className="min-w-0">
                          <Link
                            href={`/admin/eventos/${event.id}`}
                            className="font-semibold hover:text-primary transition-colors"
                          >
                            {event.title}
                          </Link>
                          <div className="text-xs text-muted-foreground truncate">
                            {event.location ?? "Sin lugar"}
                            {event.slug ? ` · /${event.slug}` : ""}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className={tdClass}>
                      <div className={isPast ? "text-muted-foreground" : ""}>
                        {formatDate(event.date)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {event.time ?? "—"}
                        {isPast ? " · pasado" : ""}
                      </div>
                    </td>

                    <td className={tdClass}>{event.category ?? "—"}</td>

                    <td className={tdClass}>
                      <div>
                        {event.spotsTaken ?? 0}
                        {event.spots ? ` / ${event.spots}` : ""}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {registrationCount} inscripción(es)
                      </div>
                    </td>

                    <td className={tdClass}>{formatMxn(event.priceMxn)}</td>

                    <td className={tdClass}>
                      <div className="flex flex-wrap gap-1">
                        {event.published ? (
                          <Badge tone="success">Publicado</Badge>
                        ) : (
                          <Badge tone="warning">Borrador</Badge>
                        )}
                        {event.featured ? <Badge tone="primary">Destacado</Badge> : null}
                      </div>
                    </td>

                    <td className={`${tdClass} text-right`}>
                      <EventRowActions
                        eventId={event.id}
                        title={event.title}
                        published={event.published === true}
                        featured={event.featured === true}
                        registrationCount={registrationCount}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableShell>
      )}
    </>
  );
}
