"use client";

import { ReactNode } from "react";
import { I18nProvider } from "@/lib/i18n";
import { ThemeProvider } from "@/lib/theme";
import { AuthProvider } from "@/lib/auth-context";
import { ConfigureAmplify } from "@/components/ConfigureAmplify";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <I18nProvider>
        {/* Configures Amplify before anything below it can call auth or data. */}
        <ConfigureAmplify />
        {/*
          The viewer is resolved on the client rather than passed down from the
          root layout, so public marketing pages are not forced to render
          dynamically just to read an auth cookie.
        */}
        <AuthProvider>{children}</AuthProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
