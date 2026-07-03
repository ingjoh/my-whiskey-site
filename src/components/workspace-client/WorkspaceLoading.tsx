'use client';

export function WorkspaceLoading() {
  return (
    <div style={styles.loadingContainer}>
      <div style={styles.spinner}></div>
      <p style={styles.loadingText}>Compiling Workspace Context Perspective...</p>
    </div>
  );
}

const styles = {
  loadingContainer: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F1112',
    color: '#E3E4E6',
    fontFamily: '"Outfit", sans-serif',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid rgba(216, 199, 175, 0.1)',
    borderTop: '4px solid #D8C7AF',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '1rem',
  },
  loadingText: {
    fontSize: '0.95rem',
    color: '#D8C7AF',
  },
};
