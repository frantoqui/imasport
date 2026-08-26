"use client";

import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export default function Footer() {
  const { t } = useI18n();

  return (
    <footer id="contacto" className="bg-card border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-black text-sm">IM</span>
              </div>
              <span className="font-black text-xl">
                IMA<span className="text-primary">SPORT</span>
              </span>
            </div>
            <p className="text-muted-foreground text-sm">
              Athletes for life ⚡
            </p>
            <p className="text-muted-foreground text-sm">
              CrossFit | Hyrox | Calistenia
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="font-bold text-sm uppercase tracking-wider">{t.footer.contact}</h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <MapPin size={14} />
                <span>{t.footer.location}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone size={14} />
                <span>+52 443 123 4567</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail size={14} />
                <span>info@imasports.mx</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-bold text-sm uppercase tracking-wider">Links</h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <Link href="/planes" className="block hover:text-primary transition-colors">
                {t.nav.plans}
              </Link>
              <Link href="/register-coach" className="block hover:text-primary transition-colors">
                {t.auth.registerCoach}
              </Link>
              <Link href="#" className="block hover:text-primary transition-colors">
                {t.footer.terms}
              </Link>
              <Link href="#" className="block hover:text-primary transition-colors">
                {t.footer.privacy}
              </Link>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-bold text-sm uppercase tracking-wider">{t.footer.followUs}</h4>
            <div className="flex gap-3">
              <a
                href="https://www.instagram.com/imasportsmx/"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-muted hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
              </a>
              <a
                href="#"
                className="p-2 rounded-lg bg-muted hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
              </a>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-border text-center text-sm text-muted-foreground">
          <p>© 2024 IMASPORT. {t.footer.rights}.</p>
        </div>
      </div>
    </footer>
  );
}
