import Link from "next/link";
import { ExternalLink, ShieldCheck } from "lucide-react";
import { requireRole } from "@/lib/dal";
import { userClient } from "@/lib/amplify-server";
import { AdminSidebar, AdminTabs } from "@/components/admin/AdminNav";

/**
 * Admin shell.
 *
 * The layout gates on the role as well as every page below it: a layout check
 * alone would not protect a page, since Next may render a page without
 * re-running the layout, and `proxy.ts` is only an optimistic pre-filter.
 */
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const session = await requireRole("admin");

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-nav-bg backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/admin" className="flex items-center gap-2 shrink-0">
              <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center">
                <ShieldCheck size={18} className="text-primary-foreground" />
              </div>
              <span className="font-black text-lg">
                IMA<span className="text-primary">SPORT</span>
              </span>
            </Link>
            <span className="hidden sm:inline text-xs font-bold uppercase tracking-wide px-2 py-1 rounded-full bg-primary/10 text-primary">
              Admin
            </span>
          </div>

          <div className="flex items-center gap-3 min-w-0">
            <span className="hidden lg:block text-sm text-muted-foreground truncate">
              {session.email}
            </span>
            <Link
              href="/"
              className="flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg hover:bg-muted transition-colors"
            >
              <ExternalLink size={14} />
              <span className="hidden sm:inline">Ver sitio</span>
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex gap-8">
        <AdminSidebar />
        <main className="flex-1 min-w-0">
          <AdminTabs />
          {children}
        </main>
      </div>
    </div>
  );
}
