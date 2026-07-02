'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';

type AuthContextType = {
  user: User | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          let token = await currentUser.getIdToken();
          
          try {
            const res = await fetch('/api/auth/register-session', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });
            if (res.ok) {
              const data = await res.json();
              if (data.claimsUpdated) {
                console.log('User custom claims updated server-side. Force refreshing token...');
                token = await currentUser.getIdToken(true);
              }
            }
          } catch (apiErr) {
            console.error('Failed to ping register-admin API:', apiErr);
          }

          // Save the token to a secure cookie for middleware route guards
          document.cookie = `firebase_token=${token}; path=/; max-age=3600; SameSite=Lax; Secure`;
          setUser(currentUser);
        } catch (err) {
          console.error('Failed to retrieve Firebase ID token:', err);
          setUser(currentUser);
        }
      } else {
        setUser(null);
        // Clear the cookie
        document.cookie = 'firebase_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax; Secure';
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
