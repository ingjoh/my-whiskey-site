'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  collection, getDocs, doc, setDoc, getDoc, query, orderBy, limit 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  Anchor, ArrowLeft, MessageSquare, Calendar, Mail, Phone, Clock, Edit, Play, CheckCircle, 
  AlertCircle, Plus, Eye, ListFilter, Trash2, ArrowRight, Settings, Sparkles, RefreshCw
} from 'lucide-react';

const DEFAULT_TEMPLATES = [
  {
    id: 'booking_confirmed_email',
    name: 'Booking Confirmation Email',
    channel: 'email',
    subject: 'Your Voyage on M/Y Whiskey is Confirmed! (ID: {{bookingId}})',
    body: `Dear {{guestName}},

We are pleased to confirm your private bareboat charter reservation. Below are the details of your upcoming luxury experience.

* **Booking ID:** {{bookingId}}
* **Experience:** {{experienceTitle}}
* **Vessel:** {{vesselTitle}}
* **Date:** {{date}}
* **Time:** {{startTime}}

### Financial Summary
* **Grand Total:** {{grandTotal}}
* **Paid Today:** {{amountPaidToday}}
* **Remaining Balance:** {{amountDueLater}}

Federal regulations require all charter passengers to sign the bareboat release waiver prior to boarding. Please log into your guest portal to register passengers and sign waivers.`,
  },
  {
    id: 'waiver_reminder_sms',
    name: 'Waiver Request SMS',
    channel: 'sms',
    body: 'M/Y Whiskey Voyage Confirmed! ID: {{bookingId}}. Date: {{date}} at {{startTime}}. Complete your digital release waiver here: {{portalUrl}}',
  },
  {
    id: 'waiver_request_email',
    name: 'Waiver Reminder Email',
    channel: 'email',
    subject: 'Action Required: Sign Passenger Liability Waiver (ID: {{bookingId}})',
    body: `Dear {{guestName}},

In preparation for your upcoming voyage, **federal maritime regulations require all charter passengers to sign our liability waiver prior to boarding**.

Please click the button below to sign your digital passenger waiver. If you have guests joining you, you can also add their names and send them their unique signing links from your portal.

* **Voyage ID:** {{bookingId}}
* **Experience:** {{experienceTitle}}
* **Vessel:** {{vesselTitle}}
* **Charter Date:** {{date}}

*Note: Boarding will be delayed if passenger manifests are incomplete or missing signatures at the dock.*`,
  },
  {
    id: 'trip_reminder_email_7d',
    name: 'Pre-Voyage Checklist Email',
    channel: 'email',
    subject: '7-Day Pre-Voyage Checklist - Booking #{{bookingId}}',
    body: `Dear {{guestName}},

We look forward to welcoming you on board **M/Y Whiskey** in Destin! To ensure a seamless boarding experience, please review the vital departure information below.

* **Date:** {{date}}
* **Departure Time:** {{startTime}}
* **Boarding Port:** {{startLocationName}}
* **Hired Captain:** {{captainTitle}}

### Pre-Boarding Checklist:
* **Arrival Time:** Please arrive **15 minutes prior** to departure. Late arrivals will shorten your charter duration.
* **Digital Waivers:** Verify in your portal that all guest signatures are complete.
* **What to Bring:** Towels, sunscreen (non-spray preferred to protect boat upholstery), sunglasses, food/drinks, and dry clothing.
* **Prohibited Items:** Red wine (stains deck), black-soled shoes, spray sunscreen, drugs/marijuana (illegal under USCG regulations).`,
  },
  {
    id: 'trip_reminder_sms_7d',
    name: 'Pre-Voyage Reminder SMS',
    channel: 'sms',
    body: 'M/Y Whiskey: 7 days until your voyage! Please review your boarding checklist and waivers: {{portalUrl}}',
  },
  {
    id: 'trip_reminder_email_24h',
    name: 'Boarding Instructions Email',
    channel: 'email',
    subject: 'Important: 24-Hour Boarding Instructions - Booking #{{bookingId}}',
    body: `Dear {{guestName}},

Your voyage departs tomorrow! Please find your boarding instructions below.

* **Departure Time:** {{startTime}}
* **Boarding Location:** {{startLocationName}}
* **Hired Captain:** {{captainTitle}}

Please meet at the designated slip 15 minutes before your scheduled departure time. Your captain will greet you at the dock. Ensure all guest waivers are signed today.`,
  },
  {
    id: 'trip_reminder_sms_24h',
    name: 'Boarding Instructions SMS',
    channel: 'sms',
    body: 'M/Y Whiskey departure tomorrow at {{startTime}}! Meet at {{startLocationName}}. Check details and direction: {{portalUrl}}',
  },
  {
    id: 'waiver_signed_email',
    name: 'Waiver Signed Confirmation Email',
    channel: 'email',
    subject: 'Waiver Signature Confirmed - Booking #{{bookingId}}',
    body: `Dear {{guestName}},

This email confirms that the digital passenger release waiver for your charter booking **#{{bookingId}}** has been successfully signed and logged.

Your voyage is scheduled for **{{date}}** at **{{startTime}}**. 

You can view your trip checklist and chat with the crew anytime in your portal.`,
  }
];

