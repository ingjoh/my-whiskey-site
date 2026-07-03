'use client';

import { CheckSquare, Lock } from 'lucide-react';
import { workspaceStyles as styles } from '../styles';

export function VotingModule({ state }: { state: 'active' | 'read-only' | 'locked' | 'closed' }) {
  return (
    <div style={styles.card}>
      <h3 style={styles.moduleTitle}>
        Collaboration Polls & Voting
        {state === 'read-only' && (
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
  );
}
