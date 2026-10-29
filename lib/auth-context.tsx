"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "aws-amplify/auth";
import { Hub } from "aws-amplify/utils";
import { client } from "./amplify-client";
import { currentRole, logout as doLogout } from "./auth-client";
import type { AppRole } from "./roles";
import type { Schema } from "@/amplify/data/resource";

export type Viewer = {
  userId: string;
  role: AppRole;
  profile: Schema["UserProfile"]["type"] | null;
};

type AuthState = {
  viewer: Viewer | null;
  /** True until the first resolution, so the UI can avoid flashing "Sign in". */
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState>({
  viewer: null,
  loading: true,
  refresh: async () => {},
  signOut: async () => {},
});

export function AuthProvider({
  children,
  /** Resolved on the server so the first paint already knows who is here. */
  initialViewer = null,
}: {
  children: ReactNode;
  initialViewer?: Viewer | null;
}) {
  const [viewer, setViewer] = useState<Viewer | null>(initialViewer);
  const [loading, setLoading] = useState(initialViewer === null);
  const router = useRouter();

  /** Reads the current session from Cognito. Resolves to `null` when nobody is signed in. */
  const readViewer = useCallback(async (): Promise<Viewer | null> => {
    try {
      const { userId } = await getCurrentUser();
      const [role, profileResult] = await Promise.all([
        currentRole(),
        client.models.UserProfile.get({ userId }),
      ]);
      return { userId, role, profile: profileResult.data ?? null };
    } catch {
      return null;
    }
  }, []);

  const refresh = useCallback(async () => {
    setViewer(await readViewer());
    setLoading(false);
  }, [readViewer]);

  useEffect(() => {
    // Subscribing to Cognito's auth state is the external system this effect
    // synchronises with. `cancelled` keeps a slow read from writing state
    // after unmount, and keeps a stale read from overwriting a newer one.
    let cancelled = false;

    async function sync() {
      const next = await readViewer();
      if (cancelled) return;
      setViewer(next);
      setLoading(false);
    }

    // Re-check on mount even when the server supplied a viewer, so a session
    // that expired between render and hydration is caught.
    void sync();

    const unsubscribe = Hub.listen("auth", ({ payload }) => {
      if (
        payload.event === "signedIn" ||
        payload.event === "tokenRefresh" ||
        payload.event === "signedOut"
      ) {
        void sync();
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [readViewer]);

  const signOut = useCallback(async () => {
    await doLogout();
    setViewer(null);
    router.replace("/");
    router.refresh();
  }, [router]);

  return (
    <AuthContext.Provider value={{ viewer, loading, refresh, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
