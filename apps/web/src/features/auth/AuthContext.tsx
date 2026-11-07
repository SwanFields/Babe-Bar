import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { LoginInput, RegisterInput, UserProfileDto } from "@babe-bar/shared";
import { api } from "../../lib/api";

export type User = UserProfileDto;

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  switchAccount: (userId: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
    try {
      const response = await api.get("/me");
      setUser(response.data);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      async login(input) {
        const response = await api.post("/auth/login", input);
        localStorage.setItem("accessToken", response.data.accessToken);
        setUser(response.data.user);
      },
      async register(input) {
        const response = await api.post("/auth/register", input);
        localStorage.setItem("accessToken", response.data.accessToken);
        setUser(response.data.user);
      },
      async logout() {
        try {
          await api.post("/auth/logout");
        } catch {
          // ignore
        }
        localStorage.removeItem("accessToken");
        setUser(null);
      },
      async refreshUser() {
        await fetchUser();
      },
      async switchAccount(userId: string) {
        const response = await api.post(`/auth/switch-account/${userId}`);
        localStorage.setItem("accessToken", response.data.accessToken);
        setUser(response.data.user);
      }
    }),
    [loading, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth ต้องอยู่ภายใน AuthProvider");
  return context;
}
