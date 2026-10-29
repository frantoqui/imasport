import Link from "next/link";
import {
  CalendarDays,
  CalendarClock,
  HelpCircle,
  Image as ImageIcon,
  Images,
  ListChecks,
  Tags,
  UserCheck,
  UserCog,
  Users,
} from "lucide-react";
import { requireRole } from "@/lib/dal";
import {
  ErrorBanner,
  PageHeader,
  StatCard,
  cardClass,
  ghostBtnClass,
} from "@/components/admin/ui";
import { loadAdminCounts } from "./_lib/queries";

export default async function AdminOverviewPage() {
  await requireRole("admin");

  const counts = await loadAdminCounts();
  const isEmpty =
    counts.profiles === 0 &&
    counts.events === 0 &&
    counts.albums === 0 &&
    counts.plans === 0 &&
    counts.coachCards === 0 &&
    counts.faqs === 0;

  return (
    <>
      <PageHeader
        title="Resumen"
        description="Todo el contenido del sitio y las cuentas se administran desde aquí."
      />

      {counts.errors.length > 0 ? (
        <ErrorBanner
          message={`No se pudo leer parte de los datos:\n${counts.errors.join("\n")}`}
        />
      ) : null}

      {counts.truncated ? (
        <ErrorBanner message="Hay más registros de los que se alcanzó a contar; los números de abajo son un mínimo." />
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Usuarios con perfil"
          value={counts.profiles}
          href="/admin/usuarios"
          icon={<Users size={18} />}
        />
        <StatCard
          label="Coaches"
          value={counts.coaches}
          hint="Perfiles con rol COACH"
          href="/admin/usuarios"
          icon={<UserCheck size={18} />}
        />
        <StatCard
          label="Inscripciones a eventos"
          value={counts.registrations}
          href="/admin/eventos"
          icon={<ListChecks size={18} />}
        />
        <StatCard
          label="Eventos publicados"
          value={counts.publishedEvents}
          hint={`${counts.events} en total`}
          href="/admin/eventos"
          icon={<CalendarDays size={18} />}
        />
        <StatCard
          label="Eventos próximos"
          value={counts.upcomingEvents}
          hint="De hoy en adelante"
          href="/admin/eventos"
          icon={<CalendarClock size={18} />}
        />
        <StatCard
          label="Álbumes"
          value={counts.albums}
          href="/admin/galeria"
          icon={<Images size={18} />}
        />
        <StatCard
          label="Fotos"
          value={counts.photos}
          href="/admin/galeria"
          icon={<ImageIcon size={18} />}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
        <StatCard
          label="Planes"
          value={counts.plans}
          hint="Página de Planes"
          href="/admin/planes"
          icon={<Tags size={18} />}
        />
        <StatCard
          label="Fichas de coach"
          value={counts.coachCards}
          hint="Grid público de coaches"
          href="/admin/coaches"
          icon={<UserCog size={18} />}
        />
        <StatCard
          label="Preguntas frecuentes"
          value={counts.faqs}
          href="/admin/faq"
          icon={<HelpCircle size={18} />}
        />
      </div>

      {isEmpty ? (
        <div className={`${cardClass} mt-6`}>
          <h2 className="font-bold mb-1">La base de datos está vacía</h2>
          <p className="text-sm text-muted-foreground mb-4">
            El sitio público se alimenta de estos modelos, así que conviene
            llenarlos en este orden.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/planes" className={ghostBtnClass}>
              1. Crear planes
            </Link>
            <Link href="/admin/coaches" className={ghostBtnClass}>
              2. Crear coaches
            </Link>
            <Link href="/admin/eventos/nuevo" className={ghostBtnClass}>
              3. Crear un evento
            </Link>
            <Link href="/admin/galeria/nuevo" className={ghostBtnClass}>
              4. Crear un álbum
            </Link>
            <Link href="/admin/contenido" className={ghostBtnClass}>
              5. Datos de contacto
            </Link>
          </div>
        </div>
      ) : null}
    </>
  );
}
