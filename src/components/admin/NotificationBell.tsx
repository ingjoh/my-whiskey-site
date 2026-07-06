'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { Bell, Check, FileText, Gift, CreditCard, Star, Calendar, X, AlertCircle } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, limit, onSnapshot, doc, updateDoc, writeBatch } from 'firebase/firestore';

export default function NotificationBell() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 1. Verify admin privilege
  useEffect(() => {
    if (user) {
      user.getIdTokenResult().then((tokenResult) => {
        const claims = tokenResult.claims;
        const hasAdminAccess = !!(claims.admin || claims.roles);
        setIsAdmin(hasAdminAccess);
      }).catch(() => {
        setIsAdmin(false);
      });
    } else {
      setIsAdmin(false);
    }
  }, [user]);

  // 2. Listen to unread and recent notifications in real-time
  useEffect(() => {
    if (!isAdmin) return;

    const q = query(
      collection(db, 'notifications'),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      setNotifications(list);
    }, (err) => {
      console.error('Error listening to notifications:', err);
    });

    return () => unsubscribe();
  }, [isAdmin]);

  // 3. Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isAdmin) return null;

  const unreadCount = notifications.filter(n => !n.read).length;

  const getIcon = (type: string) => {
    switch (type) {
      case 'booking':
        return <Calendar size={14} style={{ color: '#B9783B' }} />;
      case 'waiver':
        return <FileText size={14} style={{ color: '#708C84' }} />;
      case 'tip':
        return <Gift size={14} style={{ color: '#E9C46A' }} />;
      case 'payment':
        return <CreditCard size={14} style={{ color: '#708C84' }} />;
      case 'testimonial':
        return <Star size={14} style={{ color: '#E9C46A' }} />;
      default:
        return <AlertCircle size={14} style={{ color: '#B9783B' }} />;
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      const ref = doc(db, 'notifications', id);
      await updateDoc(ref, { read: true });
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const unread = notifications.filter(n => !n.read);
      if (unread.length === 0) return;
      const batch = writeBatch(db);
      unread.forEach((n) => {
        batch.update(doc(db, 'notifications', n.id), { read: true });
      });
      await batch.commit();
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const formatTime = (isoString: string) => {
    try {
      const diff = Date.now() - new Date(isoString).getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 1) return 'Just now';
      if (mins < 60) return `${mins}m ago`;
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return `${hrs}h ago`;
      return new Date(isoString).toLocaleDateString();
    } catch (e) {
      return '';
    }
  };

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: 'transparent',
          border: 'none',
          color: '#D8C7AF',
          cursor: 'pointer',
          padding: '0.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          transition: 'color 0.2s',
          outline: 'none'
        }}
        onMouseOver={e => e.currentTarget.style.color = '#B9783B'}
        onMouseOut={e => e.currentTarget.style.color = '#D8C7AF'}
        title="Admin Notifications"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '4px',
            right: '4px',
            background: '#EF4444',
            color: 'white',
            fontSize: '0.62rem',
            fontWeight: 800,
            width: '15px',
            height: '15px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 0 2px #1E2124'
          }}>
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '40px',
          right: '0',
          width: '320px',
          background: '#1E2124',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '8px',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.5)',
          zIndex: 10000,
          display: 'flex',
          flexDirection: 'column',
          fontFamily: "'Inter', sans-serif"
        }}>
          {/* Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0.75rem 1rem',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)'
          }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'white', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Notifications
            </span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#B9783B',
                  fontSize: '0.68rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.2rem'
                }}
              >
                <Check size={12} /> Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div style={{
            maxHeight: '350px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#D8C7AF', opacity: 0.5, fontSize: '0.75rem' }}>
                No recent notifications.
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => {
                    handleMarkAsRead(n.id);
                    if (n.link) {
                      window.location.href = n.link;
                    }
                  }}
                  style={{
                    padding: '0.75rem 1rem',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
                    cursor: 'pointer',
                    background: n.read ? 'transparent' : 'rgba(185, 120, 59, 0.04)',
                    display: 'flex',
                    gap: '0.75rem',
                    transition: 'background 0.2s',
                    position: 'relative'
                  }}
                  onMouseOver={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)'}
                  onMouseOut={e => e.currentTarget.style.background = n.read ? 'transparent' : 'rgba(185, 120, 59, 0.04)'}
                >
                  {/* Icon */}
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.04)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {getIcon(n.type)}
                  </div>

                  {/* Body */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', flex: 1 }}>
                    <span style={{ fontSize: '0.74rem', fontWeight: n.read ? 500 : 700, color: 'white' }}>
                      {n.title}
                    </span>
                    <span style={{ fontSize: '0.68rem', color: '#D8C7AF', opacity: 0.8, lineHeight: '1.3' }}>
                      {n.message}
                    </span>
                    <span style={{ fontSize: '0.62rem', color: '#D8C7AF', opacity: 0.5, marginTop: '0.15rem' }}>
                      {formatTime(n.createdAt)}
                    </span>
                  </div>

                  {/* Unread dot */}
                  {!n.read && (
                    <div style={{
                      position: 'absolute',
                      right: '12px',
                      top: '12px',
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: '#B9783B'
                    }} />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
