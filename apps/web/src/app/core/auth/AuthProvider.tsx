import { ReactNode, createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  getAuthProvider,
  getAuthWarnings,
  getCurrentAuthUser,
  signInWithEmailPassword,
  signOut as performSignOut,
  subscribeAuthState,
} from "./authService";
import type { AuthProvider as AuthProviderName, AuthUser } from "./contracts";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  status: AuthStatus;
  isAuthenticated: boolean;
  user: AuthUser | null;
  provider: AuthProviderName;
  warnings: string[];
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);
  const provider = useMemo(() => getAuthProvider(), []);
  const warnings = useMemo(() => getAuthWarnings(), []);

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      const currentUser = await getCurrentAuthUser();
      if (!active) {
        return;
      }

      setUser(currentUser);
      setStatus(currentUser ? "authenticated" : "unauthenticated");
    };

    bootstrap();

    const unsubscribe = subscribeAuthState((nextUser) => {
      if (!active) {
        return;
      }

      setUser(nextUser);
      setStatus(nextUser ? "authenticated" : "unauthenticated");
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      isAuthenticated: status === "authenticated" && Boolean(user),
      user,
      provider,
      warnings,
      signIn: async (email, password) => {
        setStatus("loading");
        const nextUser = await signInWithEmailPassword(email, password);
        setUser(nextUser);
        setStatus("authenticated");
      },
      signOut: async () => {
        await performSignOut();
        setUser(null);
        setStatus("unauthenticated");
      },
    }),
    [provider, status, user, warnings],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider.");
  }

  return context;
}
