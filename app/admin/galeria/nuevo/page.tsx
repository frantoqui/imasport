import { requireRole } from "@/lib/dal";
import {
  AlbumForm,
  EMPTY_ALBUM,
  type EventOption,
} from "@/components/admin/AlbumForm";
import { ErrorBanner, PageHeader } from "@/components/admin/ui";
import { loadEvents } from "../../_lib/queries";

export default async function NewAlbumPage() {
  await requireRole("admin");

  const events = await loadEvents();
  const options: EventOption[] = events.items.map((event) => ({
    id: event.id,
    title: event.title,
    date: event.date ?? null,
  }));

  return (
    <>
      <PageHeader
        title="Nuevo álbum"
        description="Al guardarlo se abre el álbum para que subas las fotos."
      />
      <ErrorBanner message={events.error} />
      <AlbumForm initial={EMPTY_ALBUM} events={options} />
    </>
  );
}
