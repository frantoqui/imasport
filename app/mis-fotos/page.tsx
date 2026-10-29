import { Camera } from "lucide-react";
import Navbar from "@/components/Navbar";
import PhotoGallery from "@/components/member/PhotoGallery";
import type { AthletePhotoRow } from "@/components/member/types";
import { requireSession } from "@/lib/dal";
import { getMyAthletePhotos } from "@/lib/member-queries";

/**
 * "Mis Fotos" — the athlete's own progress photos.
 *
 * Athletes hold `read` only on `AthletePhoto`: coaches take these during
 * sessions, so there is deliberately no upload control here. Reads run as the
 * viewer, so AppSync returns only rows recorded against them, and the media
 * gateway re-checks ownership again before handing out a presigned URL.
 */
export const metadata = {
  title: "Mis Fotos de Progreso | IMASPORT",
};

export default async function MisFotosPage() {
  const session = await requireSession();

  let photos: AthletePhotoRow[] = [];
  let loadError: string | null = null;

  try {
    photos = await getMyAthletePhotos(session.userId);
  } catch (error) {
    loadError =
      error instanceof Error ? error.message : "Error al cargar las fotos.";
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-20 pb-12 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-black">Mis Fotos de Progreso</h1>
            <p className="text-muted-foreground flex items-center gap-2 mt-1">
              <Camera size={16} className="text-primary shrink-0" />
              Tus coaches toman estas fotos durante las sesiones para documentar
              tu técnica y tu evolución. Solo tú y tu equipo de coaches pueden
              verlas.
            </p>
          </div>

          {loadError && (
            <div className="mb-6 p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-sm text-destructive">
              No se pudieron cargar tus fotos: {loadError}
            </div>
          )}

          <PhotoGallery photos={photos} />
        </div>
      </main>
    </>
  );
}
