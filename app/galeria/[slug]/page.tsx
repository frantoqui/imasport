import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Images, Lock } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PhotoGallery from "@/components/gallery/PhotoGallery";
import { getSession } from "@/lib/dal";
import { getAlbum, getAlbumPhotos } from "@/lib/public-queries";

/**
 * Server-rendered on every request.
 *
 * These pages read public content as an identity-pool guest, and Amplify
 * fetches those credentials with `no-store`, which makes the route
 * impossible to prerender — a `revalidate` here silently did nothing and the
 * build wasted a prerender pass that could only fail. Declaring the route
 * dynamic states the real behaviour.
 *
 * To make these cacheable later, the data read has to stop depending on a
 * per-request credential fetch: either Cache Components (`use cache`) or
 * API-key auth for public models.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata(
  props: PageProps<"/galeria/[slug]">
): Promise<Metadata> {
  // `params` arrives already percent-decoded, so no decoding here — doing it
  // twice would mangle a slug containing a literal '%'.
  const { slug } = await props.params;
  const album = await getAlbum(slug);
  if (!album) return { title: "Álbum no encontrado | IMASPORT" };

  return {
    title: `${album.title} | Galería IMASPORT`,
    description:
      album.description ?? `Fotos del álbum ${album.title} de IMASPORT Morelia.`,
  };
}

export default async function AlbumPage(props: PageProps<"/galeria/[slug]">) {
  const { slug } = await props.params;
  const album = await getAlbum(slug);
  if (!album) notFound();

  // Server-side visibility gate. A member album's photos are never read — let
  // alone rendered — without a session, so hiding them is not something a
  // visitor can undo from the browser. Cookies are only touched for member
  // albums, which keeps public albums cacheable.
  if (album.visibility === "MEMBERS") {
    const session = await getSession();
    if (!session) {
      return (
        <>
          <Navbar />
          <main className="pt-16">
            <section className="py-24">
              <div className="max-w-xl mx-auto px-4 text-center">
                <div className="bg-card border border-border rounded-2xl p-8">
                  <Lock size={32} className="mx-auto mb-4 text-primary" />
                  <h1 className="text-2xl font-black mb-2">{album.title}</h1>
                  <p className="text-muted-foreground mb-6">
                    Este álbum es exclusivo para miembros de IMASPORT. Inicia
                    sesión con tu cuenta para verlo.
                  </p>
                  <Link
                    href={`/login?next=${encodeURIComponent(album.href)}`}
                    className="inline-block w-full py-3 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary-hover transition-colors"
                  >
                    Iniciar sesión
                  </Link>
                  <Link
                    href="/galeria"
                    className="inline-flex items-center gap-1 mt-4 text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    <ArrowLeft size={14} />
                    Volver a la galería
                  </Link>
                </div>
              </div>
            </section>
          </main>
          <Footer />
        </>
      );
    }
  }

  const photos = await getAlbumPhotos(album.id);

  return (
    <>
      <Navbar />
      <main className="pt-16">
        <section className="py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Link
              href="/galeria"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors mb-6"
            >
              <ArrowLeft size={14} />
              Volver a la galería
            </Link>

            <div className="mb-10">
              <div className="flex flex-wrap items-center gap-3 mb-3">
                {album.visibility === "MEMBERS" ? (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold bg-primary/10 text-primary border border-primary/30">
                    <Lock size={11} />
                    Miembros
                  </span>
                ) : null}
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Images size={12} />
                  {photos.length} {photos.length === 1 ? "foto" : "fotos"}
                </span>
              </div>
              <h1 className="text-4xl md:text-5xl font-black mb-3">
                {album.title}
              </h1>
              {album.description ? (
                <p className="text-xl text-muted-foreground max-w-3xl">
                  {album.description}
                </p>
              ) : null}
            </div>

            <PhotoGallery photos={photos} />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
