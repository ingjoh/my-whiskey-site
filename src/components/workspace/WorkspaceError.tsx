'use client';

import { AlertCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export function WorkspaceError({ error }: { error: string | null }) {
  return (
    <div style={styles.errorContainer}>
      <AlertCircle size={48} color="#FF6B6B" />
      <h3 style={styles.errorTitle}>Resolution Error</h3>
      <p style={styles.errorText}>{error || 'Failed to resolve workspace perspective.'}</p>
      <Link href="/admin" style={styles.backButton}>
        <ArrowLeft size={16} /> Return to Dashboard
      </Link>
    </div>
  );
}

const styles = {
  errorContainer: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F1112',
    padding: '2rem',
    textAlign: 'center' as const,
    color: '#E3E4E6',
    fontFamily: '"Outfit", sans-serif',
  },
  errorTitle: {
    fontSize: '1.5rem',
    color: '#FF6B6B',
    margin: '1rem 0 0.5rem',
  },
  errorText: {
    color: '#9CA3AF',
    maxWidth: '400px',
    marginBottom: '1.5rem',
  },
  backButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    backgroundColor: '#1E2326',
    border: '1px solid #2D3338',
    color: '#D8C7AF',
    padding: '0.6rem 1.2rem',
    borderRadius: '6px',
    fontSize: '0.9rem',
    textDecoration: 'none',
    cursor: 'pointer',
  },
};
