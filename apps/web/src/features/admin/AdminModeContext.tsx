import { createContext, useContext, useMemo, useState } from "react";

type AdminModeContextValue = {
  adminMode: boolean;
  setAdminMode: (enabled: boolean) => void;
};

const AdminModeContext = createContext<AdminModeContextValue | null>(null);
const storageKey = "babeBarAdminMode";

export function AdminModeProvider({ children }: { children: React.ReactNode }) {
  const [adminMode, setAdminModeState] = useState(() => localStorage.getItem(storageKey) === "true");
  const value = useMemo(() => ({
    adminMode,
    setAdminMode(enabled: boolean) {
      localStorage.setItem(storageKey, String(enabled));
      setAdminModeState(enabled);
    }
  }), [adminMode]);

  return <AdminModeContext.Provider value={value}>{children}</AdminModeContext.Provider>;
}

export function useAdminMode() {
  const context = useContext(AdminModeContext);
  if (!context) throw new Error("useAdminMode ต้องอยู่ภายใน AdminModeProvider");
  return context;
}
