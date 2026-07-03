'use client';

import { Lock } from 'lucide-react';
import { workspaceStyles as styles } from '../styles';

export function CalendarModule({ state }: { state: 'active' | 'read-only' | 'locked' | 'closed' }) {
  return (
    <div style={styles.card}>
      <h3 style={styles.moduleTitle}>
        Operational Calendar
        {state === 'read-only' && (
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
  );
}
