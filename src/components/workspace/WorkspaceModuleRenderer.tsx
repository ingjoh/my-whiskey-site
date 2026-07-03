'use client';

import { useState, useEffect } from 'react';
import { MessageSquare, Calendar, CheckSquare, DollarSign, Lock } from 'lucide-react';
import type { ResolvedContextPackage } from '@/lib/services/contextResolutionEngine';
import { ChatModule } from './modules/ChatModule';
import { CalendarModule } from './modules/CalendarModule';
import { VotingModule } from './modules/VotingModule';
import { BudgetModule } from './modules/BudgetModule';

interface WorkspaceModuleRendererProps {
  visibleModules: ResolvedContextPackage['perspective']['visibleModules'];
}

export function WorkspaceModuleRenderer({ visibleModules }: WorkspaceModuleRendererProps) {
  const [activeTab, setActiveTab] = useState<string>('');

  // Auto-set the first active module tab when modules resolve
  useEffect(() => {
    if (visibleModules.length > 0 && !activeTab) {
      setActiveTab(visibleModules[0].moduleId);
    }
  }, [visibleModules, activeTab]);

  if (visibleModules.length === 0) {
    return (
      <div style={styles.noModulesCard}>
        <Lock size={32} color="#D8C7AF" />
        <p>No active collaboration modules visible for your perspective.</p>
      </div>
    );
  }

  const activeModule = visibleModules.find(m => m.moduleId === activeTab);
  const activeState = activeModule ? activeModule.state : 'active';

  return (
    <div style={styles.mainContent}>
      {/* Tab bar header */}
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

      {/* Module display view orchestration */}
      <div style={styles.modulePanel}>
        {activeTab === 'chat' && <ChatModule state={activeState} />}
        {activeTab === 'calendar' && <CalendarModule state={activeState} />}
        {activeTab === 'voting' && <VotingModule state={activeState} />}
        {activeTab === 'budget' && <BudgetModule state={activeState} />}
      </div>
    </div>
  );
}

const styles = {
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
};
