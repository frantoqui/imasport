import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/dal";
import {
  AlbumForm,
  type AlbumFormValues,
  type EventOption,
} from "@/components/admin/AlbumForm";
import {
  PhotoManager,
  type PhotoRowData,
} from "@/components/admin/PhotoManager";
import { ALBUM_VISIBILITIES, asEnum } from "@/components/admin/types";
import { ErrorBanner, PageHeader, ghostBtnClass } from "@/components/admin/ui";
import { loadAlbum, loadEvents, loadPhotos } from "../../_lib/queries";

export default async function AlbumDetailPage({
  params,
}: PageProps<"/admin/galeria/[id]">) {
  await requireRole("admin");
  const { id } = await params;

  const { album, error } = await loadAlbum(id);

  if (error) {
    return (
      <>
        <PageHeader title="Álbum" />
        <ErrorBanner message={error} />
      </>
    );
  }
  if (!album) notFound();

  const [photos, events] = await Promise.all([loadPhotos(id), loadEvents()]);

  const visibility = asEnum(ALBUM_VISIBILITIES, album.visibility) ?? "PUBLIC";

  const initial: AlbumFormValues = {
    title: album.title,
    slug: album.slug ?? "",
    description: album.description ?? "",
    coverKey: album.coverKey ?? null,
    visibility,
    published: album.published === true,
    order: album.order === null || album.order === undefined ? "" : String(album.order),
    eventId: album.eventId ?? "",
  };

  const options: EventOption[] = events.items.map((event) => ({
    id: event.id,
    title: event.title,
    date: event.date ?? null,
  }));

  const rows: PhotoRowData[] = photos.items.map((photo) => ({
    id: photo.id,
    key: photo.key,
    caption: photo.caption ?? null,
    order: photo.order ?? null,
  }));

  return (
    <>
      <Link href="/admin/galeria" className={`${ghostBtnClass} mb-4`}>
        <ArrowLeft size={16} />
        Galería
      </Link>

      <PageHeader
        title={album.title}
        description={`${rows.length} foto(s) · ${
          visibility === "PUBLIC" ? "álbum público" : "solo miembros"
        }`}
      />

      <ErrorBanner message={photos.error} />
      <ErrorBanner message={events.error} />

      <div className="space-y-8">
        <PhotoManager albumId={album.id} visibility={visibility} photos={rows} />

        <div>
          <h2 className="text-lg font-bold mb-4">Datos del álbum</h2>
          <AlbumForm albumId={album.id} initial={initial} events={options} />
        </div>
      </div>
    </>
  );
}
