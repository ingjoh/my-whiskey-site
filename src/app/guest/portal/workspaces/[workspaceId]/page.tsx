'use client';

import { useAuth } from '@/components/AuthProvider';
import { useWorkspaceContext } from '@/hooks/useWorkspaceContext';
import { useParams } from 'next/navigation';

// Import modular Workspace Client components
import { WorkspaceLoading } from '@/components/workspace-client/WorkspaceLoading';
import { WorkspaceError } from '@/components/workspace-client/WorkspaceError';
import { WorkspaceShell } from '@/components/workspace-client/WorkspaceShell';

export default function ParticipantWorkspacePage() {
  const { workspaceId } = useParams() as { workspaceId: string };
  const { user } = useAuth();

  // Call context resolution hook for guest actorId
  const { data: pkg, loading, error, refetch } = useWorkspaceContext(workspaceId, user?.uid || '');

  if (loading) return <WorkspaceLoading />;
  if (error || !pkg) return <WorkspaceError error={error} backPath="/guest/portal" />;

  // Participant actions mapped directly to dynamic context capabilities
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
    <WorkspaceShell
      resolvedContext={pkg}
      backPath="/guest/portal"
      backLabel="Back to Guest Portal"
      onInvite={handleInvite}
      onBind={handleBind}
      onArchive={handleArchive}
    />
  );
}
