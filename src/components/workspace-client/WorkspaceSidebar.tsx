'use client';

import { Shield, Paperclip, Users, Plus, Globe, RefreshCw, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { ResolvedContextPackage } from '@/lib/services/contextResolutionEngine';
import { workspaceStyles as styles } from './styles';
import { loadWorkspaceConfig } from '@/lib/db';

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

  // Domain configurations states
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [customDomainInput, setCustomDomainInput] = useState('');
  const [dnsStatus, setDnsStatus] = useState<any>(null);

  useEffect(() => {
    async function fetchConfig() {
      const cfg = await loadWorkspaceConfig(workspaceId);
      if (cfg) {
        setConfig(cfg);
        if (cfg.website?.customDomain) {
          setCustomDomainInput(cfg.website.customDomain);
          if (cfg.extensibleSettings?.dnsVerification) {
            setDnsStatus(cfg.extensibleSettings.dnsVerification);
          }
        }
      }
    }
    fetchConfig();
  }, [workspaceId]);

  const handleSaveDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customDomainInput.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/workspaces/domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId, customDomain: customDomainInput.trim() })
      });
      if (res.ok) {
        alert('Custom domain associated successfully!');
        const cfg = await loadWorkspaceConfig(workspaceId);
        if (cfg) {
          setConfig(cfg);
          if (cfg.extensibleSettings?.dnsVerification) {
            setDnsStatus(cfg.extensibleSettings.dnsVerification);
          }
        }
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Failed to save domain: ${err.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckVerification = async () => {
    if (!config?.website?.customDomain) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/workspaces/domains?workspaceId=${workspaceId}&customDomain=${config.website.customDomain}`);
      if (res.ok) {
        const result = await res.json();
        alert(`DNS Verification updated. Status: ${result.data?.verified ? 'VERIFIED' : 'PENDING'}`);
        const cfg = await loadWorkspaceConfig(workspaceId);
        if (cfg) {
          setConfig(cfg);
          if (cfg.extensibleSettings?.dnsVerification) {
            setDnsStatus(cfg.extensibleSettings.dnsVerification);
          }
        }
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Failed to check verification: ${err.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveDomain = async () => {
    if (!config?.website?.customDomain) return;
    if (!confirm('Are you sure you want to remove this custom domain? This will unlink it from Vercel.')) return;
    setLoading(true);
    try {
      const res = await fetch('/api/workspaces/domains', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId, customDomain: config.website.customDomain })
      });
      if (res.ok) {
        alert('Custom domain removed successfully.');
        setCustomDomainInput('');
        setDnsStatus(null);
        const cfg = await loadWorkspaceConfig(workspaceId);
        setConfig(cfg);
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Failed to remove domain: ${err.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

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
      {/* Custom Domain Settings Card (Gated by Allowed Actions) */}
      {(allowedActions.includes('bindEntity') || role === 'owner') && (
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>
            <Globe size={16} color="#D8C7AF" /> Custom Domain Settings
          </h3>
          
          {config?.website?.customDomain ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ backgroundColor: '#1C1F22', padding: '0.75rem', borderRadius: '6px', border: '1px solid #252A2D' }}>
                <div style={{ fontSize: '0.75rem', color: '#9CA3AF', marginBottom: '0.25rem' }}>Assigned Domain</div>
                <code style={{ fontSize: '0.85rem', color: '#FFFFFF', display: 'block', wordBreak: 'break-all' }}>
                  {config.website.customDomain}
                </code>
                
                {dnsStatus ? (
                  <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem' }}>
                    {dnsStatus.verified ? (
                      <span style={{ color: '#34D399', fontWeight: 600 }}>✓ DNS Verified</span>
                    ) : (
                      <span style={{ color: '#EF4444', fontWeight: 600 }}>⚠️ DNS Verification Pending</span>
                    )}
                    <span style={{ color: '#9CA3AF', fontSize: '0.7rem' }}>
                      (Checked {new Date(dnsStatus.lastChecked).toLocaleDateString()})
                    </span>
                  </div>
                ) : (
                  <div style={{ marginTop: '0.5rem', color: '#9CA3AF', fontSize: '0.75rem' }}>
                    Status: Not Checked
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={handleCheckVerification}
                  disabled={loading}
                  style={{
                    flex: 1,
                    backgroundColor: '#1E2225',
                    border: '1px solid #2E3338',
                    color: '#E3E4E6',
                    padding: '0.4rem',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.25rem'
                  }}
                >
                  <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Check Status
                </button>
                <button
                  onClick={handleRemoveDomain}
                  disabled={loading}
                  style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#EF4444',
                    padding: '0.4rem 0.6rem',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSaveDomain} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Point your DNS A record to Vercel's IP: 216.198.79.1.</div>
              <div style={styles.formGroupRow}>
                <input 
                  type="text" 
                  placeholder="e.g. example.com" 
                  value={customDomainInput}
                  onChange={e => setCustomDomainInput(e.target.value)}
                  style={styles.textInput}
                  required
                  disabled={loading}
                />
                <button type="submit" style={styles.addBtn} disabled={loading}>
                  {loading ? '...' : <Plus size={16} />}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </aside>
  );
}
