import type { ReactNode } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from './context/AuthContext';
import { FavoritesProvider } from './context/FavoritesContext';
import {
  PublicDataContext,
  type PublicData,
} from './context/PublicDataContext';

export function AppProviders({
  children,
  snapshot,
}: {
  children: ReactNode;
  snapshot: { path: string; data: PublicData } | null;
}) {
  return (
    <PublicDataContext.Provider value={snapshot}>
      <GoogleOAuthProvider
        clientId={
          import.meta.env.VITE_GOOGLE_CLIENT_ID || 'your-google-client-id'
        }
      >
        <AuthProvider>
          <FavoritesProvider>{children}</FavoritesProvider>
        </AuthProvider>
      </GoogleOAuthProvider>
    </PublicDataContext.Provider>
  );
}
