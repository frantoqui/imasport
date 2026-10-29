import Link from "next/link";
import { Plus } from "lucide-react";
import { requireRole } from "@/lib/dal";
import { mediaUrl } from "@/lib/media";
import { AlbumRowActions } from "@/components/admin/AlbumRowActions";
import { VISIBILITY_LABELS, asEnum, ALBUM_VISIBILITIES } from "@/components/admin/types";
import {
  Badge,
  EmptyState,
  ErrorBanner,
  PageHeader,
  TableShell,
  primaryBtnClass,
  tdClass,
  thClass,
} from "@/components/admin/ui";
import { loadAlbums, loadAllPhotos, loadEvents } from "../_lib/queries";

export default async function AdminGalleryPage() {
  await requireRole("admin");

  const [albums, photos, events] = await Promise.all([
    loadAlbums(),
    // Grouped per album below, so every row shows its photo count and the
    // delete confirmation can say what it is about to remove.
    loadAllPhotos(),
    loadEvents(),
  ]);

  const photoCount = new Map<string, number>();
  for (const photo of photos.items) {
    photoCount.set(photo.albumId, (photoCount.get(photo.albumId) ?? 0) + 1);
  }

  const eventTitle = new Map(events.items.map((event) => [event.id, event.title]));

  return (
    <>
      <PageHeader
        title="Galería"
        description="Álbumes de fotos del sitio. Un álbum puede ser la galería de un evento."
      >
        <Link href="/admin/galeria/nuevo" className={primaryBtnClass}>
          <Plus size={16} />
          Nuevo álbum
        </Link>
      </PageHeader>

      <ErrorBanner message={albums.error} />
      {photos.error ? (
        <ErrorBanner message={`No se pudieron contar las fotos: ${photos.error}`} />
      ) : null}

      {albums.items.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl">
          <EmptyState
            title="Todavía no hay álbumes"
            description="Crea un álbum y después sube sus fotos. Los álbumes públicos los ve cualquiera; los de miembros solo usuarios con sesión."
            actionHref="/admin/galeria/nuevo"
            actionLabel="Crear el primero"
          />
        </div>
      ) : (
        <TableShell>
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className={thClass}>Álbum</th>
                <th className={thClass}>Visibilidad</th>
                <th className={thClass}>Evento</th>
                <th className={thClass}>Fotos</th>
                <th className={thClass}>Orden</th>
                <th className={thClass}>Estado</th>
                <th className={`${thClass} text-right`}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {albums.items.map((album) => {
                const cover = mediaUrl(album.coverKey);
                const visibility =
                  asEnum(ALBUM_VISIBILITIES, album.visibility) ?? "PUBLIC";
                const count = photoCount.get(album.id) ?? 0;

                return (
                  <tr key={album.id} className="border-b border-border last:border-0">
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
                            href={`/admin/galeria/${album.id}`}
                            className="font-semibold hover:text-primary transition-colors"
                          >
                            {album.title}
                          </Link>
                          <div className="text-xs text-muted-foreground truncate">
                            {album.slug ? `/${album.slug}` : "sin slug"}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className={tdClass}>
                      <Badge tone={visibility === "PUBLIC" ? "success" : "warning"}>
                        {VISIBILITY_LABELS[visibility]}
                      </Badge>
                    </td>

                    <td className={tdClass}>
                      {album.eventId ? (
                        <Link
                          href={`/admin/eventos/${album.eventId}`}
                          className="text-xs hover:text-primary transition-colors"
                        >
                          {eventTitle.get(album.eventId) ?? album.eventId}
                        </Link>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>

                    <td className={tdClass}>{count}</td>

                    <td className={tdClass}>
                      {album.order ?? <span className="text-muted-foreground">—</span>}
                    </td>

                    <td className={tdClass}>
                      {album.published ? (
                        <Badge tone="success">Publicado</Badge>
                      ) : (
                        <Badge tone="warning">Borrador</Badge>
                      )}
                    </td>

                    <td className={`${tdClass} text-right`}>
                      <AlbumRowActions
                        albumId={album.id}
                        title={album.title}
                        photoCount={count}
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
