import type { Metadata } from "next";
import { Images, Lock } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AlbumCard from "@/components/gallery/AlbumCard";
import { getSession } from "@/lib/dal";
import { getMemberAlbums, getPublicAlbums } from "@/lib/public-queries";

export const metadata: Metadata = {
  title: "Galería | IMASPORT",
  description:
    "Fotos de nuestras competencias, clases y la vida en el box de IMASPORT Morelia.",
};

/**
 * Server-rendered on every request: this page reads the viewer's session, and
 * the guest album read depends on a `no-store` Amplify credential fetch, so it
 * cannot be prerendered. Stating it keeps the build from attempting one.
 */
export const dynamic = "force-dynamic";

/**
 * The public gallery.
 *
 * Public albums are read as a guest. Member albums are listed either way, but a
 * logged-out visitor only sees a locked tile that leads to the login page —
 * their photos are never fetched here, and the album page refuses them too.
 */
export default async function GaleriaPage() {
  const session = await getSession();
  const signedIn = session !== null;

  const [publicAlbums, memberAlbums] = await Promise.all([
    getPublicAlbums(),
    getMemberAlbums(signedIn),
  ]);

  const isEmpty = publicAlbums.length === 0 && memberAlbums.length === 0;

  return (
    <>
      <Navbar />
      <main className="pt-16">
        <section className="py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-black mb-4">Galería</h1>
              <p className="text-xl text-muted-foreground">
                Nuestras competencias, clases y comunidad en imágenes
              </p>
            </div>

            {isEmpty ? (
              <div className="bg-card border border-border rounded-2xl p-6 text-center max-w-xl mx-auto">
                <Images
                  size={28}
                  className="mx-auto mb-3 text-muted-foreground"
                />
                <p className="font-bold mb-1">
                  Pronto publicaremos nuestras fotos
                </p>
                <p className="text-sm text-muted-foreground">
                  Estamos preparando los álbumes de los últimos eventos.
                </p>
              </div>
            ) : null}

            {publicAlbums.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {publicAlbums.map((album) => (
                  <AlbumCard key={album.id} album={album} />
                ))}
              </div>
            ) : null}

            {memberAlbums.length > 0 ? (
              <>
                <div className="mt-16 mb-6">
                  <h2 className="flex items-center gap-2 text-2xl font-black">
                    <Lock size={20} className="text-primary" />
                    Álbumes para miembros
                  </h2>
                  <p className="text-muted-foreground mt-1">
                    {signedIn
                      ? "Contenido exclusivo de la comunidad IMASPORT."
                      : "Inicia sesión con tu cuenta IMASPORT para verlos completos."}
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {memberAlbums.map((album) => (
                    <AlbumCard
                      key={album.id}
                      album={album}
                      locked={!signedIn}
                      nextPath="/galeria"
                    />
                  ))}
                </div>
              </>
            ) : null}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
