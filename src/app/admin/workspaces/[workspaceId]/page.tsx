'use client';

import { useAuth } from '@/components/AuthProvider';
import { useWorkspaceContext } from '@/hooks/useWorkspaceContext';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { 
  ArrowLeft, Lock, Users, Paperclip, MessageSquare, Calendar, 
  DollarSign, CheckSquare, Shield, AlertCircle, Archive, Plus, Trash2, Send
} from 'lucide-react';
import Link from 'next/link';

export default function WorkspaceDetailPage() {
  const { workspaceId } = useParams() as { workspaceId: string };
  const { user } = useAuth();
  const router = useRouter();

  // Active sub-tab state inside the workspace view
  const [activeTab, setActiveTab] = useState<string>('');
  
  // Local interaction mock states
  const [inviteEmail, setInviteEmail] = useState('');
  const [bindType, setBindType] = useState('Organization');
  const [bindId, setBindId] = useState('');
  const [chatMessage, setChatMessage] = useState('');

  // Call the central resolution hook
  const { data: pkg, loading, error, refetch } = useWorkspaceContext(workspaceId, user?.uid || '');

  // Auto-set the first active module tab when data resolves
  const visibleModules = pkg?.perspective.visibleModules || [];
  const allowedActions = pkg?.perspective.allowedActions || [];
  
  if (visibleModules.length > 0 && !activeTab) {
    setActiveTab(visibleModules[0].moduleId);
  }

  // Action handlers calling endpoints or repository interfaces
  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;
    try {
      const res = await fetch(`/api/operational/assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId, targetEmail: inviteEmail, role: 'member' })
      });
      if (res.ok) {
        setInviteEmail('');
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

  const handleBind = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bindId) return;
    try {
      const res = await fetch(`/api/operational/resources`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId, entityType: bindType, entityId: bindId })
      });
      if (res.ok) {
        setBindId('');
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
    if (!confirm('Are you sure you want to archive this workspace? This will lock all collaborative updates.')) return;
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

  // Rendering Helpers
  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p style={styles.loadingText}>Compiling Workspace Context Perspective...</p>
      </div>
    );
  }

  if (error || !pkg) {
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

  const { workspace, perspective, bindings } = pkg;
  const isArchived = workspace.governance.privacy === 'private' && allowedActions.length === 0; 
  // Read archived status based on allowedActions constraints
  const workspaceStatus = allowedActions.length === 0 ? 'archived' : 'active';

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <Link href="/admin" style={styles.backLink}>
            <ArrowLeft size={18} /> Back to Dashboard
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
          {allowedActions.includes('archiveWorkspace') && workspaceStatus === 'active' && (
            <button onClick={handleArchive} style={styles.archiveBtn}>
              <Archive size={16} /> Archive Context
            </button>
          )}
        </div>
      </header>

      {/* Main Layout Grid */}
      <div style={styles.grid}>
        
        {/* Left Panel: Perspective & Bindings */}
        <aside style={styles.sidebar}>
          
          {/* User Role Card */}
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>
              <Shield size={16} color="#D8C7AF" /> Your Perspective
            </h3>
            <div style={styles.roleRow}>
              <span style={styles.roleLabel}>Active Role</span>
              <span style={styles.roleVal}>{perspective.role.toUpperCase()}</span>
            </div>
            <div style={styles.actionsBox}>
              <span style={styles.subLabel}>Permissions Granted</span>
              {perspective.allowedActions.length === 0 ? (
                <p style={styles.noActionsText}>No administrative capabilities (Read-Only).</p>
              ) : (
                <ul style={styles.actionsList}>
                  {perspective.allowedActions.map(act => (
                    <li key={act} style={styles.actionItem}>✓ {act}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Bound Entities list */}
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

            {/* Gate Binding Creation form */}
            {allowedActions.includes('bindEntity') && workspaceStatus === 'active' && (
              <form onSubmit={handleBind} style={styles.sideForm}>
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

          {/* Gate Team Invitation card */}
          {allowedActions.includes('inviteMembers') && workspaceStatus === 'active' && (
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>
                <Users size={16} color="#D8C7AF" /> Invite Team Members
              </h3>
              <form onSubmit={handleInvite} style={styles.sideForm}>
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

        {/* Right Panel: Active Modules tabs & contents */}
        <main style={styles.mainContent}>
          {visibleModules.length === 0 ? (
            <div style={styles.noModulesCard}>
              <Lock size={32} color="#D8C7AF" />
              <p>No active collaboration modules visible for your perspective.</p>
            </div>
          ) : (
            <div>
              {/* Modules navigation tabs */}
              <div style={styles.tabsRow}>
                {visibleModules.map(mod => {
                  const isActive = activeTab === mod.moduleId;
                  const isReadOnly = mod.state === 'read-only';
                  return (
                    <button
                      key={mod.moduleId}
                      onClick={() => setActiveTab(mod.moduleId)}
                      style={isActive ? styles.tabActive : styles.tabInactive}
                    >
                      {mod.moduleId === 'chat' && <MessageSquare size={14} />}
                      {mod.moduleId === 'calendar' && <Calendar size={14} />}
                      {mod.moduleId === 'voting' && <CheckSquare size={14} />}
                      {mod.moduleId === 'budget' && <DollarSign size={14} />}
                      <span style={{ marginLeft: '0.45rem' }}>{mod.moduleId.toUpperCase()}</span>
                      {isReadOnly && <Lock size={10} style={{ marginLeft: '0.3rem', opacity: 0.7 }} />}
                    </button>
                  );
                })}
              </div>

              {/* Module Content Area */}
              <div style={styles.modulePanel}>
                {activeTab === 'chat' && (
                  <div style={styles.moduleCard}>
                    <h3 style={styles.moduleTitle}>
                      Workspace Message Thread 
                      {visibleModules.find(m => m.moduleId === 'chat')?.state === 'read-only' && (
                        <span style={styles.readOnlyLabel}><Lock size={10} /> READ-ONLY</span>
                      )}
                    </h3>
                    <div style={styles.chatThread}>
                      <div style={styles.chatMsg}>
                        <span style={styles.chatSender}>System Log</span>
                        <p style={styles.chatBody}>Workspace initialized for collaboration.</p>
                      </div>
                      <div style={styles.chatMsg}>
                        <span style={styles.chatSender}>Coordinator</span>
                        <p style={styles.chatBody}>Please review the bound platform resources list on the left side panel.</p>
                      </div>
                    </div>
                    
                    {/* Render input only if module state is active */}
                    {visibleModules.find(m => m.moduleId === 'chat')?.state === 'active' ? (
                      <div style={styles.chatInputRow}>
                        <input
                          type="text"
                          placeholder="Type your message..."
                          value={chatMessage}
                          onChange={e => setChatMessage(e.target.value)}
                          style={styles.chatInput}
                        />
                        <button onClick={() => setChatMessage('')} style={styles.chatSendBtn}>
                          <Send size={14} /> Send
                        </button>
                      </div>
                    ) : (
                      <div style={styles.lockedBanner}>
                        <Lock size={14} /> Posting is locked because this module is Read-Only.
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'calendar' && (
                  <div style={styles.moduleCard}>
                    <h3 style={styles.moduleTitle}>
                      Operational Calendar
                      {visibleModules.find(m => m.moduleId === 'calendar')?.state === 'read-only' && (
                        <span style={styles.readOnlyLabel}><Lock size={10} /> READ-ONLY</span>
                      )}
                    </h3>
                    <div style={styles.calendarMock}>
                      <div style={styles.calendarDayActive}>
                        <span style={styles.dayNum}>03</span>
                        <span style={styles.dayLabel}>Today</span>
                        <p style={styles.eventText}>Briefing meeting scheduled at 14:00</p>
                      </div>
                      <div style={styles.calendarDay}>
                        <span style={styles.dayNum}>04</span>
                        <span style={styles.dayLabel}>Tomorrow</span>
                        <p style={styles.eventTextEmpty}>No scheduled bookings</p>
                      </div>
                      <div style={styles.calendarDay}>
                        <span style={styles.dayNum}>05</span>
                        <span style={styles.dayLabel}>Sunday</span>
                        <p style={styles.eventTextEmpty}>No scheduled bookings</p>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'voting' && (
                  <div style={styles.moduleCard}>
                    <h3 style={styles.moduleTitle}>
                      Collaboration Polls & Voting
                      {visibleModules.find(m => m.moduleId === 'voting')?.state === 'read-only' && (
                        <span style={styles.readOnlyLabel}><Lock size={10} /> READ-ONLY</span>
                      )}
                    </h3>
                    <div style={styles.voteMock}>
                      <p style={styles.voteQuestion}>Verify bound itinerary allocations correctness?</p>
                      <div style={styles.voteOptions}>
                        <button disabled style={styles.voteBtn}>Yes (0 votes)</button>
                        <button disabled style={styles.voteBtn}>No (0 votes)</button>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'budget' && (
                  <div style={styles.moduleCard}>
                    <h3 style={styles.moduleTitle}>
                      Financial Allocations & Settlements
                      {visibleModules.find(m => m.moduleId === 'budget')?.state === 'read-only' && (
                        <span style={styles.readOnlyLabel}><Lock size={10} /> READ-ONLY</span>
                      )}
                    </h3>
                    <div style={styles.budgetMock}>
                      <div style={styles.budgetItem}>
                        <span>Primary Charter Cost</span>
                        <span style={styles.budgetVal}>$4,500.00</span>
                      </div>
                      <div style={styles.budgetItem}>
                        <span>Fuel surcharge</span>
                        <span style={styles.budgetVal}>$350.00</span>
                      </div>
                      <div style={styles.budgetTotal}>
                        <span>Total Budget Allocation</span>
                        <span>$4,850.00</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// Styling Constants adhering strictly to system.md design tokens
const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#0F1112',
    color: '#E3E4E6',
    fontFamily: '"Outfit", "Inter", sans-serif',
    padding: '2rem',
  },
  loadingContainer: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F1112',
    color: '#E3E4E6',
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
    fontFamily: '"Outfit", sans-serif',
  },
  errorContainer: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F1112',
    padding: '2rem',
    textAlign: 'center' as const,
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
    transition: 'all 0.2s',
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
  code: {
    backgroundColor: '#16191B',
    padding: '0.1rem 0.3rem',
    borderRadius: '4px',
    color: '#D8C7AF',
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
  sidebar: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1.5rem',
  },
  card: {
    backgroundColor: '#15181A',
    border: '1px solid #202427',
    borderRadius: '8px',
    padding: '1.25rem',
  },
  cardTitle: {
    fontSize: '0.95rem',
    fontWeight: '600',
    color: '#FFFFFF',
    margin: '0 0 1rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  roleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1C1F22',
    padding: '0.75rem',
    borderRadius: '6px',
    border: '1px solid #2A2F34',
    marginBottom: '1rem',
  },
  roleLabel: {
    fontSize: '0.8rem',
    color: '#9CA3AF',
  },
  roleVal: {
    fontSize: '0.85rem',
    fontWeight: '700',
    color: '#D8C7AF',
  },
  actionsBox: {
    backgroundColor: '#111314',
    padding: '0.75rem',
    borderRadius: '6px',
    border: '1px solid #1D2022',
  },
  subLabel: {
    fontSize: '0.75rem',
    color: '#9CA3AF',
    display: 'block',
    marginBottom: '0.5rem',
  },
  noActionsText: {
    fontSize: '0.8rem',
    color: '#9CA3AF',
    margin: 0,
    fontStyle: 'italic' as const,
  },
  actionsList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.4rem',
  },
  actionItem: {
    fontSize: '0.8rem',
    color: '#34D399',
  },
  emptyText: {
    fontSize: '0.8rem',
    color: '#9CA3AF',
    fontStyle: 'italic' as const,
    margin: '0 0 1rem',
  },
  bindingsList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.6rem',
    marginBottom: '1rem',
  },
  bindingItem: {
    backgroundColor: '#1C1F22',
    padding: '0.6rem',
    borderRadius: '6px',
    border: '1px solid #252A2D',
  },
  bindingHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bindingType: {
    fontSize: '0.75rem',
    fontWeight: '600',
    color: '#D8C7AF',
  },
  bindingIdCode: {
    fontSize: '0.75rem',
    color: '#FFFFFF',
    backgroundColor: '#111314',
    padding: '0.1rem 0.3rem',
    borderRadius: '3px',
  },
  sideForm: {
    marginTop: '1rem',
    borderTop: '1px solid #202427',
    paddingTop: '1rem',
  },
  formTitle: {
    fontSize: '0.8rem',
    color: '#FFFFFF',
    margin: '0 0 0.6rem',
  },
  formGroup: {
    marginBottom: '0.5rem',
  },
  formGroupRow: {
    display: 'flex',
    gap: '0.5rem',
  },
  selectInput: {
    width: '100%',
    backgroundColor: '#1E2225',
    border: '1px solid #2E3338',
    color: '#FFFFFF',
    padding: '0.4rem',
    borderRadius: '4px',
    fontSize: '0.8rem',
    outline: 'none',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#1E2225',
    border: '1px solid #2E3338',
    color: '#FFFFFF',
    padding: '0.4rem 0.6rem',
    borderRadius: '4px',
    fontSize: '0.8rem',
    outline: 'none',
  },
  addBtn: {
    backgroundColor: '#D8C7AF',
    color: '#0F1112',
    border: 'none',
    padding: '0 0.6rem',
    borderRadius: '4px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainContent: {
    display: 'flex',
    flexDirection: 'column' as const,
  },
  noModulesCard: {
    backgroundColor: '#15181A',
    border: '1px solid #202427',
    borderRadius: '8px',
    padding: '3rem 2rem',
    textAlign: 'center' as const,
    color: '#9CA3AF',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '1rem',
  },
  tabsRow: {
    display: 'flex',
    gap: '0.5rem',
    borderBottom: '1px solid #202427',
    paddingBottom: '0.1rem',
    marginBottom: '1.5rem',
  },
  tabActive: {
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: '2px solid #D8C7AF',
    color: '#D8C7AF',
    padding: '0.6rem 1rem',
    fontSize: '0.85rem',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
  },
  tabInactive: {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#9CA3AF',
    padding: '0.6rem 1rem',
    fontSize: '0.85rem',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    transition: 'all 0.2s',
  },
  modulePanel: {},
  moduleCard: {
    backgroundColor: '#15181A',
    border: '1px solid #202427',
    borderRadius: '8px',
    padding: '1.5rem',
  },
  moduleTitle: {
    fontSize: '1.1rem',
    color: '#FFFFFF',
    margin: '0 0 1.25rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  readOnlyLabel: {
    fontSize: '0.7rem',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    color: '#EF4444',
    padding: '0.15rem 0.4rem',
    borderRadius: '3px',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.25rem',
  },
  chatThread: {
    height: '240px',
    backgroundColor: '#111314',
    borderRadius: '6px',
    border: '1px solid #1D2022',
    padding: '1rem',
    overflowY: 'auto' as const,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1rem',
    marginBottom: '1rem',
  },
  chatMsg: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.2rem',
  },
  chatSender: {
    fontSize: '0.75rem',
    fontWeight: '600',
    color: '#D8C7AF',
  },
  chatBody: {
    fontSize: '0.85rem',
    color: '#E3E4E6',
    margin: 0,
  },
  chatInputRow: {
    display: 'flex',
    gap: '0.75rem',
  },
  chatInput: {
    flex: 1,
    backgroundColor: '#1E2225',
    border: '1px solid #2E3338',
    color: '#FFFFFF',
    padding: '0.6rem 0.8rem',
    borderRadius: '6px',
    fontSize: '0.85rem',
    outline: 'none',
  },
  chatSendBtn: {
    backgroundColor: '#D8C7AF',
    color: '#0F1112',
    border: 'none',
    padding: '0 1.25rem',
    borderRadius: '6px',
    fontSize: '0.85rem',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.4rem',
  },
  lockedBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
    border: '1px solid rgba(239, 68, 68, 0.1)',
    borderRadius: '6px',
    padding: '0.75rem',
    textAlign: 'center' as const,
    color: '#EF4444',
    fontSize: '0.8rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
  },
  calendarMock: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '1rem',
  },
  calendarDayActive: {
    backgroundColor: 'rgba(216, 199, 175, 0.05)',
    border: '1px solid #D8C7AF',
    borderRadius: '6px',
    padding: '1rem',
    display: 'flex',
    flexDirection: 'column' as const,
  },
  calendarDay: {
    backgroundColor: '#1A1D20',
    border: '1px solid #22272A',
    borderRadius: '6px',
    padding: '1rem',
    display: 'flex',
    flexDirection: 'column' as const,
  },
  dayNum: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#FFFFFF',
  },
  dayLabel: {
    fontSize: '0.75rem',
    color: '#9CA3AF',
    marginBottom: '0.5rem',
  },
  eventText: {
    fontSize: '0.8rem',
    color: '#D8C7AF',
    margin: 0,
  },
  eventTextEmpty: {
    fontSize: '0.8rem',
    color: '#4B5563',
    margin: 0,
  },
  voteMock: {
    backgroundColor: '#1A1D20',
    padding: '1rem',
    borderRadius: '6px',
    border: '1px solid #22272A',
  },
  voteQuestion: {
    fontSize: '0.9rem',
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: '1rem',
  },
  voteOptions: {
    display: 'flex',
    gap: '1rem',
  },
  voteBtn: {
    flex: 1,
    backgroundColor: '#252A2D',
    border: '1px solid #31373B',
    color: '#9CA3AF',
    padding: '0.5rem',
    borderRadius: '4px',
    fontSize: '0.8rem',
    cursor: 'not-allowed',
  },
  budgetMock: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.75rem',
  },
  budgetItem: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.85rem',
    color: '#9CA3AF',
    borderBottom: '1px dashed #202427',
    paddingBottom: '0.4rem',
  },
  budgetVal: {
    color: '#FFFFFF',
  },
  budgetTotal: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.95rem',
    fontWeight: '700',
    color: '#D8C7AF',
    marginTop: '0.5rem',
  },
};
