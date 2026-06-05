'use client';

import { auth } from '@/lib/firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { useEffect } from 'react';

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && !loading) {
      router.push('/admin');
    }
  }, [user, loading, router]);

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      router.push('/admin');
    } catch (error) {
      console.error('Error logging in:', error);
      alert('Failed to log in with Google.');
    }
  };

  if (loading) return null; // Or a spinner
  if (user) return null; // Will redirect in useEffect

  return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--color-surface)' }}>
      <div className="glass" style={{ padding: '3rem', borderRadius: 'var(--radius-lg)', textAlign: 'center', maxWidth: '400px', width: '100%' }}>
        <h1 style={{ marginBottom: '1rem', color: 'var(--color-primary)' }}>MY Whiskey</h1>
        <p style={{ marginBottom: '2rem', color: 'var(--color-muted)' }}>Admin Login for the Page Builder</p>
        <button 
          onClick={handleLogin}
          style={{
            background: 'var(--color-primary)',
            color: 'white',
            padding: '0.75rem 1.5rem',
            borderRadius: 'var(--radius-md)',
            fontWeight: 600,
            width: '100%',
            transition: 'background var(--transition-fast)',
          }}
          onMouseOver={(e) => e.currentTarget.style.background = 'var(--color-primary-hover)'}
          onMouseOut={(e) => e.currentTarget.style.background = 'var(--color-primary)'}
        >
          Sign in with Google
        </button>
      </div>
    </div>
  );
}
