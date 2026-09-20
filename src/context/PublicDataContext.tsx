import { createContext, useContext } from 'react';
import { useLocation } from 'react-router-dom';

export type PublicData = Record<string, unknown>;
export const PublicDataContext = createContext<{
  path: string;
  data: PublicData;
} | null>(null);

// Scope the snapshot to its original route: client navigation must not reuse
// another page's stale data. The server and first client render share this value.
export function usePublicData<T>(endpoint: string): T | undefined {
  const snapshot = useContext(PublicDataContext);
  const { pathname } = useLocation();
  return snapshot?.path === pathname
    ? (snapshot.data[endpoint] as T | undefined)
    : undefined;
}
