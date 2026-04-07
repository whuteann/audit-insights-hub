import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  clearAuthSession,
  getAccessToken,
  getRefreshToken,
  getStoredUser,
  setAuthSession,
  type AppUser,
} from "@/lib/authStorage";

const apiBase = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:9000";

type AuthContextValue = {
  user: AppUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function assertAuthResponse(payload: unknown): payload is {
  access_token: string;
  refresh_token: string;
  user: AppUser;
} {
  if (!payload || typeof payload !== "object") return false;
  const p = payload as Record<string, unknown>;
  return (
    typeof p.access_token === "string" &&
    typeof p.refresh_token === "string" &&
    typeof p.user === "object" &&
    p.user !== null
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(() => getStoredUser());
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const accessToken = getAccessToken();
    const refreshToken = getRefreshToken();
    if (!accessToken || !refreshToken) {
      clearAuthSession();
      setUser(null);
      return;
    }

    const response = await fetch(`${apiBase}/auth/me`);
    if (!response.ok) {
      clearAuthSession();
      setUser(null);
      return;
    }
    const payload = (await response.json()) as AppUser;
    setUser(payload);
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await refreshUser();
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string) => {
    const response = await fetch(`${apiBase}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const message = payload && typeof payload.detail === "string" ? payload.detail : "Login failed";
      throw new Error(message);
    }
    if (!assertAuthResponse(payload)) {
      throw new Error("Unexpected login response");
    }

    setAuthSession(payload.access_token, payload.refresh_token, payload.user);
    setUser(payload.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch(`${apiBase}/auth/logout`, { method: "POST" });
    } catch {
      // ignore logout network errors; local cleanup still applies
    } finally {
      clearAuthSession();
      setUser(null);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isLoading,
      isAdmin: user?.role === "admin",
      login,
      logout,
      refreshUser,
    }),
    [isLoading, login, logout, refreshUser, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
