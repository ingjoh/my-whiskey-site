'use client';

import { Shield, Paperclip, Users, Plus } from 'lucide-react';
import { useState } from 'react';
import type { ResolvedContextPackage } from '@/lib/services/contextResolutionEngine';
import { workspaceStyles as styles } from './styles';

interface WorkspaceSidebarProps {
  workspaceId: string;
  perspective: ResolvedContextPackage['perspective'];
  bindings: ResolvedContextPackage['bindings'];
  onInvite: (email: string) => Promise<void>;
  onBind: (type: string, id: string) => Promise<void>;
  isArchived: boolean;
}

export function WorkspaceSidebar({
  workspaceId,
  perspective,
  bindings,
  onInvite,
  onBind,
  isArchived
}: WorkspaceSidebarProps) {
  const [inviteEmail, setInviteEmail] = useState('');
  const [bindType, setBindType] = useState('Organization');
  const [bindId, setBindId] = useState('');

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;
    await onInvite(inviteEmail);
    setInviteEmail('');
  };

  const handleBindSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bindId) return;
    await onBind(bindType, bindId);
    setBindId('');
  };

  const { role, allowedActions } = perspective;

  return (
    <aside style={styles.sidebar}>
      {/* Perspective Card */}
      <div style={styles.card}>
        <h3 style={styles.cardTitle}>
          <Shield size={16} color="#D8C7AF" /> Your Perspective
        </h3>
        <div style={styles.roleRow}>
          <span style={styles.roleLabel}>Active Role</span>
          <span style={styles.roleVal}>{role.toUpperCase()}</span>
        </div>
        <div style={styles.actionsBox}>
          <span style={styles.subLabel}>Permissions Granted</span>
          {allowedActions.length === 0 ? (
            <p style={styles.noActionsText}>No administrative capabilities (Read-Only).</p>
          ) : (
            <ul style={styles.actionsList}>
              {allowedActions.map(act => (
                <li key={act} style={styles.actionItem}>✓ {act}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Bound Assets Card */}
      <div style={styles.card}>
        <h3 style={styles.cardTitle}>
          <Paperclip size={16} color="#D8C7AF" /> Bound Platform Assets ({bindings.length})
        </h3>
        {bindings.length === 0 ? (
          <p style={styles.emptyText}>No platform entities bound to this context.</p>
        ) : (
          <div style={styles.bindingsList}>
            {bindings.map(bind => (
              <div key={bind.bindingId} style={styles.bindingItem}>
                <div style={styles.bindingHeader}>
                  <span style={styles.bindingType}>{bind.entityType}</span>
                  <code style={styles.bindingIdCode}>{bind.entityId}</code>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Bind Form (Gated by Allowed Actions) */}
        {allowedActions.includes('bindEntity') && !isArchived && (
          <form onSubmit={handleBindSubmit} style={styles.sideForm}>
            <h4 style={styles.formTitle}>Bind Platform Entity</h4>
            <div style={styles.formGroup}>
              <select 
                value={bindType} 
                onChange={e => setBindType(e.target.value)} 
                style={styles.selectInput}
              >
                <option value="Organization">Organization</option>
                <option value="Person">Person</option>
                <option value="Resource">Resource</option>
                <option value="Booking">Booking</option>
              </select>
            </div>
            <div style={styles.formGroupRow}>
              <input 
                type="text" 
                placeholder="Enter Entity ID..." 
                value={bindId}
                onChange={e => setBindId(e.target.value)}
                style={styles.textInput}
                required
              />
              <button type="submit" style={styles.addBtn}>
                <Plus size={16} />
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Invite Form (Gated by Allowed Actions) */}
      {allowedActions.includes('inviteMembers') && !isArchived && (
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>
            <Users size={16} color="#D8C7AF" /> Invite Team Members
          </h3>
          <form onSubmit={handleInviteSubmit} style={styles.sideForm}>
            <div style={styles.formGroupRow}>
              <input 
                type="email" 
                placeholder="Enter email address..." 
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                style={styles.textInput}
                required
              />
              <button type="submit" style={styles.addBtn}>
                <Plus size={16} />
              </button>
            </div>
          </form>
        </div>
      )}
    </aside>
  );
}
