'use client';

import { useAuth } from '@/components/AuthProvider';
import { useWorkspaceContext } from '@/hooks/useWorkspaceContext';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Archive } from 'lucide-react';
import Link from 'next/link';

// Import modular components
import { WorkspaceLoading } from '@/components/workspace/WorkspaceLoading';
import { WorkspaceError } from '@/components/workspace/WorkspaceError';
import { WorkspaceSidebar } from '@/components/workspace/WorkspaceSidebar';
import { WorkspaceModuleRenderer } from '@/components/workspace/WorkspaceModuleRenderer';

export default function ParticipantWorkspacePage() {
  const { workspaceId } = useParams() as { workspaceId: string };
  const { user } = useAuth();
  const router = useRouter();

  // Call context resolution hook for guest actorId
  const { data: pkg, loading, error, refetch } = useWorkspaceContext(workspaceId, user?.uid || '');

  if (loading) return <WorkspaceLoading />;
  if (error || !pkg) return <WorkspaceError error={error} />;

  const { workspace, perspective, bindings } = pkg;
  
  const isArchived = perspective.allowedActions.length === 0;
  const workspaceStatus = isArchived ? 'archived' : 'active';

  // Guest action handlers (even if restricted, we pass them for component robustness)
  const handleInvite = async (inviteEmail: string) => {
    try {
      const res = await fetch(`/api/operational/assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId, targetEmail: inviteEmail, role: 'member' })
      });
      if (res.ok) {
        refetch();
        alert('Invitation sent successfully!');
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Failed to invite: ${err.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleBind = async (bindType: string, bindId: string) => {
    try {
      const res = await fetch(`/api/operational/resources`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId, entityType: bindType, entityId: bindId })
      });
      if (res.ok) {
        refetch();
        alert('Entity bound successfully!');
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Failed to bind: ${err.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleArchive = async () => {
    if (!confirm('Are you sure you want to archive this workspace?')) return;
    try {
      const res = await fetch(`/api/operational/assignments`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId, status: 'archived' })
      });
      if (res.ok) {
        refetch();
        alert('Workspace archived successfully.');
      } else {
        alert('Failed to archive workspace.');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <Link href="/guest/portal" style={styles.backLink}>
            <ArrowLeft size={18} /> Back to Guest Portal
          </Link>
          <div style={styles.titleRow}>
            <h1 style={styles.title}>Workspace {workspace.id}</h1>
            <span style={workspaceStatus === 'active' ? styles.statusBadgeActive : styles.statusBadgeArchived}>
              {workspaceStatus.toUpperCase()}
            </span>
          </div>
          <p style={styles.subtitle}>
            Objective: {workspace.objectiveTemplate || 'Travel/Planning Context'} | Privacy: {workspace.governance.privacy}
          </p>
        </div>
        <div style={styles.headerRight}>
          {perspective.allowedActions.includes('archiveWorkspace') && workspaceStatus === 'active' && (
            <button onClick={handleArchive} style={styles.archiveBtn}>
              <Archive size={16} /> Archive Context
            </button>
          )}
        </div>
      </header>

      {/* Main Layout Grid */}
      <div style={styles.grid}>
        {/* Sidebar: perspective, actions, bound assets */}
        <WorkspaceSidebar
          workspaceId={workspaceId}
          perspective={perspective}
          bindings={bindings}
          onInvite={handleInvite}
          onBind={handleBind}
          isArchived={workspaceStatus === 'archived'}
        />

        {/* Main Content Area: dynamically renders tabs & modules */}
        <WorkspaceModuleRenderer
          visibleModules={perspective.visibleModules}
        />
      </div>
    </div>
  );
}

// Styling Constants aligned to Guest portal dark-mode
const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#0F1112',
    color: '#E3E4E6',
    fontFamily: '"Outfit", "Inter", sans-serif',
    padding: '2rem',
  },
  header: {
    borderBottom: '1px solid #1E2326',
    paddingBottom: '1.5rem',
    marginBottom: '2rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  headerLeft: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.5rem',
  },
  backLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.4rem',
    fontSize: '0.85rem',
    color: '#D8C7AF',
    textDecoration: 'none',
    opacity: 0.85,
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  title: {
    fontSize: '2rem',
    fontWeight: '700',
    color: '#FFFFFF',
    margin: 0,
  },
  statusBadgeActive: {
    backgroundColor: 'rgba(52, 211, 153, 0.1)',
    color: '#34D399',
    fontSize: '0.7rem',
    fontWeight: '700',
    padding: '0.2rem 0.6rem',
    borderRadius: '4px',
    border: '1px solid rgba(52, 211, 153, 0.2)',
  },
  statusBadgeArchived: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    color: '#EF4444',
    fontSize: '0.7rem',
    fontWeight: '700',
    padding: '0.2rem 0.6rem',
    borderRadius: '4px',
    border: '1px solid rgba(239, 68, 68, 0.2)',
  },
  subtitle: {
    fontSize: '0.85rem',
    color: '#9CA3AF',
    margin: 0,
  },
  headerRight: {},
  archiveBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.4rem',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    color: '#EF4444',
    padding: '0.5rem 1rem',
    borderRadius: '6px',
    fontSize: '0.85rem',
    cursor: 'pointer',
    fontWeight: '500',
    transition: 'all 0.2s',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '320px 1fr',
    gap: '2rem',
  },
};
