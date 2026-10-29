import Link from "next/link";
import { Images, Lock } from "lucide-react";
import type { AlbumView } from "@/lib/public-views";

/**
 * One album tile.
 *
 * `locked` is a presentation hint only — the real gate is in
 * `app/galeria/[slug]/page.tsx`, which refuses to read a member album's photos
 * without a session. Here it just turns the tile into a sign-in invitation
 * rather than a dead link.
 */
export default function AlbumCard({
  album,
  locked = false,
  nextPath = "/galeria",
}: {
  album: AlbumView;
  locked?: boolean;
  nextPath?: string;
}) {
  const cover = locked ? null : album.coverSrc;

  const inner = (
    <>
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {cover ? (
          <img
            src={cover}
            alt={album.title}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {locked ? (
              <Lock size={28} className="text-muted-foreground" />
            ) : (
              <Images size={28} className="text-muted-foreground" />
            )}
          </div>
        )}

        {locked ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/70 backdrop-blur-sm">
            <Lock size={20} className="text-primary" />
            <span className="text-sm font-bold">Inicia sesión para ver</span>
          </div>
        ) : null}

        {album.visibility === "MEMBERS" && !locked ? (
          <span className="absolute top-3 left-3 inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold bg-primary/10 text-primary border border-primary/30">
            <Lock size={11} />
            Miembros
          </span>
        ) : null}
      </div>

      <div className="p-5">
        <h3 className="font-bold text-lg mb-1">{album.title}</h3>
        {album.description ? (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {album.description}
          </p>
        ) : null}
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <Images size={12} />
          {locked
            ? "Álbum para miembros"
            : `${album.photoCount} ${album.photoCount === 1 ? "foto" : "fotos"}`}
        </p>
      </div>
    </>
  );

  const shell =
    "group block bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/30 transition-all";

  if (locked) {
    return (
      <Link
        href={`/login?next=${encodeURIComponent(nextPath)}`}
        className={shell}
        aria-label={`${album.title} — inicia sesión para ver este álbum`}
      >
        {inner}
      </Link>
    );
  }

  return (
    <Link href={album.href} className={shell} aria-label={album.title}>
      {inner}
    </Link>
  );
}