const DEFAULT_FLOWS = [
  {
    id: 'standard_bareboat_flow',
    trigger: 'booking_created',
    steps: [
      {
        id: 'step_1_confirmation_email',
        templateId: 'booking_confirmed_email',
        offsetType: 'instant',
        offsetValue: 0,
        offsetUnit: 'minutes'
      },
      {
        id: 'step_2_initial_waiver_sms',
        templateId: 'waiver_reminder_sms',
        offsetType: 'instant',
        offsetValue: 0,
        offsetUnit: 'minutes'
      },
      {
        id: 'step_3_waiver_nudge_email',
        templateId: 'waiver_request_email',
        offsetType: 'delay_after_trigger',
        offsetValue: 3,
        offsetUnit: 'days',
        condition: 'waiverSigned == false'
      },
      {
        id: 'step_4_7d_checklist_email',
        templateId: 'trip_reminder_email_7d',
        offsetType: 'before_trip',
        offsetValue: 7,
        offsetUnit: 'days'
      },
      {
        id: 'step_5_7d_checklist_sms',
        templateId: 'trip_reminder_sms_7d',
        offsetType: 'before_trip',
        offsetValue: 7,
        offsetUnit: 'days'
      },
      {
        id: 'step_6_24h_boarding_email',
        templateId: 'trip_reminder_email_24h',
        offsetType: 'before_trip',
        offsetValue: 1,
        offsetUnit: 'days'
      },
      {
        id: 'step_7_24h_boarding_sms',
        templateId: 'trip_reminder_sms_24h',
        offsetType: 'before_trip',
        offsetValue: 1,
        offsetUnit: 'days'
      }
    ]
  }
];

const getStepMinutes = (value: number, unit: string) => {
  if (unit === 'minutes') return value;
  if (unit === 'hours') return value * 60;
  if (unit === 'days') return value * 24 * 60;
  return value;
};

const sortFlowSteps = (steps: any[]) => {
  return [...steps].sort((a, b) => {
    // 1. Instant steps always come first
    if (a.offsetType === 'instant' && b.offsetType !== 'instant') return -1;
    if (a.offsetType !== 'instant' && b.offsetType === 'instant') return 1;
    if (a.offsetType === 'instant' && b.offsetType === 'instant') return 0;

    // 2. Delayed after trigger steps come next
    if (a.offsetType === 'delay_after_trigger' && b.offsetType === 'before_trip') return -1;
    if (a.offsetType === 'before_trip' && b.offsetType === 'delay_after_trigger') return 1;

    if (a.offsetType === 'delay_after_trigger' && b.offsetType === 'delay_after_trigger') {
      return getStepMinutes(a.offsetValue, a.offsetUnit) - getStepMinutes(b.offsetValue, b.offsetUnit);
    }

    // 3. Before trip steps come last, sorted from furthest to closest (descending offset value)
    // e.g. 7 days before comes BEFORE 1 day before.
    if (a.offsetType === 'before_trip' && b.offsetType === 'before_trip') {
      return getStepMinutes(b.offsetValue, b.offsetUnit) - getStepMinutes(a.offsetValue, a.offsetUnit);
    }

    return 0;
  });
};

function formatStepName(templateName: string, step: any): string {
  if (step.offsetType === 'instant') {
    let cleanedName = templateName.replace(/^\d+-(Day|Hour|Minute)s?\s+/gi, '');
    cleanedName = cleanedName.replace(/^Initial\s+/gi, '');
    return `Instant ${cleanedName}`;
  }
  
  const val = step.offsetValue;
  const unit = step.offsetUnit;
  
  let unitLabel = '';
  if (unit === 'days') unitLabel = val === 1 ? 'Day' : 'Day';
  else if (unit === 'hours') unitLabel = val === 1 ? 'Hour' : 'Hour';
  else if (unit === 'minutes') unitLabel = val === 1 ? 'Minute' : 'Minute';
  
  const timingPrefix = `${val}-${unitLabel}`;
  
  let cleanedName = templateName.replace(/^\d+-(Day|Hour|Minute)s?\s+/gi, '');
  cleanedName = cleanedName.replace(/^Initial\s+/gi, '');
  
  return `${timingPrefix} ${cleanedName}`;
}

