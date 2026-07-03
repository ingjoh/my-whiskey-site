'use client';

import { ArrowLeft, Archive } from 'lucide-react';
import Link from 'next/link';
import type { ResolvedContextPackage } from '@/lib/services/contextResolutionEngine';
import { WorkspaceSidebar } from './WorkspaceSidebar';
import { WorkspaceModuleRenderer } from './WorkspaceModuleRenderer';
import { workspaceStyles as styles } from './styles';

interface WorkspaceShellProps {
  resolvedContext: ResolvedContextPackage;
  backPath: string;
  backLabel: string;
  onInvite: (email: string) => Promise<void>;
  onBind: (type: string, id: string) => Promise<void>;
  onArchive: () => Promise<void>;
}

export function WorkspaceShell({
  resolvedContext,
  backPath,
  backLabel,
  onInvite,
  onBind,
  onArchive
}: WorkspaceShellProps) {
  const { workspace, perspective, bindings } = resolvedContext;
  
  const isArchived = perspective.allowedActions.length === 0;
  const workspaceStatus = isArchived ? 'archived' : 'active';

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <Link href={backPath} style={styles.backLink}>
            <ArrowLeft size={18} /> {backLabel}
          </Link>
          <div style={styles.titleRow}>
            <h1 style={styles.title}>Workspace {workspace.id}</h1>
            <span style={workspaceStatus === 'active' ? styles.statusBadgeActive : styles.statusBadgeArchived}>
              {workspaceStatus.toUpperCase()}
            </span>
          </div>
          <p style={styles.subtitle}>
            Objective Template: <code style={styles.code}>{workspace.objectiveTemplate || 'Unspecified'}</code> | Privacy: {workspace.governance.privacy}
          </p>
        </div>
        <div style={styles.headerRight}>
          {perspective.allowedActions.includes('archiveWorkspace') && workspaceStatus === 'active' && (
            <button onClick={onArchive} style={styles.archiveBtn}>
              <Archive size={16} /> Archive Context
            </button>
          )}
        </div>
      </header>

      {/* Main Layout Grid */}
      <div style={styles.grid}>
        {/* Sidebar: perspective, actions, bound assets */}
        <WorkspaceSidebar
          workspaceId={workspace.id}
          perspective={perspective}
          bindings={bindings}
          onInvite={onInvite}
          onBind={onBind}
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
