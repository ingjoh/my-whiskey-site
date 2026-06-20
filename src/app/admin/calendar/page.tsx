'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { 
  Calendar, Plus, Trash2, Globe, Sparkles, RefreshCw, Search,
  ChevronLeft, CheckCircle2, AlertTriangle, Eye, Loader2
} from 'lucide-react';
import { 
  getCalendarEvents, saveCalendarEvent, deleteCalendarEvent, CalendarEvent 
} from '@/lib/db';

export default function StandaloneCalendarDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // Loading and Notification States
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Calendar Events States
  const [eventsList, setEventsList] = useState<CalendarEvent[]>([]);
  const [isAddEventModalOpen, setIsAddEventModalOpen] = useState(false);
  const [isAISearchModalOpen, setIsAISearchModalOpen] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  const [aiSearchLocation, setAiSearchLocation] = useState('Destin, Florida');
  const [aiSearchYear, setAiSearchYear] = useState<number>(new Date().getFullYear());
  const [isSearchingAI, setIsSearchingAI] = useState(false);
  const [aiSelectedSuggestions, setAiSelectedSuggestions] = useState<number[]>([]);

  // Add Custom Event Form States
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDesc, setNewEventDesc] = useState('');
  const [newEventStartDate, setNewEventStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [newEventEndDate, setNewEventEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [newEventType, setNewEventType] = useState<'holiday' | 'national' | 'regional' | 'custom'>('custom');
  const [newEventImpactScore, setNewEventImpactScore] = useState<number>(1.0);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Auth Guard
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Load calendar events
  const loadData = async () => {
    setIsLoading(true);
    try {
      const events = await getCalendarEvents();
      setEventsList(events || []);
    } catch (err) {
      console.error('Failed to load calendar events:', err);
      showToast('Failed to load calendar events.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  // Calendar Handlers
  const handleImportHolidays = async () => {
    setIsLoading(true);
    try {
      const year = new Date().getFullYear();
      const res = await fetch(`https://date.nager.at/api/v3/publicholidays/${year}/US`);
      if (!res.ok) throw new Error('Failed to fetch holidays from Nager.Date API');
      const holidays = await res.json();
      
      let importCount = 0;
      for (const h of holidays) {
        const isMajor = ["New Year's Day", 'Memorial Day', 'Independence Day', 'Labor Day', 'Thanksgiving Day', 'Christmas Day'].includes(h.name);
        const score = isMajor ? 1.6 : 1.1;
        
        await saveCalendarEvent({
          title: h.name,
          description: h.localName || h.name,
          startDate: h.date,
          endDate: h.date,
          type: 'holiday',
          impactScore: score,
          importedFrom: 'nager'
        });
        importCount++;
      }
      
      await loadData();
      showToast(`Successfully imported ${importCount} US national holidays.`, 'success');
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Error importing holidays.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAISearchEvents = async () => {
    setIsSearchingAI(true);
    setAiSuggestions([]);
    setAiSelectedSuggestions([]);
    try {
      const idToken = await user?.getIdToken();
      const res = await fetch('/api/admin/events/suggest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`
        },
        body: JSON.stringify({ location: aiSearchLocation, year: aiSearchYear })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to search AI suggestions');
      
      setAiSuggestions(data.events || []);
      setAiSelectedSuggestions((data.events || []).map((_: any, idx: number) => idx));
      showToast(`AI suggested ${data.events?.length || 0} local & national events.`, 'success');
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Error executing AI search.', 'error');
    } finally {
      setIsSearchingAI(false);
    }
  };

  const handleImportAISuggestions = async () => {
    if (aiSelectedSuggestions.length === 0) {
      showToast('No events selected to import.', 'error');
      return;
    }
    
    setIsLoading(true);
    try {
      let count = 0;
      for (const idx of aiSelectedSuggestions) {
        const item = aiSuggestions[idx];
        if (item) {
          await saveCalendarEvent({
            title: item.title,
            description: item.description,
            startDate: item.startDate,
            endDate: item.endDate,
            type: item.type || 'regional',
            impactScore: Number(item.impactScore) || 1.0,
            importedFrom: 'gemini_ai'
          });
          count++;
        }
      }
      
      await loadData();
      setIsAISearchModalOpen(false);
      setAiSuggestions([]);
      showToast(`Successfully imported ${count} AI-suggested events.`, 'success');
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Error saving AI events.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveCustomEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventTitle.trim()) {
      showToast('Event title is required.', 'error');
      return;
    }
    setIsLoading(true);
    try {
      await saveCalendarEvent({
        title: newEventTitle,
        description: newEventDesc,
        startDate: newEventStartDate,
        endDate: newEventEndDate,
        type: newEventType,
        impactScore: Number(newEventImpactScore) || 1.0,
        importedFrom: 'manual'
      });
      
      await loadData();
      setIsAddEventModalOpen(false);
      
      setNewEventTitle('');
      setNewEventDesc('');
      setNewEventStartDate(new Date().toISOString().split('T')[0]);
      setNewEventEndDate(new Date().toISOString().split('T')[0]);
      setNewEventType('custom');
      setNewEventImpactScore(1.0);
      
      showToast('Custom event saved successfully.', 'success');
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Error saving custom event.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return;
    setIsLoading(true);
    try {
      const ok = await deleteCalendarEvent(id);
      if (ok) {
        setEventsList(prev => prev.filter(e => e.id !== id));
        showToast('Event deleted successfully.', 'success');
      } else {
        showToast('Failed to delete event.', 'error');
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Error deleting event.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#121416', color: '#F4F1EA' }}>
        <p>Verifying authentication...</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#121416', color: '#F4F1EA', padding: '2rem 3rem', fontFamily: 'var(--font-sans)', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Toast Notification */}
      {toast && (
        <div style={{ 
          position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 100,
          background: toast.type === 'success' ? '#166534' : toast.type === 'error' ? '#991b1b' : '#1e3a8a',
          color: 'white', padding: '1rem 1.5rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 10px 15px -3px rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', gap: '0.75rem',
          animation: 'fadeIn 0.2s ease'
        }}>
          {toast.type === 'success' ? <CheckCircle2 size={18} /> : toast.type === 'error' ? <AlertTriangle size={18} /> : <Eye size={18} />}
          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{toast.message}</span>
        </div>
      )}

      {/* Header Panel */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button 
            onClick={() => router.push('/admin')}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', width: '38px', height: '38px', color: '#D8C7AF', cursor: 'pointer', transition: 'all 0.2s' }}
            onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
            onMouseOut={e => e.currentTarget.style.background = 'transparent'}
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 style={{ fontSize: '2rem', fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, margin: 0, letterSpacing: '0.02em' }}>Events & Holiday Calendar</h1>
            <p style={{ color: '#D8C7AF', opacity: 0.8, margin: '0.25rem 0 0 0', fontSize: '0.85rem' }}>Configure holidays, tourism events, and manual schedules to dynamically drive recommendation strategies.</p>
          </div>
        </div>
        
        {/* Actions panel */}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button 
            onClick={handleImportHolidays}
            disabled={isLoading}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#1E2124', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '6px', padding: '0.6rem 1.2rem', color: '#D8C7AF', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', opacity: isLoading ? 0.7 : 1 }}
            onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
            onMouseOut={e => e.currentTarget.style.background = '#1E2124'}
          >
            <Globe size={14} color="#B9783B" /> Import Holidays
          </button>
          <button 
            onClick={() => { setIsAISearchModalOpen(true); setAiSuggestions([]); }}
            disabled={isLoading}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#1E2124', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '6px', padding: '0.6rem 1.2rem', color: '#D8C7AF', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', opacity: isLoading ? 0.7 : 1 }}
            onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
            onMouseOut={e => e.currentTarget.style.background = '#1E2124'}
          >
            <Sparkles size={14} color="#B9783B" /> AI Event Suggestion
          </button>
          <button 
            onClick={() => setIsAddEventModalOpen(true)}
            disabled={isLoading}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#B9783B', border: 'none', borderRadius: '6px', padding: '0.6rem 1.2rem', color: 'white', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', opacity: isLoading ? 0.7 : 1 }}
            onMouseOver={e => e.currentTarget.style.background = '#a1652e'}
            onMouseOut={e => e.currentTarget.style.background = '#B9783B'}
          >
            <Plus size={14} /> Add Event
          </button>
        </div>
      </div>

      {/* Main content table list */}
      <div style={{ background: '#1E2124', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '8px', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {isLoading && eventsList.length === 0 ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '4rem 0', gap: '0.5rem', color: '#D8C7AF' }}>
            <Loader2 className="animate-spin" size={24} color="#B9783B" />
            <span>Loading calendar database...</span>
          </div>
        ) : eventsList.length === 0 ? (
          <div style={{ padding: '6rem 2rem', textAlign: 'center', background: '#121416', border: '1px dashed rgba(255,255,255,0.06)', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <Calendar size={48} color="#B9783B" style={{ opacity: 0.4 }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <span style={{ fontSize: '1.05rem', fontWeight: 600, color: 'white' }}>No Calendar Events Found</span>
              <span style={{ fontSize: '0.825rem', color: '#D8C7AF', opacity: 0.6, maxWidth: '450px', lineHeight: 1.5 }}>
                Initialize the database by importing official US public holidays, scanning destination cities using Gemini AI suggestions, or manually logging custom charter blocks.
              </span>
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto', background: '#121416', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', color: '#D8C7AF', opacity: 0.7 }}>
                  <th style={{ padding: '1.25rem 1.5rem' }}>Event Title & Info</th>
                  <th style={{ padding: '1.25rem 1.5rem' }}>Dates</th>
                  <th style={{ padding: '1.25rem 1.5rem' }}>Type</th>
                  <th style={{ padding: '1.25rem 1.5rem', textAlign: 'center' }}>Business Weight</th>
                  <th style={{ padding: '1.25rem 1.5rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {eventsList.map((e) => {
                  const dateDisplay = e.startDate === e.endDate 
                    ? new Date(e.startDate + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                    : `${new Date(e.startDate + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - ${new Date(e.endDate + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;

                  let typeBg = 'rgba(59, 130, 246, 0.1)';
                  let typeColor = '#60a5fa';
                  if (e.type === 'holiday') {
                    typeBg = 'rgba(34, 197, 94, 0.1)';
                    typeColor = '#4ade80';
                  } else if (e.type === 'regional') {
                    typeBg = 'rgba(168, 85, 247, 0.1)';
                    typeColor = '#c084fc';
                  }

                  let scoreBg = 'rgba(255,255,255,0.05)';
                  let scoreColor = '#F4F1EA';
                  if (e.impactScore >= 1.2) {
                    scoreBg = 'rgba(185, 120, 59, 0.15)';
                    scoreColor = '#B9783B';
                  } else if (e.impactScore <= 0.8) {
                    scoreBg = 'rgba(239, 68, 68, 0.15)';
                    scoreColor = '#f87171';
                  }

                  return (
                    <tr key={e.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.2s' }} onMouseOver={el => el.currentTarget.style.background = 'rgba(255,255,255,0.01)'} onMouseOut={el => el.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '1.25rem 1.5rem', maxWidth: '350px' }}>
                        <div style={{ fontWeight: 600, color: 'white' }}>{e.title}</div>
                        {e.description && <div style={{ fontSize: '0.78rem', color: '#D8C7AF', opacity: 0.6, marginTop: '0.2rem', lineHeight: '1.3' }}>{e.description}</div>}
                      </td>
                      <td style={{ padding: '1.25rem 1.5rem', color: '#D8C7AF' }}>{dateDisplay}</td>
                      <td style={{ padding: '1.25rem 1.5rem' }}>
                        <span style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem', borderRadius: '4px', background: typeBg, color: typeColor, textTransform: 'capitalize', fontWeight: 600 }}>
                          {e.type}
                        </span>
                      </td>
                      <td style={{ padding: '1.25rem 1.5rem', textAlign: 'center' }}>
                        <span style={{ fontSize: '0.78rem', padding: '0.3rem 0.7rem', borderRadius: '20px', background: scoreBg, color: scoreColor, fontWeight: 700 }}>
                          {e.impactScore.toFixed(1)}x
                        </span>
                      </td>
                      <td style={{ padding: '1.25rem 1.5rem', textAlign: 'right' }}>
                        <button 
                          onClick={() => handleDeleteEvent(e.id)}
                          style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', opacity: 0.7, transition: 'opacity 0.2s', padding: '0.3rem' }}
                          onMouseOver={el => el.currentTarget.style.opacity = '1'}
                          onMouseOut={el => el.currentTarget.style.opacity = '0.7'}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Custom Event Modal */}
      {isAddEventModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', padding: '1rem' }}>
          <div style={{ background: '#1E2124', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '1.5rem', width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'white', margin: 0, fontFamily: "'Cormorant Garamond', serif" }}>Create Calendar Event</h3>
            
            <form onSubmit={handleSaveCustomEvent} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.72rem', color: '#D8C7AF', fontWeight: 600 }}>Event Title</label>
                <input 
                  type="text" 
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  placeholder="e.g. Destin Seafood Festival"
                  required
                  style={{ background: '#121416', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '0.6rem', color: '#F4F1EA', outline: 'none', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.72rem', color: '#D8C7AF', fontWeight: 600 }}>Event Description</label>
                <textarea 
                  value={newEventDesc}
                  onChange={(e) => setNewEventDesc(e.target.value)}
                  placeholder="Details about the event..."
                  rows={2}
                  style={{ background: '#121416', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '0.6rem', color: '#F4F1EA', outline: 'none', resize: 'vertical', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.72rem', color: '#D8C7AF', fontWeight: 600 }}>Start Date</label>
                  <input 
                    type="date" 
                    value={newEventStartDate}
                    onChange={(e) => setNewEventStartDate(e.target.value)}
                    required
                    style={{ background: '#121416', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '0.6rem', color: '#F4F1EA', outline: 'none', fontSize: '0.85rem' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.72rem', color: '#D8C7AF', fontWeight: 600 }}>End Date</label>
                  <input 
                    type="date" 
                    value={newEventEndDate}
                    onChange={(e) => setNewEventEndDate(e.target.value)}
                    required
                    style={{ background: '#121416', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '0.6rem', color: '#F4F1EA', outline: 'none', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.72rem', color: '#D8C7AF', fontWeight: 600 }}>Type</label>
                  <select 
                    value={newEventType}
                    onChange={(e) => setNewEventType(e.target.value as any)}
                    style={{ background: '#121416', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '0.6rem', color: '#F4F1EA', outline: 'none', fontSize: '0.85rem' }}
                  >
                    <option value="holiday">Holiday</option>
                    <option value="national">National Event</option>
                    <option value="regional">Regional Event</option>
                    <option value="custom">Custom Event</option>
                  </select>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.72rem', color: '#D8C7AF', fontWeight: 600 }}>Impact Weight</label>
                  <input 
                    type="number" 
                    min={0.1}
                    max={5.0}
                    step={0.1}
                    value={newEventImpactScore}
                    onChange={(e) => setNewEventImpactScore(Number(e.target.value) || 1.0)}
                    style={{ background: '#121416', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '0.6rem', color: '#F4F1EA', outline: 'none', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button 
                  type="button"
                  onClick={() => setIsAddEventModalOpen(false)}
                  style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#D8C7AF', padding: '0.5rem 1rem', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  style={{ background: '#B9783B', border: 'none', color: 'white', padding: '0.5rem 1.25rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  Save Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI Suggest Events Modal */}
      {isAISearchModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', padding: '1rem' }}>
          <div style={{ background: '#1E2124', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '1.5rem', width: '100%', maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'white', margin: 0, fontFamily: "'Cormorant Garamond', serif" }}>Search Event Suggestions (AI)</h3>
              <button 
                onClick={() => setIsAISearchModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#D8C7AF', fontSize: '1.2rem', cursor: 'pointer', opacity: 0.8 }}
              >
                &times;
              </button>
            </div>

            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', background: '#121416', padding: '1rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: 1.5 }}>
                <label style={{ fontSize: '0.72rem', color: '#D8C7AF', fontWeight: 600 }}>Location Context</label>
                <input 
                  type="text" 
                  value={aiSearchLocation}
                  onChange={(e) => setAiSearchLocation(e.target.value)}
                  placeholder="e.g. Destin, Florida"
                  style={{ background: '#1E2124', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '0.5rem', color: '#F4F1EA', outline: 'none', fontSize: '0.8rem' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: 0.8 }}>
                <label style={{ fontSize: '0.72rem', color: '#D8C7AF', fontWeight: 600 }}>Year</label>
                <input 
                  type="number" 
                  value={aiSearchYear}
                  onChange={(e) => setAiSearchYear(Number(e.target.value) || new Date().getFullYear())}
                  style={{ background: '#1E2124', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '0.5rem', color: '#F4F1EA', outline: 'none', fontSize: '0.8rem' }}
                />
              </div>

              <button 
                onClick={handleAISearchEvents}
                disabled={isSearchingAI}
                style={{ background: '#B9783B', border: 'none', color: 'white', padding: '0.5rem 1.25rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', height: '35px', opacity: isSearchingAI ? 0.7 : 1 }}
              >
                {isSearchingAI ? <RefreshCw className="animate-spin" size={14} /> : <Search size={14} />}
                {isSearchingAI ? 'Scanning...' : 'Scan Events'}
              </button>
            </div>

            {aiSuggestions.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', animation: 'fadeIn 0.2s ease' }}>
                <span style={{ fontSize: '0.8rem', color: '#D8C7AF', fontWeight: 600 }}>Select Suggestions to Import:</span>
                
                <div style={{ maxHeight: '250px', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '6px', background: '#121416' }}>
                  {aiSuggestions.map((item, idx) => {
                    const isChecked = aiSelectedSuggestions.includes(idx);
                    return (
                      <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.75rem 1rem', borderBottom: idx < aiSuggestions.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', background: isChecked ? 'rgba(185, 120, 59, 0.02)' : 'transparent' }}>
                        <input 
                          type="checkbox" 
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setAiSelectedSuggestions([...aiSelectedSuggestions, idx]);
                            } else {
                              setAiSelectedSuggestions(aiSelectedSuggestions.filter(i => i !== idx));
                            }
                          }}
                          style={{ accentColor: '#B9783B', cursor: 'pointer', marginTop: '0.2rem' }}
                        />
                        
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 600, color: 'white', fontSize: '0.85rem' }}>{item.title}</span>
                            <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', borderRadius: '4px', background: 'rgba(185,120,59,0.15)', color: '#B9783B', fontWeight: 700 }}>
                              {item.impactScore}x weight
                            </span>
                          </div>
                          <span style={{ fontSize: '0.75rem', color: '#D8C7AF', opacity: 0.6, display: 'block', marginTop: '0.15rem' }}>
                            {new Date(item.startDate + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            {item.startDate !== item.endDate && ` - ${new Date(item.endDate + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`}
                            {item.type && ` (${item.type})`}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: '#D8C7AF', opacity: 0.8, display: 'block', marginTop: '0.25rem', lineHeight: '1.4' }}>{item.description}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                  <button 
                    onClick={() => {
                      if (aiSelectedSuggestions.length === aiSuggestions.length) {
                        setAiSelectedSuggestions([]);
                      } else {
                        setAiSelectedSuggestions(aiSuggestions.map((_, i) => i));
                      }
                    }}
                    style={{ background: 'transparent', border: 'none', color: '#D8C7AF', fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    {aiSelectedSuggestions.length === aiSuggestions.length ? 'Deselect All' : 'Select All'}
                  </button>

                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button 
                      onClick={() => setIsAISearchModalOpen(false)}
                      style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#D8C7AF', padding: '0.5rem 1rem', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer' }}
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleImportAISuggestions}
                      style={{ background: '#B9783B', border: 'none', color: 'white', padding: '0.5rem 1.25rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                    >
                      Import Selected ({aiSelectedSuggestions.length})
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