export default function MessagingDashboard() {
  const [activeTab, setActiveTab] = useState<'flows' | 'templates' | 'queue'>('flows');

  // Firebase Datasets
  const [flows, setFlows] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [queue, setQueue] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(true);

  // Seeding State
  const [isSeeding, setIsSeeding] = useState(false);

  // Flow Editor State
  const [selectedFlow, setSelectedFlow] = useState<any>(null);
  const [editingStep, setEditingStep] = useState<any>(null);

  // Step Creation Form State
  const [showAddStepForm, setShowAddStepForm] = useState(false);
  const [newStepTemplateId, setNewStepTemplateId] = useState('');
  const [newStepOffsetType, setNewStepOffsetType] = useState<'instant' | 'delay_after_trigger' | 'before_trip'>('delay_after_trigger');
  const [newStepOffsetValue, setNewStepOffsetValue] = useState(1);
  const [newStepOffsetUnit, setNewStepOffsetUnit] = useState('days');
  const [newStepCondition, setNewStepCondition] = useState('');

  // Template Editor State
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [editedSubject, setEditedSubject] = useState('');
  const [editedBody, setEditedBody] = useState('');
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);

  // Queue State
  const [isRunningCron, setIsRunningCron] = useState(false);
  const [cronResult, setCronResult] = useState<string | null>(null);

  // Seed Default Database Collections helper
  const handleSeedDatabase = async () => {
    setIsSeeding(true);
    try {
      // 1. Seed templates
      for (const t of DEFAULT_TEMPLATES) {
        await setDoc(doc(db, 'notification_templates', t.id), {
          ...t,
          updatedAt: new Date().toISOString()
        });
      }
      // 2. Seed flows
      for (const f of DEFAULT_FLOWS) {
        await setDoc(doc(db, 'notification_flows', f.id), {
          ...f,
          updatedAt: new Date().toISOString()
        });
      }
      alert('Database seeded successfully!');
      await loadDashboardData();
    } catch (err: any) {
      console.error(err);
      alert(`Seeding failed: ${err.message || String(err)}`);
    } finally {
      setIsSeeding(false);
    }
  };

  // Delete Flow Step helper
  const handleDeleteFlowStep = async (stepId: string) => {
    if (!selectedFlow || !confirm('Are you sure you want to delete this step from the journey?')) return;
    try {
      const fRef = doc(db, 'notification_flows', selectedFlow.id);
      const updatedSteps = selectedFlow.steps.filter((s: any) => s.id !== stepId);
      const updatedFlow = {
        ...selectedFlow,
        steps: updatedSteps,
        updatedAt: new Date().toISOString()
      };
      await setDoc(fRef, updatedFlow);
      setFlows(flows.map(f => f.id === selectedFlow.id ? updatedFlow : f));
      setSelectedFlow(updatedFlow);
      alert('Step removed from flow.');
    } catch (err) {
      console.error(err);
      alert('Failed to delete step.');
    }
  };

  // Add Flow Step helper
  const handleAddFlowStep = async () => {
    if (!selectedFlow || !newStepTemplateId) return;
    try {
      const fRef = doc(db, 'notification_flows', selectedFlow.id);
      const newStepId = `step_${Date.now()}`;
      const newStep = {
        id: newStepId,
        templateId: newStepTemplateId,
        offsetType: newStepOffsetType,
        offsetValue: newStepOffsetType === 'instant' ? 0 : Number(newStepOffsetValue),
        offsetUnit: newStepOffsetUnit,
        condition: newStepCondition || null
      };

      const updatedSteps = [...selectedFlow.steps, newStep];
      const updatedFlow = {
        ...selectedFlow,
        steps: updatedSteps,
        updatedAt: new Date().toISOString()
      };

      await setDoc(fRef, updatedFlow);
      setFlows(flows.map(f => f.id === selectedFlow.id ? updatedFlow : f));
      setSelectedFlow(updatedFlow);
      
      // Reset form
      setShowAddStepForm(false);
      setNewStepTemplateId('');
      setNewStepOffsetType('delay_after_trigger');
      setNewStepOffsetValue(1);
      setNewStepOffsetUnit('days');
      setNewStepCondition('');
      alert('New journey step added successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to add step.');
    }
  };

  // Load dashboard data
  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Load Templates
      const templatesSnap = await getDocs(collection(db, 'notification_templates'));
      const tList: any[] = templatesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTemplates(tList);
      if (tList.length > 0) {
        setSelectedTemplate(tList[0]);
        setEditedSubject(tList[0].subject || '');
        setEditedBody(tList[0].body || '');
      }

      // 2. Load Flows
      const flowsSnap = await getDocs(collection(db, 'notification_flows'));
      const fList = flowsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setFlows(fList);
      if (fList.length > 0) {
        setSelectedFlow(fList[0]);
      }

      // 3. Load Queue Log
      const queueQuery = query(collection(db, 'scheduled_notifications'), orderBy('scheduledTime', 'desc'), limit(100));
      const queueSnap = await getDocs(queueQuery);
      setQueue(queueSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      // 4. Load Settings for branding preview
      const settingsSnap = await getDoc(doc(db, 'settings', 'global'));
      if (settingsSnap.exists()) {
        setSettings(settingsSnap.data());
      }
    } catch (err) {
      console.error('Failed to load messaging dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Update Template
  const handleSaveTemplate = async () => {
    if (!selectedTemplate || isSavingTemplate) return;
    setIsSavingTemplate(true);
    try {
      const tRef = doc(db, 'notification_templates', selectedTemplate.id);
      const updated = {
        ...selectedTemplate,
        subject: editedSubject,
        body: editedBody,
        updatedAt: new Date().toISOString()
      };
      await setDoc(tRef, updated);
      
      // Update local state
      setTemplates(templates.map(t => t.id === selectedTemplate.id ? updated : t));
      setSelectedTemplate(updated);
      alert('Template saved successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to save template.');
    } finally {
      setIsSavingTemplate(false);
    }
  };

  // Update Flow Step Offset
  const handleSaveFlowStep = async (stepId: string, value: number, unit: string) => {
    if (!selectedFlow) return;
    try {
      const fRef = doc(db, 'notification_flows', selectedFlow.id);
      const updatedSteps = selectedFlow.steps.map((s: any) => {
        if (s.id === stepId) {
          return { ...s, offsetValue: Number(value), offsetUnit: unit };
        }
        return s;
      });

      const updatedFlow = {
        ...selectedFlow,
        steps: updatedSteps,
        updatedAt: new Date().toISOString()
      };

      await setDoc(fRef, updatedFlow);
      setFlows(flows.map(f => f.id === selectedFlow.id ? updatedFlow : f));
      setSelectedFlow(updatedFlow);
      setEditingStep(null);
      alert('Flow timing updated successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to update flow.');
    }
  };

  // Run Cron Handler
  const handleRunCron = async () => {
    setIsRunningCron(true);
    setCronResult(null);
    try {
      const res = await fetch('/api/cron/trip-reminders');
      const data = await res.json();
      if (res.ok) {
        setCronResult(`Success! Processed ${data.processed || 0} messages.`);
        // Reload queue
        const queueQuery = query(collection(db, 'scheduled_notifications'), orderBy('scheduledTime', 'desc'), limit(100));
        const queueSnap = await getDocs(queueQuery);
        setQueue(queueSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } else {
        setCronResult(`Failed: ${data.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      setCronResult(`Exception: ${err.message || 'Request failed'}`);
    } finally {
      setIsRunningCron(false);
    }
  };

  const getBrandingTheme = () => {
    const theme = settings.theme || {};
    return {
      primaryColor: theme.primaryColor || '#B9783B',
      backgroundColor: theme.backgroundColor || '#121416',
      surfaceColor: theme.surfaceColor || '#1E2124',
      foregroundColor: theme.foregroundColor || '#F4F1EA',
      mutedColor: theme.mutedColor || '#D8C7AF'
    };
  };

  const renderLiveEmailPreview = () => {
    if (!selectedTemplate) return null;
    const theme = getBrandingTheme();
    
    // Quick preview compilation (mock data)
    let bodyHtml = editedBody
      .replace(/\n\n/g, '</p><p style="margin: 0 0 15px 0; line-height: 1.6; font-size: 14px;">')
      .replace(/\n/g, '<br />')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/#+ ([^\n]+)/g, '<strong>$1</strong>')
      .replace(/\{\{\s*guestName\s*\}\}/g, 'John Smith')
      .replace(/\{\{\s*bookingId\s*\}\}/g, 'BK-889312')
      .replace(/\{\{\s*experienceTitle\s*\}\}/g, 'Sunset Harbor Voyage')
      .replace(/\{\{\s*vesselTitle\s*\}\}/g, 'M/Y Whiskey (70ft)')
      .replace(/\{\{\s*date\s*\}\}/g, 'June 15, 2026')
      .replace(/\{\{\s*startTime\s*\}\}/g, '6:00 PM')
      .replace(/\{\{\s*grandTotal\s*\}\}/g, '$4,500')
      .replace(/\{\{\s*amountPaidToday\s*\}\}/g, '$900')
      .replace(/\{\{\s*amountDueLater\s*\}\}/g, '$3,600')
      .replace(/\{\{\s*portalUrl\s*\}\}/g, '#');

    return (
      <div style={{ background: theme.backgroundColor, color: theme.foregroundColor, padding: '1.5rem', borderRadius: '8px', minHeight: '350px', border: '1px solid rgba(255,255,255,0.05)', fontSize: '0.85rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontFamily: 'Georgia, serif', color: 'white', letterSpacing: '0.1em', margin: '0 0 4px 0' }}>M/Y WHISKEY</h2>
          <span style={{ fontSize: '8px', letterSpacing: '0.2em', color: theme.primaryColor, fontWeight: 'bold' }}>PRIVATE BAREBOAT CHARTERS</span>
        </div>
        <div style={{ background: theme.surfaceColor, border: '1px solid rgba(255,255,255,0.06)', padding: '1.5rem', borderRadius: '8px' }}>
          <div dangerouslySetInnerHTML={{ __html: `<p style="margin: 0 0 15px 0; line-height: 1.6;">${bodyHtml}</p>` }} />
        </div>
        <div style={{ textAlign: 'center', fontSize: '9px', color: theme.mutedColor, opacity: 0.5, marginTop: '1.5rem' }}>
          M/Y Whiskey • Destin Harbor, Destin, FL
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{ background: '#121416', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid rgba(185, 120, 59, 0.2)', borderTopColor: '#B9783B', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <p style={{ color: '#D8C7AF', marginTop: '1rem', fontSize: '0.85rem' }}>Loading Messaging Dashboard...</p>
        <style dangerouslySetInnerHTML={{__html: `@keyframes spin { to { transform: rotate(360deg); } }`}} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#121416', color: '#F4F1EA', fontFamily: "'Inter', sans-serif" }}>
      {/* Top Navbar */}
      <nav style={{ background: '#1E2124', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 600, fontSize: '1.25rem', color: '#B9783B' }}>
          <Anchor size={24} /> Voyage Flow Command Center
        </div>
        <Link 
          href="/admin" 
          style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#D8C7AF', fontSize: '0.85rem' }}
        >
          <ArrowLeft size={16} /> Back to Main Admin
        </Link>
      </nav>

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '2.5rem 2rem' }}>
        
        {/* Dashboard Title */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '2.25rem', fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, margin: '0 0 0.5rem 0', letterSpacing: '0.02em', color: 'white' }}>
              Voyage Flow Manager
            </h1>
            <p style={{ color: '#D8C7AF', opacity: 0.8, margin: 0, fontSize: '0.88rem' }}>
              Configure scheduled transactional alert journeys, edit templates with live branding, and audit the queue.
            </p>
          </div>
          
          <button 
            onClick={loadDashboardData}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', padding: '0.5rem 0.85rem', borderRadius: '6px', fontSize: '0.78rem', cursor: 'pointer', color: 'white' }}
          >
            <RefreshCw size={12} /> Reload
          </button>
        </div>

        {templates.length === 0 && (
          <div style={{
            background: 'rgba(185, 120, 59, 0.08)',
            border: '1px solid rgba(185, 120, 59, 0.25)',
            borderRadius: '8px',
            padding: '1.25rem 1.5rem',
            marginBottom: '2rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem',
            animation: 'fadeIn 0.2s ease-out'
          }}>
            <div>
              <h4 style={{ margin: '0 0 0.25rem 0', color: 'white', fontWeight: 600, fontSize: '0.95rem' }}>Database Collections Empty</h4>
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#D8C7AF', opacity: 0.8, lineHeight: '1.4' }}>
                No notification templates or flows were found in the active database. Seed the database with the default bareboat charter journey flows and templates to get started.
              </p>
            </div>
            <button
              onClick={handleSeedDatabase}
              disabled={isSeeding}
              style={{
                background: '#B9783B',
                color: 'white',
                border: 'none',
                padding: '0.6rem 1.25rem',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 'bold',
                cursor: isSeeding ? 'not-allowed' : 'pointer',
                flexShrink: 0,
                transition: 'background 0.2s'
              }}
              onMouseOver={e => { if(!isSeeding) e.currentTarget.style.background = '#a2642e'; }}
              onMouseOut={e => { if(!isSeeding) e.currentTarget.style.background = '#B9783B'; }}
            >
              {isSeeding ? 'Seeding...' : 'Seed Default Flows & Templates'}
            </button>
          </div>
        )}

        {/* Tab selection */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
          <button 
            onClick={() => setActiveTab('flows')}
            style={{ padding: '0.5rem 1rem', background: 'none', border: 'none', borderBottom: activeTab === 'flows' ? '2px solid #B9783B' : 'none', color: activeTab === 'flows' ? 'white' : '#D8C7AF', fontWeight: activeTab === 'flows' ? 'bold' : 'normal', cursor: 'pointer', fontSize: '0.85rem' }}
          >
            Journey Flows (Timeline)
          </button>
          <button 
            onClick={() => setActiveTab('templates')}
            style={{ padding: '0.5rem 1rem', background: 'none', border: 'none', borderBottom: activeTab === 'templates' ? '2px solid #B9783B' : 'none', color: activeTab === 'templates' ? 'white' : '#D8C7AF', fontWeight: activeTab === 'templates' ? 'bold' : 'normal', cursor: 'pointer', fontSize: '0.85rem' }}
          >
            Template Editor & Live Preview
          </button>
          <button 
            onClick={() => setActiveTab('queue')}
            style={{ padding: '0.5rem 1rem', background: 'none', border: 'none', borderBottom: activeTab === 'queue' ? '2px solid #B9783B' : 'none', color: activeTab === 'queue' ? 'white' : '#D8C7AF', fontWeight: activeTab === 'queue' ? 'bold' : 'normal', cursor: 'pointer', fontSize: '0.85rem' }}
          >
            Outbox Queue Log
          </button>
        </div>

        {/* TAB 1: FLOWS TIMELINE */}
        {activeTab === 'flows' && selectedFlow && (
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2.5rem', alignItems: 'start' }}>
            
            {/* Timeline Flow */}
            <div style={{ background: '#1E2124', border: '1px solid rgba(255,255,255,0.06)', padding: '2rem', borderRadius: '12px' }}>
              <h3 style={{ fontSize: '1.25rem', fontFamily: 'Georgia, serif', margin: '0 0 1.5rem 0', color: 'white' }}>
                Standard Bareboat Journey Flow
              </h3>
              
              <div style={{ position: 'relative', paddingLeft: '2.5rem', borderLeft: '2px dashed rgba(185, 120, 59, 0.25)', marginLeft: '1rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                {sortFlowSteps(selectedFlow.steps).map((step: any, idx: number) => {
                  const tInfo = templates.find(t => t.id === step.templateId) || {};
                  const isEmail = tInfo.channel === 'email';
                  
                  return (
                    <div key={step.id} style={{ position: 'relative' }}>
                      {/* Timeline Dot icon */}
                      <div style={{ position: 'absolute', left: '-3.25rem', top: '2px', width: '28px', height: '28px', borderRadius: '50%', background: '#1E2124', border: '2px solid #B9783B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {isEmail ? <Mail size={12} color="#B9783B" /> : <Phone size={12} color="#B9783B" />}
                      </div>

                      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', padding: '1rem 1.25rem', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                            <span style={{ fontSize: '0.72rem', color: '#B9783B', fontWeight: 'bold', textTransform: 'uppercase' }}>
                              Step {idx + 1}: {isEmail ? 'Email' : 'SMS'}
                            </span>
                            {step.condition && (
                              <span style={{ background: 'rgba(226, 161, 94, 0.1)', color: '#E2A15E', fontSize: '0.65rem', padding: '1px 6px', borderRadius: '4px', border: '1px solid rgba(226, 161, 94, 0.15)' }}>
                                Condition: {step.condition}
                              </span>
                            )}
                          </div>
                          <h4 style={{ fontSize: '0.92rem', color: 'white', fontWeight: 600, margin: '0 0 0.15rem 0' }}>
                            {formatStepName(tInfo.name || step.templateId, step)}
                          </h4>
                          <span style={{ fontSize: '0.75rem', color: '#D8C7AF', opacity: 0.6 }}>
                            Trigger: {step.offsetType === 'instant' ? 'Instant Dispatch' : `${step.offsetValue} ${step.offsetUnit} ${step.offsetType === 'before_trip' ? 'before departure' : 'after booking'}`}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {editingStep?.id === step.id ? (
                            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                              <input 
                                type="number"
                                defaultValue={step.offsetValue}
                                id={`offset-val-${step.id}`}
                                style={{ width: '50px', background: '#121416', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '0.3rem', borderRadius: '4px', fontSize: '0.75rem' }}
                              />
                              <select 
                                defaultValue={step.offsetUnit}
                                id={`offset-unit-${step.id}`}
                                style={{ background: '#121416', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '0.3rem', borderRadius: '4px', fontSize: '0.75rem' }}
                              >
                                <option value="minutes">minutes</option>
                                <option value="hours">hours</option>
                                <option value="days">days</option>
                              </select>
                              <button 
                                onClick={() => {
                                  const val = (document.getElementById(`offset-val-${step.id}`) as HTMLInputElement).value;
                                  const unit = (document.getElementById(`offset-unit-${step.id}`) as HTMLSelectElement).value;
                                  handleSaveFlowStep(step.id, Number(val), unit);
                                }}
                                style={{ background: '#B9783B', border: 'none', color: 'white', padding: '0.3rem 0.65rem', borderRadius: '4px', fontSize: '0.72rem', cursor: 'pointer' }}
                              >
                                Save
                              </button>
                            </div>
                          ) : (
                            <>
                              {step.offsetType !== 'instant' && (
                                <button 
                                  onClick={() => setEditingStep(step)}
                                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: '#D8C7AF', padding: '0.3rem 0.65rem', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer' }}
                                >
                                  Edit Delay
                                </button>
                              )}
                              <button 
                                onClick={() => handleDeleteFlowStep(step.id)}
                                style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.15)', color: '#EF4444', padding: '0.35rem', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                onMouseOver={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'}
                                onMouseOut={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.05)'}
                                title="Remove Step"
                              >
                                <Trash2 size={12} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add Journey Step Button / Form */}
              {!showAddStepForm ? (
                <button
                  onClick={() => setShowAddStepForm(true)}
                  style={{
                    marginTop: '2rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                    background: 'rgba(185, 120, 59, 0.04)',
                    border: '1px dashed #B9783B',
                    color: '#B9783B',
                    padding: '0.65rem',
                    width: '100%',
                    borderRadius: '8px',
                    fontSize: '0.82rem',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={e => e.currentTarget.style.background = 'rgba(185, 120, 59, 0.1)'}
                  onMouseOut={e => e.currentTarget.style.background = 'rgba(185, 120, 59, 0.04)'}
                >
                  <Plus size={14} /> Add Journey Step
                </button>
              ) : (
                <div style={{
                  marginTop: '2rem',
                  background: 'rgba(255,255,255,0.01)',
                  border: '1px solid rgba(255,255,255,0.05)',
                  padding: '1.25rem',
                  borderRadius: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem'
                }}>
                  <h4 style={{ margin: 0, fontSize: '0.88rem', color: 'white', fontWeight: 600 }}>Add Journey Step</h4>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <label style={{ fontSize: '0.7rem', color: '#D8C7AF', opacity: 0.7 }}>Select Template</label>
                      <select
                        value={newStepTemplateId}
                        onChange={e => setNewStepTemplateId(e.target.value)}
                        style={{ padding: '0.4rem', background: '#121416', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '4px', fontSize: '0.78rem' }}
                      >
                        <option value="">-- Choose Template --</option>
                        {templates.map(t => (
                          <option key={t.id} value={t.id}>{t.name} ({t.channel.toUpperCase()})</option>
                        ))}
                      </select>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <label style={{ fontSize: '0.7rem', color: '#D8C7AF', opacity: 0.7 }}>Trigger Type</label>
                      <select
                        value={newStepOffsetType}
                        onChange={e => setNewStepOffsetType(e.target.value as any)}
                        style={{ padding: '0.4rem', background: '#121416', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '4px', fontSize: '0.78rem' }}
                      >
                        <option value="instant">Instant Dispatch</option>
                        <option value="delay_after_trigger">Delay After Booking</option>
                        <option value="before_trip">Before Departure</option>
                      </select>
                    </div>
                  </div>

                  {newStepOffsetType !== 'instant' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <label style={{ fontSize: '0.7rem', color: '#D8C7AF', opacity: 0.7 }}>Delay Value</label>
                        <input
                          type="number"
                          value={newStepOffsetValue}
                          onChange={e => setNewStepOffsetValue(Number(e.target.value))}
                          style={{ padding: '0.4rem', background: '#121416', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '4px', fontSize: '0.78rem' }}
                          min={1}
                        />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <label style={{ fontSize: '0.7rem', color: '#D8C7AF', opacity: 0.7 }}>Unit</label>
                        <select
                          value={newStepOffsetUnit}
                          onChange={e => setNewStepOffsetUnit(e.target.value)}
                          style={{ padding: '0.4rem', background: '#121416', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '4px', fontSize: '0.78rem' }}
                        >
                          <option value="minutes">minutes</option>
                          <option value="hours">hours</option>
                          <option value="days">days</option>
                        </select>
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label style={{ fontSize: '0.7rem', color: '#D8C7AF', opacity: 0.7 }}>Condition (Optional)</label>
                    <select
                      value={newStepCondition}
                      onChange={e => setNewStepCondition(e.target.value)}
                      style={{ padding: '0.4rem', background: '#121416', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '4px', fontSize: '0.78rem' }}
                    >
                      <option value="">No conditions (always send)</option>
                      <option value="waiverSigned == false">Only if Waiver is Unsigned (waiverSigned == false)</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                    <button
                      onClick={() => setShowAddStepForm(false)}
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: '#D8C7AF', padding: '0.4rem 1rem', borderRadius: '6px', fontSize: '0.78rem', cursor: 'pointer' }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddFlowStep}
                      disabled={!newStepTemplateId}
                      style={{ background: '#B9783B', border: 'none', color: 'white', padding: '0.4rem 1rem', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 'bold', cursor: !newStepTemplateId ? 'not-allowed' : 'pointer' }}
                    >
                      Save Step
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Extended roadmap actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ background: '#1E2124', border: '1px solid rgba(255,255,255,0.06)', padding: '1.75rem', borderRadius: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#B9783B', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '0.75rem' }}>
                  <Sparkles size={14} /> Stage 2 Channels Roadmap
                </div>
                <h4 style={{ fontSize: '1rem', color: 'white', fontWeight: 600, margin: '0 0 0.5rem 0' }}>Expand Multi-Channel Flows</h4>
                <p style={{ fontSize: '0.78rem', color: '#D8C7AF', opacity: 0.7, lineHeight: 1.5, margin: '0 0 1.25rem 0' }}>
                  Future-proof messaging allows adding voice, speech assistants, or WhatsApp triggers directly into the timeline.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <button disabled style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.3)', padding: '0.65rem', borderRadius: '6px', fontSize: '0.78rem', cursor: 'not-allowed' }}>
                    <Plus size={14} /> Add WhatsApp Action (Coming Soon)
                  </button>
                  <button disabled style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.3)', padding: '0.65rem', borderRadius: '6px', fontSize: '0.78rem', cursor: 'not-allowed' }}>
                    <Plus size={14} /> Add Voice Call Action (Coming Soon)
                  </button>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* TAB 2: TEMPLATE EDITOR */}
        {activeTab === 'templates' && selectedTemplate && (
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.5fr', gap: '2.5rem', alignItems: 'start' }}>
            
            {/* Template selector & Editor */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* Selector */}
              <div style={{ background: '#1E2124', border: '1px solid rgba(255,255,255,0.06)', padding: '1.25rem', borderRadius: '10px' }}>
                <label style={{ fontSize: '0.72rem', color: '#D8C7AF', fontWeight: 'bold', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>Select Message Template</label>
                <select 
                  value={selectedTemplate.id}
                  onChange={e => {
                    const found = templates.find(t => t.id === e.target.value);
                    if (found) {
                      setSelectedTemplate(found);
                      setEditedSubject(found.subject || '');
                      setEditedBody(found.body || '');
                    }
                  }}
                  style={{ width: '100%', padding: '0.5rem', background: '#121416', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '6px', outline: 'none', fontSize: '0.82rem' }}
                >
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.channel.toUpperCase()})</option>
                  ))}
                </select>
              </div>

              {/* Input Panel */}
              <div style={{ background: '#1E2124', border: '1px solid rgba(255,255,255,0.06)', padding: '2rem', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontFamily: 'Georgia, serif', margin: 0, color: 'white' }}>
                  Edit Template
                </h3>

                {selectedTemplate.channel === 'email' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <label style={{ fontSize: '0.72rem', color: '#D8C7AF', fontWeight: 'bold' }}>Subject Line</label>
                    <input 
                      type="text"
                      value={editedSubject}
                      onChange={e => setEditedSubject(e.target.value)}
                      style={{ width: '100%', padding: '0.55rem', background: '#121416', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '6px', fontSize: '0.82rem', outline: 'none' }}
                    />
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ fontSize: '0.72rem', color: '#D8C7AF', fontWeight: 'bold' }}>Message Body (Markdown/Text)</label>
                    <span style={{ fontSize: '9px', color: '#B9783B' }}>Variables: &#123;&#123;guestName&#125;&#125;, &#123;&#123;bookingId&#125;&#125;, &#123;&#123;portalUrl&#125;&#125;</span>
                  </div>
                  <textarea 
                    value={editedBody}
                    onChange={e => setEditedBody(e.target.value)}
                    rows={10}
                    style={{ width: '100%', padding: '0.75rem', background: '#121416', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '6px', fontSize: '0.8rem', lineHeight: '1.45', fontFamily: 'monospace', outline: 'none', resize: 'vertical' }}
                  />
                </div>

                <button 
                  onClick={handleSaveTemplate}
                  disabled={isSavingTemplate}
                  style={{ background: '#B9783B', border: 'none', color: 'white', padding: '0.65rem 1.25rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                >
                  {isSavingTemplate ? 'Saving...' : 'Save Template Changes'}
                </button>
              </div>

            </div>

            {/* Live Preview Panel */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#B9783B', fontSize: '0.72rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                <Eye size={14} /> Dynamic Branded Preview ({selectedTemplate.channel.toUpperCase()})
              </div>
              
              {selectedTemplate.channel === 'email' ? (
                renderLiveEmailPreview()
              ) : (
                /* SMS Mobile Phone UI Preview mockup */
                <div style={{ width: '320px', margin: '0 auto', background: '#000000', borderRadius: '32px', padding: '24px 12px', border: '4px solid #333333', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
                  <div style={{ background: '#1C1C1E', borderRadius: '20px', padding: '1.25rem', minHeight: '380px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div style={{ textAlign: 'center', borderBottom: '1px solid #2C2C2E', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
                      <span style={{ fontSize: '11px', color: '#8E8E93', display: 'block' }}>M/Y Whiskey</span>
                      <span style={{ fontSize: '8px', color: '#8E8E93' }}>Text Message</span>
                    </div>
                    
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
                      <div style={{ background: '#3A3A3C', borderRadius: '18px', borderBottomLeftRadius: '2px', padding: '0.65rem 0.85rem', color: 'white', fontSize: '0.78rem', lineHeight: '1.35', maxWidth: '85%' }}>
                        {editedBody
                          .replace(/\{\{\s*guestName\s*\}\}/g, 'John')
                          .replace(/\{\{\s*bookingId\s*\}\}/g, 'BK-889312')
                          .replace(/\{\{\s*date\s*\}\}/g, 'June 15')
                          .replace(/\{\{\s*startTime\s*\}\}/g, '6:00 PM')
                          .replace(/\{\{\s*portalUrl\s*\}\}/g, 'motoryachtwhiskey.com/guest/portal?id=BK-889312')
                        }
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>
        )}

        {/* TAB 3: OUTBOX LOG */}
        {activeTab === 'queue' && (
          <div style={{ background: '#1E2124', border: '1px solid rgba(255,255,255,0.06)', padding: '2rem', borderRadius: '12px' }}>
            
            {/* Cron trigger card */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', padding: '1.25rem 1.5rem', borderRadius: '8px', marginBottom: '2rem' }}>
              <div>
                <h4 style={{ fontSize: '0.95rem', color: 'white', fontWeight: 600, margin: '0 0 0.25rem 0' }}>Scheduled Queue Processor</h4>
                <p style={{ fontSize: '0.75rem', color: '#D8C7AF', opacity: 0.6, margin: 0 }}>
                  Process any pending queue notifications whose scheduled time has passed. In production, this runs automatically.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                <button 
                  onClick={handleRunCron}
                  disabled={isRunningCron}
                  style={{ background: '#B9783B', border: 'none', color: 'white', padding: '0.5rem 1.25rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <Play size={12} /> {isRunningCron ? 'Processing...' : 'Run Processor Now'}
                </button>
                {cronResult && (
                  <span style={{ fontSize: '0.72rem', color: cronResult.startsWith('Success') ? '#708C84' : '#EF4444', fontWeight: 'bold' }}>{cronResult}</span>
                )}
              </div>
            </div>

            {/* Outbox log Table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#D8C7AF', opacity: 0.7 }}>
                    <th style={{ padding: '0.75rem 1rem' }}>Queue ID</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Booking ID</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Template</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Channel</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Scheduled Time</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {queue.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '2rem 1rem', textAlign: 'center', color: '#D8C7AF', opacity: 0.5 }}>
                        No records found in scheduled queue.
                      </td>
                    </tr>
                  ) : (
                    queue.map(item => {
                      const tInfo = templates.find(t => t.id === item.templateId) || {};
                      
                      return (
                        <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', color: '#F4F1EA' }}>
                          <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontSize: '0.75rem' }}>{item.id}</td>
                          <td style={{ padding: '0.75rem 1rem' }}>{item.bookingId}</td>
                          <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{tInfo.name || item.templateId}</td>
                          <td style={{ padding: '0.75rem 1rem' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem' }}>
                              {item.channel === 'email' ? <Mail size={12} color="#B9783B" /> : <Phone size={12} color="#B9783B" />}
                              {item.channel.toUpperCase()}
                            </span>
                          </td>
                          <td style={{ padding: '0.75rem 1rem' }}>
                            {new Date(item.scheduledTime).toLocaleString()}
                          </td>
                          <td style={{ padding: '0.75rem 1rem' }}>
                            <span style={{ 
                              padding: '2px 8px', 
                              borderRadius: '4px', 
                              fontSize: '0.72rem', 
                              fontWeight: 'bold',
                              textTransform: 'uppercase',
                              background: item.status === 'sent' ? 'rgba(112, 140, 132, 0.1)' : item.status === 'pending' ? 'rgba(185, 120, 59, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                              color: item.status === 'sent' ? '#708C84' : item.status === 'pending' ? '#B9783B' : '#EF4444'
                            }}>
                              {item.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

          </div>
        )}

      </main>
    </div>
  );
}
