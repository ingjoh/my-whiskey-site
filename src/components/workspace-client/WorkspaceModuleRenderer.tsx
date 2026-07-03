'use client';

import { useState, useEffect } from 'react';
import { MessageSquare, Calendar, CheckSquare, DollarSign, Lock } from 'lucide-react';
import type { ResolvedContextPackage } from '@/lib/services/contextResolutionEngine';
import { MODULE_REGISTRY } from './ModuleRegistry';
import { workspaceStyles as styles } from './styles';

interface WorkspaceModuleRendererProps {
  visibleModules: ResolvedContextPackage['perspective']['visibleModules'];
}

export function WorkspaceModuleRenderer({ visibleModules }: WorkspaceModuleRendererProps) {
  const [activeTab, setActiveTab] = useState<string>('');

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
  
  // Resolve component dynamically from registry
  const RegisteredComponent = activeTab ? MODULE_REGISTRY[activeTab] : null;

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
        {RegisteredComponent ? (
          <RegisteredComponent state={activeState} />
        ) : (
          <div style={styles.noModulesCard}>
            <p>Module "{activeTab}" is not registered in the Workspace Module Registry.</p>
          </div>
        )}
      </div>
    </div>
  );
}
