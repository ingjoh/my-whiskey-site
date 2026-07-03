'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, ShieldAlert } from 'lucide-react';
import Link from 'next/link';

export default function WorkspaceProvisionPage() {
  const router = useRouter();
  const [templateId, setTemplateId] = useState('wt_business');
  const [subdomain, setSubdomain] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [ownerPersonId, setOwnerPersonId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/workspaces/provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId,
          subdomain,
          ownerPersonId,
          adminEmail
        })
      });
      
      if (res.ok) {
        alert('Workspace provisioned successfully!');
        router.push('/admin');
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Failed to provision workspace: ${err.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <Link href="/admin" style={styles.backLink}>
          <ArrowLeft size={18} /> Back to Dashboard
        </Link>
        <h1 style={styles.title}>System Admin Workspace Provisioning</h1>
        <p style={styles.subtitle}>Bootstrap a new multi-tenant operating environment from versioned templates.</p>
      </header>

      <form onSubmit={handleSubmit} style={styles.formCard}>
        <div style={styles.sectionHeader}>
          <ShieldAlert size={20} color="#D8C7AF" />
          <h2 style={styles.sectionTitle}>1. Template Selection & Configurations</h2>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Select Workspace Blueprint Template</label>
          <select
            value={templateId}
            onChange={e => setTemplateId(e.target.value)}
            style={styles.selectInput}
          >
            <option value="wt_business">wt_business (Chat, Calendar, Budget)</option>
            <option value="wt_collaboration">wt_collaboration (Chat, Voting)</option>
            <option value="wt_blank">wt_blank (No default modules)</option>
          </select>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Custom Subdomain Mapping</label>
          <input
            type="text"
            placeholder="e.g. charter-operator-west"
            value={subdomain}
            onChange={e => setSubdomain(e.target.value)}
            style={styles.textInput}
            required
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>First Workspace Admin Person ID</label>
          <input
            type="text"
            placeholder="e.g. pers_owner_uuid"
            value={ownerPersonId}
            onChange={e => setOwnerPersonId(e.target.value)}
            style={styles.textInput}
            required
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Contact Admin Email</label>
          <input
            type="email"
            placeholder="e.g. contact@operator.com"
            value={adminEmail}
            onChange={e => setAdminEmail(e.target.value)}
            style={styles.textInput}
            required
          />
        </div>

        <button type="submit" disabled={submitting} style={styles.submitBtn}>
          <Save size={16} /> {submitting ? 'Provisioning Environment...' : 'Bootstrap Operator Workspace'}
        </button>
      </form>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#0F1112',
    color: '#E3E4E6',
    fontFamily: '"Outfit", sans-serif',
    padding: '3rem 2rem',
    maxWidth: '640px',
    margin: '0 auto',
  },
  header: {
    marginBottom: '2.5rem',
  },
  backLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.4rem',
    fontSize: '0.85rem',
    color: '#D8C7AF',
    textDecoration: 'none',
    marginBottom: '1rem',
    opacity: 0.85,
  },
  title: {
    fontSize: '2rem',
    fontWeight: '700',
    color: '#FFFFFF',
    margin: '0 0 0.5rem',
  },
  subtitle: {
    fontSize: '0.9rem',
    color: '#9CA3AF',
    margin: 0,
  },
  formCard: {
    backgroundColor: '#15181A',
    border: '1px solid #202427',
    borderRadius: '8px',
    padding: '2rem',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1.5rem',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    borderBottom: '1px solid #202427',
    paddingBottom: '0.75rem',
    marginBottom: '0.5rem',
  },
  sectionTitle: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#FFFFFF',
    margin: 0,
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.4rem',
  },
  label: {
    fontSize: '0.85rem',
    fontWeight: '500',
    color: '#D8C7AF',
  },
  selectInput: {
    backgroundColor: '#1C1F22',
    border: '1px solid #2A2F34',
    borderRadius: '6px',
    color: '#FFFFFF',
    padding: '0.6rem 0.8rem',
    fontSize: '0.85rem',
    outline: 'none',
  },
  textInput: {
    backgroundColor: '#1C1F22',
    border: '1px solid #2A2F34',
    borderRadius: '6px',
    color: '#FFFFFF',
    padding: '0.6rem 0.8rem',
    fontSize: '0.85rem',
    outline: 'none',
  },
  submitBtn: {
    backgroundColor: '#D8C7AF',
    color: '#0F1112',
    border: 'none',
    borderRadius: '6px',
    padding: '0.75rem',
    fontSize: '0.9rem',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    marginTop: '1rem',
    transition: 'all 0.2s',
  },
};
