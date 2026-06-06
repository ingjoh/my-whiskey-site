'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  getBookingById, sendBookingMessage, saveWaiverSignature, loadPageData,
  BookingRecord, BookingMessage, checkSignatureMatch, getCustomerProfile,
  getAllBookings, getAssetBlackouts, getAllCheckoutLocks
} from '@/lib/db';
import { DEFAULT_THEME } from '@/lib/pageTemplates';
import PublicNavigation from '@/components/public/PublicNavigation';
import PublicFooter from '@/components/public/PublicFooter';
import { 
  Anchor, ShieldAlert, MessageSquare, Calendar, DollarSign, User, Ship, Clock, 
  ArrowRight, Lock, CheckCircle, Send, FileText, AlertTriangle, ShieldCheck, Mail, Phone, MapPin,
  Edit3, Trash2, HelpCircle, ChevronDown, Check, X
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
  const [customerBookings, setCustomerBookings] = useState<BookingRecord[]>([]);
  const [selectedBookingId, setSelectedBookingId] = useState<string>('');

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

  // Reschedule, Cancellation, and Payment States
  const [showRescheduleForm, setShowRescheduleForm] = useState<boolean>(false);
  const [newRescheduleDate, setNewRescheduleDate] = useState<string>('');
  const [newRescheduleTime, setNewRescheduleTime] = useState<string>('09:30');
  const [checkingAvailability, setCheckingAvailability] = useState<boolean>(false);
  const [availabilityResult, setAvailabilityResult] = useState<{ available: boolean; message: string } | null>(null);
  const [isSubmittingReschedule, setIsSubmittingReschedule] = useState<boolean>(false);

  const [showCancelModal, setShowCancelModal] = useState<boolean>(false);
  const [cancellationRefundEstimate, setCancellationRefundEstimate] = useState<number>(0);
  const [cancellationPolicyText, setCancellationPolicyText] = useState<string>('');
  const [isSubmittingCancellation, setIsSubmittingCancellation] = useState<boolean>(false);

  const [isProcessingBalancePayment, setIsProcessingBalancePayment] = useState<boolean>(false);

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
        setSelectedBookingId(data.id);
        setWaiverFullName(data.guestName || '');
        
        // Initialize passenger list based on guestCount
        const count = data.guestCount || 1;
        if (count > 1) {
          setPassengersList(
            Array.from({ length: count - 1 }, () => ({ name: '', relationship: 'Friend' }))
          );
        }

        // Fetch all other bookings for the same customer profile (by email)
        if (data.guestEmail) {
          const profile = await getCustomerProfile(data.guestEmail);
          if (profile && profile.bookingIds && profile.bookingIds.length > 0) {
            const fetchedBookings = await Promise.all(
              profile.bookingIds.map(async (id) => {
                try {
                  const bk = await getBookingById(id);
                  if (bk && bk.guestEmail.toLowerCase().trim() === data.guestEmail.toLowerCase().trim()) {
                    return bk;
                  }
                } catch (err) {
                  console.warn(`Error loading associated booking ${id}:`, err);
                }
                return null;
              })
            );
            
            const validBookings = fetchedBookings
              .filter((bk): bk is BookingRecord => bk !== null)
              .sort((a, b) => new Date(b.date + 'T' + (b.startTime || '00:00')).getTime() - new Date(a.date + 'T' + (a.startTime || '00:00')).getTime());
            
            setCustomerBookings(validBookings);
            // Sync active booking in case details were updated
            const currentSelected = validBookings.find(b => b.id === data.id);
            if (currentSelected) {
              setBooking(currentSelected);
            }
          } else {
            setCustomerBookings([data]);
          }
        } else {
          setCustomerBookings([data]);
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
        const updated = await getBookingById(booking.id);
        if (updated && updated.token === booking.token) {
          // Compare message arrays or waiver status or dates to avoid redrawn state if identical
          if (
            JSON.stringify(updated.messages || []) !== JSON.stringify(booking.messages || []) ||
            updated.waiverSigned !== booking.waiverSigned ||
            updated.status !== booking.status ||
            updated.amountPaidToday !== booking.amountPaidToday ||
            updated.amountDueLater !== booking.amountDueLater ||
            updated.date !== booking.date ||
            updated.startTime !== booking.startTime
          ) {
            setBooking(updated);
            setCustomerBookings(prev => prev.map(b => b.id === updated.id ? updated : b));
          }
        }
      } catch (err) {
        console.warn('Silent update check failed:', err);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [booking]);

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

  // Helper to fetch user client metadata for disputes/audits
  const getClientMetadata = async () => {
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
      console.warn('Metadata IP look up bypassed:', err);
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

    return {
      ...ipInfo,
      userAgent: ua,
      browser,
      os,
      device
    };
  };

  // Switch displayed voyage details
  const handleSelectBooking = (bk: BookingRecord) => {
    setBooking(bk);
    setSelectedBookingId(bk.id);
    setWaiverFullName(bk.guestName || '');
    // Reset forms
    setShowRescheduleForm(false);
    setAvailabilityResult(null);
  };

  // Trigger Stripe balance payment
  const handlePayBalance = async () => {
    if (!booking || isProcessingBalancePayment) return;
    setIsProcessingBalancePayment(true);
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: booking.id,
          amount: booking.amountDueLater,
          email: booking.guestEmail,
          experienceTitle: booking.experienceTitle,
          experienceSlug: booking.experienceId || 'destin-private-coastal-adventure',
          date: booking.date,
          startTime: booking.startTime,
          vesselTitle: booking.vesselTitle || 'M/Y Whiskey',
          paymentPlan: booking.paymentPlan,
          isBalancePayment: true,
          bookingToken: booking.token,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create balance payment checkout session');
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (err: any) {
      console.error('Balance payment error:', err);
      alert(`Payment routing failed: ${err.message || err}. Please try again.`);
      setIsProcessingBalancePayment(false);
    }
  };

  // Verify availability calendar slots client-side
  const handleCheckAvailability = async () => {
    if (!booking || !newRescheduleDate || !newRescheduleTime) return;
    setCheckingAvailability(true);
    setAvailabilityResult(null);
    try {
      // 1. Must be in the future
      const targetDate = new Date(`${newRescheduleDate}T${newRescheduleTime}:00`);
      const now = new Date();
      if (targetDate.getTime() <= now.getTime()) {
        setAvailabilityResult({ available: false, message: 'Please select a date and time in the future.' });
        return;
      }

      // 2. Fetch inventories from Firestore
      const [allBks, blackouts, locks] = await Promise.all([
        getAllBookings(),
        getAssetBlackouts(),
        getAllCheckoutLocks()
      ]);

      const vesselSlug = booking.vesselSlug;

      // A. Check conflicting bookings (excluding current booking)
      const conflict = allBks.find(b => 
        b.vesselSlug === vesselSlug && 
        b.date === newRescheduleDate && 
        b.startTime === newRescheduleTime && 
        b.status !== 'cancelled' &&
        b.id !== booking.id
      );
      if (conflict) {
        setAvailabilityResult({ available: false, message: 'Vessel is already booked at this slot. Please choose another date or time.' });
        return;
      }

      // B. Check blackouts
      const blackout = blackouts.find(b => {
        if (b.vesselSlug !== vesselSlug) return false;
        const bStart = new Date(b.startTime ? `${b.startDate}T${b.startTime}:00` : `${b.startDate}T00:00:00`).getTime();
        const bEnd = new Date(b.endTime ? `${b.endDate}T${b.endTime}:00` : `${b.endDate}T23:59:59`).getTime();
        const candStart = targetDate.getTime();
        const candEnd = candStart + 4 * 60 * 60 * 1000;
        return candStart < bEnd && candEnd > bStart;
      });
      if (blackout) {
        setAvailabilityResult({ available: false, message: `Vessel is blacked out: ${blackout.title}.` });
        return;
      }

      // C. Check locks
      const lock = locks.some(l => 
        l.vesselSlug === vesselSlug && 
        l.date === newRescheduleDate && 
        l.startTime === newRescheduleTime && 
        l.holderEmail.toLowerCase().trim() !== booking.guestEmail.toLowerCase().trim()
      );
      if (lock) {
        setAvailabilityResult({ available: false, message: 'Vessel slot is temporarily locked by another customer checking out.' });
        return;
      }

      setAvailabilityResult({ available: true, message: 'Slot is available! You can proceed to reschedule.' });
    } catch (err) {
      console.error('Availability check error:', err);
      setAvailabilityResult({ available: false, message: 'Error checking availability. Please try again.' });
    } finally {
      setCheckingAvailability(false);
    }
  };

  // Submit rescheduling date change
  const handleRescheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!booking || isSubmittingReschedule || !newRescheduleDate || !newRescheduleTime) return;

    setIsSubmittingReschedule(true);
    try {
      const clientMetadata = await getClientMetadata();
      const res = await fetch('/api/bookings/reschedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: booking.id,
          token: booking.token,
          newDate: newRescheduleDate,
          newStartTime: newRescheduleTime,
          clientMetadata
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to reschedule voyage.');
      }

      alert('Voyage rescheduled successfully! A new confirmation email has been sent.');
      setShowRescheduleForm(false);
      setAvailabilityResult(null);
      
      // Reload page data
      const updated = await getBookingById(booking.id);
      if (updated) {
        setBooking(updated);
        setCustomerBookings(prev => prev.map(b => b.id === updated.id ? updated : b));
      }
    } catch (err: any) {
      console.error('Reschedule submit error:', err);
      alert(`Rescheduling failed: ${err.message || err}`);
    } finally {
      setIsSubmittingReschedule(false);
    }
  };

  // Initiate cancel voyage refund calculation
  const handleCancelInitiate = () => {
    if (!booking) return;

    const subtotal = booking.subtotal || 0;
    const grandTotal = booking.grandTotal || 0;
    const amountPaidToday = booking.amountPaidToday || 0;
    const hasInsurance = booking.cancellationInsurance || false;
    const insuranceCost = hasInsurance ? subtotal * 0.05 : 0;

    const tripDate = new Date(`${booking.date}T${booking.startTime || '00:00'}:00`);
    const now = new Date();
    const diffTime = tripDate.getTime() - now.getTime();
    const diffHours = diffTime / (1000 * 60 * 60);
    const diffDays = diffHours / 24;

    let refundPercent = 0;
    let estimate = 0;
    let text = '';

    if (hasInsurance) {
      if (diffHours >= 48) {
        refundPercent = 100;
        estimate = Math.max(0, amountPaidToday - insuranceCost);
        text = `With Cancellation Insurance (> 48 hours prior to departure): 100% refund of amount paid, excluding the insurance premium ($${insuranceCost.toFixed(0)}).`;
      } else {
        refundPercent = 50;
        const liability = 0.5 * (grandTotal - insuranceCost) + insuranceCost;
        estimate = Math.max(0, amountPaidToday - liability);
        text = `With Cancellation Insurance (< 48 hours prior to departure): 50% refund of total charter cost, excluding the insurance premium. Premium of $${insuranceCost.toFixed(0)} is non-refundable.`;
      }
    } else {
      if (diffDays >= 14) {
        refundPercent = 100;
        estimate = amountPaidToday;
        text = 'Without Cancellation Insurance (> 14 days prior to departure): 100% refund of amount paid (minus Stripe card processing fees).';
      } else if (diffDays >= 7 && diffDays < 14) {
        refundPercent = 50;
        const liability = 0.5 * grandTotal;
        estimate = Math.max(0, amountPaidToday - liability);
        text = `Without Cancellation Insurance (7 to 14 days prior to departure): 50% refund of total charter cost. Cancellation liability: $${liability.toFixed(0)}.`;
      } else {
        refundPercent = 0;
        estimate = 0;
        text = 'Without Cancellation Insurance (< 7 days prior to departure): No refund is eligible. Customer is responsible for 100% of charter fees.';
      }
    }

    setCancellationRefundEstimate(Math.round(estimate * 100) / 100);
    setCancellationPolicyText(text);
    setShowCancelModal(true);
  };

  // Submit cancellation to server
  const handleCancelSubmit = async () => {
    if (!booking || isSubmittingCancellation) return;

    setIsSubmittingCancellation(true);
    try {
      const clientMetadata = await getClientMetadata();
      const res = await fetch('/api/bookings/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: booking.id,
          token: booking.token,
          clientMetadata
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to cancel voyage.');
      }

      alert('Voyage has been cancelled. Your refund request is flagged for manual processing in Stripe.');
      setShowCancelModal(false);
      
      // Reload page data
      const updated = await getBookingById(booking.id);
      if (updated) {
        setBooking(updated);
        setCustomerBookings(prev => prev.map(b => b.id === updated.id ? updated : b));
      }
    } catch (err: any) {
      console.error('Cancellation submit error:', err);
      alert(`Cancellation failed: ${err.message || err}`);
    } finally {
      setIsSubmittingCancellation(false);
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
      
      {/* Voyage Selector (Multi-booking switcher) */}
      {customerBookings.length > 1 && (
        <div style={{ marginBottom: '2rem', width: '100%', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '1rem' }}>
          <label style={{ fontSize: '0.68rem', color: '#D8C7AF', opacity: 0.6, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '0.65rem' }}>
            Your Voyages (Select to Manage Details & Waiver)
          </label>
          <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
            {customerBookings.map((bk) => {
              const isActive = bk.id === booking.id;
              const bkDate = bk.date ? new Date(bk.date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A';
              return (
                <button
                  key={bk.id}
                  type="button"
                  onClick={() => handleSelectBooking(bk)}
                  style={{
                    background: isActive ? '#B9783B' : 'rgba(255,255,255,0.02)',
                    border: isActive ? '1px solid #B9783B' : '1px solid rgba(255,255,255,0.08)',
                    color: 'white',
                    padding: '0.55rem 0.95rem',
                    borderRadius: '6px',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    outline: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    boxShadow: isActive ? '0 4px 10px rgba(185, 120, 59, 0.2)' : 'none'
                  }}
                  onMouseEnter={e => {
                    if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                  }}
                  onMouseLeave={e => {
                    if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                  }}
                >
                  <Calendar size={12} color={isActive ? '#FFF' : '#B9783B'} />
                  <span>{bkDate} ({bk.id})</span>
                  {isActive && <span style={{ background: 'rgba(255,255,255,0.2)', padding: '0.05rem 0.25rem', borderRadius: '4px', fontSize: '0.6rem', textTransform: 'uppercase', fontWeight: 700 }}>Active</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

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

            {/* Manage Voyage Reschedule/Cancel Actions */}
            {booking.status !== 'cancelled' && (
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1.25rem' }}>
                <button
                  type="button"
                  onClick={() => setShowRescheduleForm(!showRescheduleForm)}
                  style={{
                    flex: 1,
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '6px',
                    padding: '0.55rem',
                    color: '#D8C7AF',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                    transition: 'all 0.2s',
                    outline: 'none'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = '#B9783B'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
                >
                  <Edit3 size={12} color="#B9783B" />
                  <span>Reschedule Voyage</span>
                </button>
                <button
                  type="button"
                  onClick={handleCancelInitiate}
                  style={{
                    flex: 1,
                    background: 'rgba(239, 68, 68, 0.05)',
                    border: '1px solid rgba(239, 68, 68, 0.15)',
                    borderRadius: '6px',
                    padding: '0.55rem',
                    color: '#FCA5A5',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                    transition: 'all 0.2s',
                    outline: 'none'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.05)'; }}
                >
                  <Trash2 size={12} color="#EF4444" />
                  <span>Cancel Charter</span>
                </button>
              </div>
            )}

            {showRescheduleForm && booking.status !== 'cancelled' && (
              <form onSubmit={handleRescheduleSubmit} style={{ marginTop: '1.25rem', background: '#121416', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', animation: 'fadeInUp 0.3s ease-out' }}>
                <h4 style={{ fontSize: '0.9rem', color: 'white', fontWeight: 700, margin: 0 }}>Select New Voyage Slot</h4>
                <p style={{ fontSize: '0.72rem', color: '#D8C7AF', opacity: 0.8, lineHeight: '1.4', margin: 0 }}>
                  Rescheduling is subject to vessel availability. Date changes must be made at least 7 days prior to your departure.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label style={{ fontSize: '0.68rem', color: '#D8C7AF', fontWeight: 600 }}>New Date</label>
                    <input
                      type="date"
                      value={newRescheduleDate}
                      onChange={e => { setNewRescheduleDate(e.target.value); setAvailabilityResult(null); }}
                      required
                      style={{ padding: '0.45rem 0.65rem', background: '#1E2124', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', color: 'white', fontSize: '0.78rem', outline: 'none' }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label style={{ fontSize: '0.68rem', color: '#D8C7AF', fontWeight: 600 }}>Departure Time</label>
                    <select
                      value={newRescheduleTime}
                      onChange={e => { setNewRescheduleTime(e.target.value); setAvailabilityResult(null); }}
                      required
                      style={{ padding: '0.45rem 0.65rem', background: '#1E2124', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', color: 'white', fontSize: '0.78rem', outline: 'none' }}
                    >
                      <option value="08:00">08:00 AM</option>
                      <option value="09:00">09:00 AM</option>
                      <option value="09:30">09:30 AM</option>
                      <option value="10:00">10:00 AM</option>
                      <option value="11:00">11:00 AM</option>
                      <option value="12:00">12:00 PM</option>
                      <option value="13:00">01:00 PM</option>
                      <option value="13:30">01:30 PM</option>
                      <option value="14:00">02:00 PM</option>
                      <option value="15:00">03:00 PM</option>
                      <option value="16:00">04:00 PM</option>
                      <option value="17:00">05:00 PM</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                  <button
                    type="button"
                    onClick={handleCheckAvailability}
                    disabled={checkingAvailability || !newRescheduleDate}
                    style={{
                      flex: 1,
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      padding: '0.5rem',
                      borderRadius: '6px',
                      color: 'white',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: (checkingAvailability || !newRescheduleDate) ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {checkingAvailability ? 'Checking...' : 'Check Availability'}
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingReschedule || !availabilityResult || !availabilityResult.available}
                    style={{
                      flex: 1.2,
                      background: (!availabilityResult || !availabilityResult.available || isSubmittingReschedule) ? 'rgba(255,255,255,0.05)' : '#B9783B',
                      color: (!availabilityResult || !availabilityResult.available || isSubmittingReschedule) ? '#666' : 'white',
                      border: 'none',
                      padding: '0.5rem',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: (!availabilityResult || !availabilityResult.available || isSubmittingReschedule) ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {isSubmittingReschedule ? 'Rescheduling...' : 'Confirm Reschedule'}
                  </button>
                </div>

                {availabilityResult && (
                  <div style={{
                    fontSize: '0.75rem',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '6px',
                    border: availabilityResult.available ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)',
                    background: availabilityResult.available ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)',
                    color: availabilityResult.available ? '#A7F3D0' : '#FCA5A5',
                    marginTop: '0.25rem'
                  }}>
                    {availabilityResult.message}
                  </div>
                )}
              </form>
            )}

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
              
              {balanceDue > 0 && booking.status !== 'cancelled' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
                  <div style={{ background: 'rgba(226, 161, 94, 0.05)', border: '1px solid rgba(226, 161, 94, 0.15)', borderRadius: '6px', padding: '0.65rem 0.85rem', fontSize: '0.75rem', color: '#D8C7AF', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <AlertTriangle size={16} color="#E2A15E" style={{ flexShrink: 0 }} />
                    <span>
                      Reminder: Final balance of <strong>{formatCost(balanceDue)}</strong> is due 7 days prior to departure. You can settle it securely by clicking the payment button below.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handlePayBalance}
                    disabled={isProcessingBalancePayment}
                    style={{
                      background: isProcessingBalancePayment ? 'rgba(255,255,255,0.05)' : '#B9783B',
                      color: isProcessingBalancePayment ? '#666' : 'white',
                      border: 'none',
                      padding: '0.7rem 1.25rem',
                      borderRadius: '8px',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      cursor: isProcessingBalancePayment ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      transition: 'all 0.2s',
                      boxShadow: isProcessingBalancePayment ? 'none' : '0 4px 14px rgba(185, 120, 59, 0.25)',
                      outline: 'none'
                    }}
                    onMouseEnter={e => { if (!isProcessingBalancePayment) e.currentTarget.style.background = '#d08c4f'; }}
                    onMouseLeave={e => { if (!isProcessingBalancePayment) e.currentTarget.style.background = '#B9783B'; }}
                  >
                    <DollarSign size={16} />
                    <span>{isProcessingBalancePayment ? 'Processing Routing...' : `Pay Outstanding Balance (${formatCost(balanceDue)})`}</span>
                  </button>
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

      {/* CANCELLATION MODAL */}
      {showCancelModal && booking && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(5px)',
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
            padding: '2rem',
            maxWidth: '520px',
            width: '90%',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
          }}>
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
              <AlertTriangle size={24} />
            </div>

            <h3 style={{ fontSize: '1.4rem', fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, color: 'white', margin: '0 0 0.5rem 0' }}>
              Cancel Charter Booking {booking.id}
            </h3>

            <p style={{ color: '#D8C7AF', opacity: 0.9, fontSize: '0.82rem', lineHeight: '1.5', margin: '0 0 1.25rem 0' }}>
              Are you sure you want to cancel your bareboat demise charter? This action cannot be undone. Re-scheduling options are available if you prefer to change dates.
            </p>

            {/* Policy Comparison Table */}
            <div style={{ background: '#121416', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '0.85rem', marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'white', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.45rem', marginBottom: '0.45rem', display: 'flex', justifyContent: 'space-between' }}>
                <span>Cancellation Policy Rules</span>
                <span style={{ color: '#B9783B' }}>{booking.cancellationInsurance ? 'Insurance Active' : 'No Insurance'}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '0.25rem', fontSize: '0.65rem', color: '#D8C7AF', opacity: 0.8, lineHeight: '1.4' }}>
                <span style={{ fontWeight: 600, color: 'white' }}>Timeframe</span>
                <span style={{ fontWeight: 600, color: 'white' }}>Standard</span>
                <span style={{ fontWeight: 600, color: 'white' }}>With Insurance</span>
                
                <span>&gt; 14 Days</span>
                <span>100% Refund*</span>
                <span>100% Refund</span>
                
                <span>7 to 14 Days</span>
                <span>50% Refund</span>
                <span>100% Refund</span>
                
                <span>48h to 7 Days</span>
                <span>No Refund</span>
                <span>100% Refund</span>
                
                <span>&lt; 48 Hours</span>
                <span>No Refund</span>
                <span>50% Refund</span>
              </div>
              <div style={{ fontSize: '0.6rem', opacity: 0.5, color: '#D8C7AF', marginTop: '0.45rem' }}>
                *Minus Stripe credit card processing fees. Insurance premiums are non-refundable.
              </div>
            </div>

            {/* Calculations Box */}
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '6px', padding: '0.75rem 1rem', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.78rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#D8C7AF' }}>
                <span>Total Amount Paid:</span>
                <span style={{ color: 'white', fontWeight: 600 }}>{formatCost(booking.amountPaidToday || 0)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#EF4444', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.35rem' }}>
                <span>Cancellation Policy Applied:</span>
                <span style={{ fontWeight: 600 }}>{booking.cancellationInsurance ? 'Insured Tier' : 'Standard Tier'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#708C84', fontWeight: 700, paddingTop: '0.25rem', fontSize: '0.85rem' }}>
                <span>Estimated Refund:</span>
                <span>{formatCost(cancellationRefundEstimate)}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                disabled={isSubmittingCancellation}
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  padding: '0.55rem 1.25rem',
                  borderRadius: '6px',
                  color: 'white',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleCancelSubmit}
                disabled={isSubmittingCancellation}
                style={{
                  background: '#EF4444',
                  color: 'white',
                  border: 'none',
                  padding: '0.55rem 1.25rem',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: isSubmittingCancellation ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 12px rgba(239, 68, 68, 0.25)'
                }}
              >
                {isSubmittingCancellation ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
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
