import { createContext, useContext, useState, useCallback } from 'react';

interface DashboardRefreshContextType {
  refreshKey: number;
  triggerRefresh: () => void;
}

const DashboardRefreshContext = createContext<DashboardRefreshContextType>({
  refreshKey: 0,
  triggerRefresh: () => {},
});

export function DashboardRefreshProvider({ children }: { children: React.ReactNode }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const triggerRefresh = useCallback(() => setRefreshKey(k => k + 1), []);

  return (
    <DashboardRefreshContext.Provider value={{ refreshKey, triggerRefresh }}>
      {children}
    </DashboardRefreshContext.Provider>
  );
}

export function useDashboardRefresh() {
  return useContext(DashboardRefreshContext);
}
