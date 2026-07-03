'use client';

import { DollarSign, Lock } from 'lucide-react';
import { workspaceStyles as styles } from '../styles';

export function BudgetModule({ state }: { state: 'active' | 'read-only' | 'locked' | 'closed' }) {
  return (
    <div style={styles.card}>
      <h3 style={styles.moduleTitle}>
        Financial Allocations & Settlements
        {state === 'read-only' && (
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
  );
}
