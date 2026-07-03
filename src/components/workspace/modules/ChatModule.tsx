'use client';

import { useState } from 'react';
import { MessageSquare, Lock, Send } from 'lucide-react';
import { workspaceStyles as styles } from '../styles';

export function ChatModule({ state }: { state: 'active' | 'read-only' | 'locked' | 'closed' }) {
  const [chatMessage, setChatMessage] = useState('');

  return (
    <div style={styles.card}>
      <h3 style={styles.moduleTitle}>
        Workspace Message Thread
        {state === 'read-only' && (
          <span style={styles.readOnlyLabel}><Lock size={10} /> READ-ONLY</span>
        )}
      </h3>
      <div style={styles.chatThread}>
        <div style={styles.chatMsg}>
          <span style={styles.chatSender}>System Log</span>
          <p style={styles.chatBody}>Workspace initialized for collaboration.</p>
        </div>
        <div style={styles.chatMsg}>
          <span style={styles.chatSender}>Participant</span>
          <p style={styles.chatBody}>Welcome to the shared workspace environment.</p>
        </div>
      </div>
      
      {state === 'active' ? (
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
  );
}
