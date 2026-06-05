'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  getBookingById, sendBookingMessage, saveWaiverSignature, loadPageData,
  BookingRecord, BookingMessage, checkSignatureMatch
} from '@/lib/db';
import { DEFAULT_THEME } from '@/lib/pageTemplates';
import PublicNavigation from '@/components/public/PublicNavigation';
import PublicFooter from '@/components/public/PublicFooter';
import { 
  Anchor, ShieldAlert, MessageSquare, Calendar, DollarSign, User, Ship, Clock, 
  ArrowRight, Lock, CheckCircle, Send, FileText, AlertTriangle, ShieldCheck, Mail, Phone, MapPin
} from 'lucide-react';

function PortalContent() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get('id') || '';
  const token = searchParams.get('token') || '';

  // Core Data States
  const [booking, setBooking] = useState<BookingRecord | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<any>(DEFAULT_THEME);

  // Message States
  const [newMessage, setNewMessage] = useState<string>('');
  const [sendingMessage, setSendingMessage] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Waiver Sign States
  const [isSigningWaiver, setIsSigningWaiver] = useState<boolean>(false);
  const [waiverFullName, setWaiverFullName] = useState<string>('');
  const [waiverAddress, setWaiverAddress] = useState<string>('');
  const [waiverCity, setWaiverCity] = useState<string>('');
  const [waiverStateZip, setWaiverStateZip] = useState<string>('');
  const [waiverConsent, setWaiverConsent] = useState<boolean>(false);
  const [waiverSignText, setWaiverSignText] = useState<string>('');
  const [passengersList, setPassengersList] = useState<Array<{ name: string; relationship: string }>>([]);
  const [statusAlert, setStatusAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Load theme and booking details
  useEffect(() => {
    async function loadPortalData() {
      if (!bookingId || !token) {
        setError('Missing booking reference or secure access token.');
        setLoading(false);
        return;
      }

      try {
        // Load global site settings / theme
        const homeData = await loadPageData('home');
        if (homeData?.theme) {
          setTheme({
            ...DEFAULT_THEME,
            ...homeData.theme,
            backgroundColor: homeData.theme.backgroundColor || '#121416',
            foregroundColor: homeData.theme.foregroundColor || '#F4F1EA',
            primaryColor: homeData.theme.primaryColor || '#B9783B',
            surfaceColor: homeData.theme.surfaceColor || '#1E2124',
            mutedColor: homeData.theme.mutedColor || '#D8C7AF',
            accentColor: homeData.theme.accentColor || '#708C84'
          });
        }

        // Fetch booking
        const data = await getBookingById(bookingId);
        if (!data) {
          setError('Booking record not found.');
          setLoading(false);
          return;
        }

        // Token match validation
        if (data.token !== token) {
          setError('Invalid or expired secure access token.');
          setLoading(false);
          return;
        }

        setBooking(data);
        setWaiverFullName(data.guestName || '');
        
        // Initialize passenger list based on guestCount
        const count = data.guestCount || 1;
        if (count > 1) {
          setPassengersList(
            Array.from({ length: count - 1 }, () => ({ name: '', relationship: 'Friend' }))
          );
        }
      } catch (err) {
        console.error('Failed to load guest portal data:', err);
        setError('Error retrieving booking record. Please verify your connection.');
      } finally {
        setLoading(false);
      }
    }

    loadPortalData();
  }, [bookingId, token]);

  // Set up polling for messages and waiver updates every 5 seconds
  useEffect(() => {
    if (!booking) return;

    const interval = setInterval(async () => {
      try {
        const updated = await getBookingById(bookingId);
        if (updated && updated.token === token) {
          // Compare message arrays or waiver status to avoid redrawn state if identical
          if (
            JSON.stringify(updated.messages || []) !== JSON.stringify(booking.messages || []) ||
            updated.waiverSigned !== booking.waiverSigned ||
            updated.status !== booking.status
          ) {
            setBooking(updated);
          }
        }
      } catch (err) {
        console.warn('Silent update check failed:', err);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [booking, bookingId, token]);

  // Scroll to bottom of message list on updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [booking?.messages]);

  // Handle message submission
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !booking || sendingMessage) return;

    setSendingMessage(true);
    try {
      const ok = await sendBookingMessage(booking.id, 'guest', newMessage.trim());
      if (ok) {
        setNewMessage('');
        // Instantly reload local dataset
        const updated = await getBookingById(booking.id);
        if (updated) setBooking(updated);
      } else {
        setStatusAlert({ type: 'error', message: 'Failed to send message. Please check your connection and try again.' });
      }
    } catch (err) {
      console.error(err);
      setStatusAlert({ type: 'error', message: 'An error occurred while transmitting your message.' });
    } finally {
      setSendingMessage(false);
    }
  };

  // Handle digital waiver submit
  const handleWaiverSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!booking || isSigningWaiver) return;

    if (!checkSignatureMatch(waiverSignText, waiverFullName)) {
      alert('Waiver signature must match your printed guest name.');
      return;
    }

    setIsSigningWaiver(true);
    try {
      let ipInfo = { ip: 'Unknown', city: 'Unknown', region: 'Unknown', country: 'Unknown', loc: 'Unknown' };
      try {
        const res = await fetch('https://ipapi.co/json/').catch(() => null);
        if (res && res.ok) {
          const data = await res.json();
          ipInfo = {
            ip: data.ip || 'Unknown',
            city: data.city || 'Unknown',
            region: data.region || 'Unknown',
            country: data.country_name || 'Unknown',
            loc: `${data.latitude || ''},${data.longitude || ''}`
          };
        }
      } catch (err) {
        console.warn('Waiver IP look up bypassed:', err);
      }

      const ua = navigator.userAgent;
      let os = 'Unknown OS';
      let browser = 'Unknown Browser';
      let device = 'Desktop';

      if (/windows/i.test(ua)) os = 'Windows';
      else if (/macintosh/i.test(ua)) os = 'macOS';
      else if (/linux/i.test(ua)) os = 'Linux';
      else if (/android/i.test(ua)) os = 'Android';
      else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';

      if (/chrome|crios/i.test(ua) && !/edge|edg/i.test(ua)) browser = 'Chrome';
      else if (/safari/i.test(ua) && !/chrome|crios/i.test(ua)) browser = 'Safari';
      else if (/firefox|fxios/i.test(ua)) browser = 'Firefox';
      else if (/edge|edg/i.test(ua)) browser = 'Edge';

      if (/mobile|android|iphone|ipod/i.test(ua)) device = 'Mobile';
      else if (/ipad|tablet/i.test(ua)) device = 'Tablet';

      const signatureData = {
        bookingId: booking.id,
        guestEmail: booking.guestEmail,
        name: waiverFullName,
        address: `${waiverAddress}, ${waiverCity}, ${waiverStateZip}`,
        ip: ipInfo.ip,
        city: ipInfo.city,
        region: ipInfo.region,
        country: ipInfo.country,
        loc: ipInfo.loc,
        userAgent: ua,
        browser,
        os,
        device,
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        language: navigator.language || 'en',
        passengers: passengersList.map(p => ({
          name: p.name,
          relationship: p.relationship,
          addedToMainWaiver: p.relationship === 'Spouse' || p.relationship === 'Child'
        }))
      };

      const success = await saveWaiverSignature(booking.id, signatureData);
      if (success) {
        const updated = await getBookingById(booking.id);
        if (updated) setBooking(updated);
        setStatusAlert({ type: 'success', message: 'Digital waiver signature submitted and verified successfully!' });

        // Trigger transactional waiver confirmation email via server API
        fetch('/api/notifications/waiver-signed', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookingId: booking.id })
        }).catch(err => console.error('Failed to trigger waiver email:', err));
      } else {
        setStatusAlert({ type: 'error', message: 'Failed to submit waiver signature. Please contact administration.' });
      }
    } catch (err) {
      console.error(err);
      setStatusAlert({ type: 'error', message: 'Error occurred while signing waiver. Please verify inputs and try again.' });
    } finally {
      setIsSigningWaiver(false);
    }
  };

  const formatCost = (val: number) => {
    return `$${Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  if (loading) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ width: '48px', height: '48px', border: '3px solid rgba(185, 120, 59, 0.2)', borderTopColor: '#B9783B', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <p style={{ marginTop: '1.5rem', color: '#D8C7AF', fontSize: '0.95rem' }}>Loading secure Guest Portal...</p>
        <style dangerouslySetInnerHTML={{__html: `@keyframes spin { to { transform: rotate(360deg); } }`}} />
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '8rem 2rem 6rem 2rem', minHeight: '60vh' }}>
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '12px', padding: '2.5rem', maxWidth: '500px', width: '100%', textAlign: 'center' }}>
          <ShieldAlert size={48} color="#EF4444" style={{ margin: '0 auto 1.5rem auto' }} />
          <h1 style={{ fontSize: '1.75rem', fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, color: 'white', margin: '0 0 0.75rem 0' }}>
            Access Denied
          </h1>
          <p style={{ color: '#D8C7AF', fontSize: '0.9rem', lineHeight: '1.6', margin: '0 0 1.5rem 0' }}>
            {error || 'The secure access token is invalid or expired. If you believe this is an error, please refer to the booking confirmation email or contact your charter administrator.'}
          </p>
          <a 
            href="/"
            style={{ display: 'inline-block', background: 'rgba(255,255,255,0.05)', color: 'white', padding: '0.65rem 1.25rem', borderRadius: '6px', fontSize: '0.85rem', textDecoration: 'none', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            Return to Homepage
          </a>
        </div>
      </div>
    );
  }

  // Calculate financials
  const paidToday = booking.amountPaidToday || 0;
  const balanceDue = booking.amountDueLater || 0;
  const totalCost = paidToday + balanceDue;

  return (
    <div style={{ flex: 1, maxWidth: '1200px', width: '100%', margin: '0 auto', padding: '8rem 2rem 6rem 2rem' }}>
      
      {/* Portal Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '2rem', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#B9783B', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
            <Anchor size={14} /> M/Y Whiskey Voyage Manager
          </div>
          <h1 style={{ fontSize: '2.5rem', fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, color: 'white', margin: '0 0 0.5rem 0' }}>
            Welcome, {booking.guestName}
          </h1>
          <p style={{ color: '#D8C7AF', opacity: 0.8, fontSize: '0.92rem', margin: 0 }}>
            Manage waivers, review invoices, and communicate with the charter team for booking <strong>{booking.id}</strong>.
          </p>
        </div>

        {/* Quick status cards */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ background: '#1E2124', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '0.75rem 1.25rem', textAlign: 'center', minWidth: '130px' }}>
            <span style={{ fontSize: '0.65rem', color: '#D8C7AF', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.25rem' }}>Booking Status</span>
            <span style={{ 
              fontSize: '0.85rem', 
              fontWeight: 700, 
              color: booking.status === 'confirmed' ? '#708C84' : booking.status === 'pending waiver' ? '#E2A15E' : '#EF4444',
              textTransform: 'uppercase'
            }}>
              {booking.status}
            </span>
          </div>
          <div style={{ background: '#1E2124', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '0.75rem 1.25rem', textAlign: 'center', minWidth: '130px' }}>
            <span style={{ fontSize: '0.65rem', color: '#D8C7AF', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.25rem' }}>Liability Waiver</span>
            <span style={{ 
              fontSize: '0.85rem', 
              fontWeight: 700, 
              color: booking.waiverSigned ? '#708C84' : '#EF4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.25rem'
            }}>
              {booking.waiverSigned ? (
                <>✓ Signed</>
              ) : (
                <>✗ Pending</>
              )}
            </span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2.5rem', alignItems: 'start' }}>
        
        {/* LEFT COLUMN: Booking Details & Liability Waiver Signature */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
          
          {/* 1. Charter Details Block */}
          <div style={{ background: '#1E2124', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '2rem' }}>
            <h3 style={{ fontSize: '1.4rem', fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, color: 'white', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.75rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Ship size={20} color="#B9783B" /> Charter & Voyage Details
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#D8C7AF', opacity: 0.6, display: 'block', marginBottom: '0.15rem' }}>Experience</span>
                <span style={{ color: 'white', fontWeight: 600, fontSize: '0.95rem' }}>{booking.experienceTitle}</span>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#D8C7AF', opacity: 0.6, display: 'block', marginBottom: '0.15rem' }}>Vessel Select</span>
                <span style={{ color: 'white', fontWeight: 600, fontSize: '0.95rem' }}>{booking.vesselTitle}</span>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#D8C7AF', opacity: 0.6, display: 'block', marginBottom: '0.15rem' }}>Charter Date</span>
                <span style={{ color: 'white', fontWeight: 600, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Calendar size={14} color="#B9783B" />
                  {booking.date ? new Date(booking.date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                </span>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#D8C7AF', opacity: 0.6, display: 'block', marginBottom: '0.15rem' }}>Departure Time</span>
                <span style={{ color: 'white', fontWeight: 600, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Clock size={14} color="#B9783B" />
                  {booking.startTime}
                </span>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#D8C7AF', opacity: 0.6, display: 'block', marginBottom: '0.15rem' }}>Captain/Operator</span>
                <span style={{ color: 'white', fontWeight: 600, fontSize: '0.95rem' }}>{booking.captainTitle || 'Independent Bareboat Master'}</span>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#D8C7AF', opacity: 0.6, display: 'block', marginBottom: '0.15rem' }}>Passenger Count</span>
                <span style={{ color: 'white', fontWeight: 600, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <User size={14} color="#B9783B" />
                  {booking.guestCount} Guest{booking.guestCount > 1 ? 's' : ''}
                </span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr', gap: '1.5rem', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', padding: '1rem', borderRadius: '8px' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#D8C7AF', opacity: 0.6, display: 'block', marginBottom: '0.15rem' }}>Primary Contact Information</span>
                <span style={{ color: 'white', display: 'block', fontSize: '0.85rem' }}>{booking.guestName}</span>
                <span style={{ color: '#D8C7AF', opacity: 0.8, display: 'block', fontSize: '0.75rem', marginTop: '0.15rem' }}>
                  ✉ {booking.guestEmail}
                </span>
                <span style={{ color: '#D8C7AF', opacity: 0.8, display: 'block', fontSize: '0.75rem' }}>
                  ☎ {booking.guestPhone}
                </span>
              </div>
              <div style={{ borderLeft: '1px solid rgba(255,255,255,0.05)', paddingLeft: '1rem' }}>
                <span style={{ fontSize: '0.75rem', color: '#D8C7AF', opacity: 0.6, display: 'block', marginBottom: '0.15rem' }}>Departure Slip / Dock</span>
                <span style={{ color: 'white', fontWeight: 600, display: 'block', fontSize: '0.85rem' }}>
                  {booking.startLocation === 'destin-harbor' ? 'Destin Harbor Slip 15' : 'Fort Walton Yacht Basin'}
                </span>
                <span style={{ color: '#D8C7AF', opacity: 0.7, fontSize: '0.72rem', marginTop: '0.15rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                  <MapPin size={10} color="#B9783B" />
                  Destin Marina, Destin, FL
                </span>
              </div>
            </div>

            {/* Financial Auditing Panel */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: '1.5rem', paddingTop: '1.25rem' }}>
              <span style={{ fontSize: '0.75rem', color: '#D8C7AF', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.75rem' }}>
                Financial Statement
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.7rem', color: '#D8C7AF', opacity: 0.7 }}>Total Charter Cost</span>
                  <span style={{ color: 'white', fontWeight: 600, fontSize: '1.1rem', marginTop: '0.15rem' }}>{formatCost(totalCost)}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.7rem', color: '#708C84' }}>Amount Paid Today</span>
                  <span style={{ color: '#708C84', fontWeight: 700, fontSize: '1.1rem', marginTop: '0.15rem' }}>{formatCost(paidToday)}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.7rem', color: balanceDue > 0 ? '#E2A15E' : '#708C84' }}>Outstanding Balance</span>
                  <span style={{ color: balanceDue > 0 ? '#E2A15E' : '#708C84', fontWeight: 700, fontSize: '1.1rem', marginTop: '0.15rem' }}>{formatCost(balanceDue)}</span>
                </div>
              </div>
              
              {balanceDue > 0 && (
                <div style={{ background: 'rgba(226, 161, 94, 0.05)', border: '1px solid rgba(226, 161, 94, 0.15)', borderRadius: '6px', padding: '0.65rem 0.85rem', marginTop: '1rem', fontSize: '0.75rem', color: '#D8C7AF', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <AlertTriangle size={16} color="#E2A15E" style={{ flexShrink: 0 }} />
                  <span>
                    Reminder: Final balance of <strong>{formatCost(balanceDue)}</strong> is due 7 days prior to departure. Use the messenger chat on the right to arrange direct ACH settlement.
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* 2. Liability Waiver Block */}
          <div style={{ background: '#1E2124', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '2rem' }}>
            
            {booking.waiverSigned ? (
              <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                <div style={{ background: 'rgba(112, 140, 132, 0.1)', color: '#708C84', width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto' }}>
                  <ShieldCheck size={28} />
                </div>
                <h3 style={{ fontSize: '1.35rem', fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, color: 'white', margin: '0 0 0.5rem 0' }}>
                  Demise Charter Waiver Verified
                </h3>
                <p style={{ color: '#D8C7AF', opacity: 0.8, fontSize: '0.85rem', maxWidth: '400px', margin: '0 auto', lineHeight: '1.5' }}>
                  Your electronic liability release waiver has been signed and logged under Federal Bareboat Regulations. No further action is required.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.4rem', fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, color: 'white', margin: '0 0 0.3rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FileText size={20} color="#B9783B" /> Secure Digital Waiver Form
                  </h3>
                  <p style={{ fontSize: '0.78rem', color: '#D8C7AF', opacity: 0.8, lineHeight: '1.45', margin: 0 }}>
                    Federal laws require all charter passengers to sign the bareboat release waiver prior to boarding.
                  </p>
                </div>

                <form onSubmit={handleWaiverSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                  
                  {/* Passenger registry list */}
                  {booking.guestCount && booking.guestCount > 1 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '0.85rem' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'white' }}>Guest & Passenger Registry</span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.75rem', color: '#D8C7AF', opacity: 0.8 }}>Passenger 1 (Primary Booker):</span>
                          <span style={{ fontSize: '0.75rem', color: 'white', fontWeight: 600 }}>{booking.guestName} (Self)</span>
                        </div>
                        {passengersList.map((passenger, index) => (
                          <div key={index} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.5rem', alignItems: 'center' }}>
                            <input 
                              type="text"
                              placeholder={`Passenger ${index + 2} Full Name`}
                              value={passenger.name}
                              onChange={e => {
                                const newList = [...passengersList];
                                newList[index].name = e.target.value;
                                setPassengersList(newList);
                              }}
                              required
                              style={{ padding: '0.4rem 0.55rem', background: '#121416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', fontSize: '0.74rem', outline: 'none' }}
                            />
                            <select
                              value={passenger.relationship}
                              onChange={e => {
                                const newList = [...passengersList];
                                newList[index].relationship = e.target.value;
                                setPassengersList(newList);
                              }}
                              style={{ padding: '0.4rem 0.55rem', background: '#121416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', fontSize: '0.74rem', outline: 'none' }}
                            >
                              <option value="Spouse">Spouse</option>
                              <option value="Child">Child</option>
                              <option value="Friend">Friend</option>
                              <option value="Family">Family</option>
                              <option value="Colleague">Colleague</option>
                              <option value="Other">Other</option>
                            </select>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Scrollable Legal Waiver Text */}
                  <div style={{ 
                    height: '200px', 
                    overflowY: 'auto', 
                    background: '#121416', 
                    border: '1px solid rgba(255,255,255,0.05)', 
                    borderRadius: '6px', 
                    padding: '0.75rem', 
                    fontSize: '0.68rem', 
                    lineHeight: '1.45', 
                    color: '#D8C7AF',
                    opacity: 0.85
                  }}>
                    <h4 style={{ color: 'white', marginTop: 0, fontSize: '0.72rem', fontWeight: 700 }}>BAREBOAT LIABILITY WAIVER AND RELEASE OF LIABILITY</h4>
                    <p>In consideration of being allowed to board the vessel M/Y Whiskey for a private bareboat charter, I, the undersigned Passenger, hereby acknowledge and agree to the following terms:</p>
                    <p>1. I understand that boating activities involve inherent risks, including but not limited to changing weather, waves, collision, slipping, falling, drowning, and other hazards that may result in serious injury or death.</p>
                    <p>2. I release the vessel owners, crew, independent operator captain, and agents from any and all liability for personal injury, property loss, or accidental death arising during this excursion.</p>
                    <p>3. I acknowledge that I am passenger under a Bareboat Charter agreement where the charterer selects their own crew. I agree to follow all safety briefs, wear life vests when instructed by the operator, and act in a responsible manner while on board.</p>
                    <p>4. By signing below, I agree that this electronic signature is legally binding and constitutes consent to digital contract processing.</p>
                  </div>

                  {/* Address Inputs */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <label style={{ fontSize: '0.7rem', color: '#D8C7AF', fontWeight: 600 }}>Street Address</label>
                      <input 
                        type="text" 
                        value={waiverAddress} 
                        onChange={e => setWaiverAddress(e.target.value)} 
                        placeholder="Street Address" 
                        style={{ padding: '0.45rem 0.65rem', background: '#121416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', fontSize: '0.78rem', outline: 'none' }}
                        required 
                      />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <label style={{ fontSize: '0.7rem', color: '#D8C7AF', fontWeight: 600 }}>City</label>
                        <input 
                          type="text" 
                          value={waiverCity} 
                          onChange={e => setWaiverCity(e.target.value)} 
                          placeholder="City" 
                          style={{ padding: '0.45rem 0.65rem', background: '#121416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', fontSize: '0.78rem', outline: 'none' }}
                          required 
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <label style={{ fontSize: '0.7rem', color: '#D8C7AF', fontWeight: 600 }}>State / Zip Code</label>
                        <input 
                          type="text" 
                          value={waiverStateZip} 
                          onChange={e => setWaiverStateZip(e.target.value)} 
                          placeholder="State / Zip Code" 
                          style={{ padding: '0.45rem 0.65rem', background: '#121416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', fontSize: '0.78rem', outline: 'none' }}
                          required 
                        />
                      </div>
                    </div>
                  </div>

                  {/* Consent checkbox */}
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={waiverConsent}
                      onChange={e => setWaiverConsent(e.target.checked)}
                      style={{ accentColor: '#B9783B', marginTop: '0.15rem' }}
                      required
                    />
                    <span style={{ fontSize: '0.68rem', color: '#D8C7AF', opacity: 0.85, lineHeight: '1.35' }}>
                      I consent to signing electronically. My signature is legally binding, and native device metadata (IP, approximate location, browser, screen resolution) will be securely recorded for liability verification.
                    </span>
                  </label>

                  {/* Signature Typing Box */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', borderTop: '1px dashed rgba(255,255,255,0.06)', paddingTop: '0.85rem' }}>
                    <label style={{ fontSize: '0.7rem', color: '#D8C7AF', fontWeight: 600 }}>Type Full Name to Sign electronically</label>
                    <input 
                      type="text" 
                      value={waiverSignText} 
                      onChange={e => setWaiverSignText(e.target.value)} 
                      placeholder="Type full name exactly to sign" 
                      style={{ 
                        padding: '0.5rem 0.75rem', 
                        background: '#121416', 
                        border: '1px solid rgba(185, 120, 59, 0.3)', 
                        borderRadius: '6px', 
                        color: '#B9783B', 
                        fontSize: '1.15rem', 
                        fontFamily: "'Cormorant Garamond', Georgia, serif", 
                        fontStyle: 'italic', 
                        letterSpacing: '0.04em',
                        outline: 'none' 
                      }}
                      required 
                    />
                    {waiverSignText && !checkSignatureMatch(waiverSignText, waiverFullName) && (
                      <span style={{ 
                        fontSize: '0.74rem', 
                        color: '#FCA5A5', 
                        background: 'rgba(239, 68, 68, 0.1)', 
                        border: '1px solid rgba(239, 68, 68, 0.25)', 
                        borderRadius: '6px', 
                        padding: '0.4rem 0.65rem', 
                        display: 'block', 
                        marginTop: '0.35rem' 
                      }}>
                        * Signature spelling must match printed name: "{waiverFullName}"
                      </span>
                    )}
                    {waiverSignText && checkSignatureMatch(waiverSignText, waiverFullName) && (
                      <span style={{ 
                        fontSize: '0.74rem', 
                        color: '#A7F3D0', 
                        background: 'rgba(16, 185, 129, 0.1)', 
                        border: '1px solid rgba(16, 185, 129, 0.25)', 
                        borderRadius: '6px', 
                        padding: '0.4rem 0.65rem', 
                        display: 'block', 
                        marginTop: '0.35rem' 
                      }}>
                        ✓ Signature matches printed name.
                      </span>
                    )}
                  </div>

                  <button 
                    type="submit" 
                    disabled={
                      isSigningWaiver || 
                      !waiverConsent || 
                      !waiverSignText.trim() || 
                      !checkSignatureMatch(waiverSignText, waiverFullName)
                    } 
                    style={{
                      background: (isSigningWaiver || !waiverConsent || !waiverSignText.trim() || !checkSignatureMatch(waiverSignText, waiverFullName)) ? 'rgba(255,255,255,0.05)' : '#B9783B',
                      color: (isSigningWaiver || !waiverConsent || !waiverSignText.trim() || !checkSignatureMatch(waiverSignText, waiverFullName)) ? '#666' : 'white',
                      border: 'none',
                      padding: '0.75rem',
                      borderRadius: '6px',
                      fontWeight: 600,
                      fontSize: '0.8rem',
                      cursor: (isSigningWaiver || !waiverConsent || !waiverSignText.trim() || !checkSignatureMatch(waiverSignText, waiverFullName)) ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem',
                      boxShadow: (isSigningWaiver || !waiverConsent || !waiverSignText.trim() || !checkSignatureMatch(waiverSignText, waiverFullName)) ? 'none' : '0 4px 14px rgba(185, 120, 59, 0.3)'
                    }}
                  >
                    {isSigningWaiver ? 'Submitting Signature...' : 'Submit Signed Waiver'}
                  </button>

                </form>
              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: Charter Messenger Panel */}
        <div style={{ background: '#1E2124', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '2rem', display: 'flex', flexDirection: 'column', height: '650px', boxShadow: '0 12px 24px rgba(0,0,0,0.2)' }}>
          
          {/* Messenger Header */}
          <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1rem', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              <MessageSquare size={18} color="#B9783B" /> Charter Concierge
            </h3>
            <span style={{ fontSize: '0.7rem', color: '#D8C7AF', opacity: 0.6, marginTop: '0.25rem', display: 'block' }}>
              Chat live with our crew and yacht planners (Replies within ~30m).
            </span>
          </div>

          {/* Messages Feed */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', padding: '0.5rem 0.2rem', marginBottom: '1rem' }}>
            {(!booking.messages || booking.messages.length === 0) ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: '#D8C7AF', opacity: 0.5, padding: '2rem' }}>
                <span style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>💬</span>
                <p style={{ fontSize: '0.78rem', margin: 0 }}>No messages yet. Send a message to coordinate boarding logistics or request upgrades.</p>
              </div>
            ) : (
              booking.messages.map((msg) => {
                const isGuest = msg.sender === 'guest';
                return (
                  <div 
                    key={msg.id}
                    style={{
                      alignSelf: isGuest ? 'flex-end' : 'flex-start',
                      maxWidth: '85%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: isGuest ? 'flex-end' : 'flex-start'
                    }}
                  >
                    <div style={{
                      background: isGuest ? '#B9783B' : 'rgba(255,255,255,0.04)',
                      border: isGuest ? 'none' : '1px solid rgba(255,255,255,0.06)',
                      color: isGuest ? 'white' : '#F4F1EA',
                      padding: '0.65rem 0.95rem',
                      borderRadius: '12px',
                      borderBottomRightRadius: isGuest ? '2px' : '12px',
                      borderBottomLeftRadius: isGuest ? '12px' : '2px',
                      fontSize: '0.82rem',
                      lineHeight: '1.4',
                      wordBreak: 'break-word'
                    }}>
                      {msg.text}
                    </div>
                    <span style={{ fontSize: '0.62rem', color: '#D8C7AF', opacity: 0.5, marginTop: '0.25rem', display: 'block' }}>
                      {isGuest ? 'You' : 'M/Y Admin'} • {new Date(msg.timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Form message input */}
          <form onSubmit={handleSendMessage} style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem', display: 'flex', gap: '0.5rem' }}>
            <input 
              type="text"
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              placeholder="Type message here..."
              required
              disabled={sendingMessage}
              style={{
                flex: 1,
                padding: '0.6rem 0.85rem',
                borderRadius: '6px',
                background: '#121416',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'white',
                fontSize: '0.8rem',
                outline: 'none'
              }}
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || sendingMessage}
              style={{
                background: (!newMessage.trim() || sendingMessage) ? 'rgba(255,255,255,0.05)' : '#B9783B',
                color: (!newMessage.trim() || sendingMessage) ? '#666' : 'white',
                border: 'none',
                width: '38px',
                height: '38px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: (!newMessage.trim() || sendingMessage) ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <Send size={14} />
            </button>
          </form>
        </div>

      </div>

      {statusAlert && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{
            background: '#1E2124',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '12px',
            padding: '2.5rem 2rem',
            maxWidth: '420px',
            width: '90%',
            textAlign: 'center',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            transform: 'translateY(0)',
            animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
          }}>
            {statusAlert.type === 'success' ? (
              <div style={{ background: 'rgba(112, 140, 132, 0.1)', color: '#708C84', width: '56px', height: '56px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
                <CheckCircle size={32} />
              </div>
            ) : (
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', width: '56px', height: '56px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
                <AlertTriangle size={32} />
              </div>
            )}
            
            <h3 style={{ fontSize: '1.4rem', fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, color: 'white', margin: '0 0 0.75rem 0' }}>
              {statusAlert.type === 'success' ? 'Waiver Verified' : 'Action Failed'}
            </h3>
            
            <p style={{ color: '#D8C7AF', opacity: 0.85, fontSize: '0.88rem', lineHeight: '1.5', margin: '0 0 1.75rem 0' }}>
              {statusAlert.message}
            </p>
            
            <button
              onClick={() => setStatusAlert(null)}
              style={{
                background: '#B9783B',
                color: 'white',
                border: 'none',
                padding: '0.65rem 2rem',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'background 0.2s',
                boxShadow: '0 4px 12px rgba(185, 120, 59, 0.2)'
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#d08c4f'}
              onMouseLeave={e => e.currentTarget.style.background = '#B9783B'}
            >
              Acknowledge
            </button>
          </div>
          
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes slideUp {
              from { transform: translateY(12px); opacity: 0; }
              to { transform: translateY(0); opacity: 1; }
            }
          `}} />
        </div>
      )}
    </div>
  );
}

export default function SecureGuestPortal() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#121416', color: '#D8C7AF' }}>
        <p>Initializing Secure Connection...</p>
      </div>
    }>
      <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#121416', color: '#F4F1EA', fontFamily: "'Inter', sans-serif" }}>
        <PublicNavigation theme={DEFAULT_THEME} />
        <PortalContent />
        <PublicFooter theme={DEFAULT_THEME} />
      </main>
    </Suspense>
  );
}
