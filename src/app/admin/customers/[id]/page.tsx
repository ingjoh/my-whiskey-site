'use client';

import { useAuth } from '@/components/AuthProvider';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { use, useEffect, useState } from 'react';
import { 
  ArrowLeft, Users, CheckCircle, Clock, AlertCircle, Loader2, 
  DollarSign, RefreshCw, Calendar, MapPin, ShieldAlert, FileText, 
  Check, Plus, Send, Smartphone, Laptop, Mail, Phone, Info
} from 'lucide-react';
import { 
  getCustomerProfileById, getAllBookings, getAllWaiverSignatures, 
  addCustomerPrivateNote, CustomerProfile, BookingRecord, WaiverSignature 
} from '@/lib/db';

export default function CustomerProfileDetailView({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const router = useRouter();

  // Data states
  const [customer, setCustomer] = useState<CustomerProfile | null>(null);
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [waivers, setWaivers] = useState<WaiverSignature[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Note form state
  const [noteText, setNoteText] = useState('');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchCustomerDetails = async () => {
    setIsLoading(true);
    try {
      const customerData = await getCustomerProfileById(id);
      if (!customerData) {
        showToast('error', 'Customer profile not found');
        router.push('/admin/customers');
        return;
      }
      setCustomer(customerData);

      const [allBookings, allWaivers] = await Promise.all([
        getAllBookings(),
        getAllWaiverSignatures()
      ]);

      // Filter bookings matching this customer's email
      const customerBookings = allBookings.filter(
        b => b.guestEmail.toLowerCase().trim() === customerData.email.toLowerCase().trim()
      );
      setBookings(customerBookings);

      // Filter waivers matching this customer's email or booking IDs
      const bookingIds = customerBookings.map(b => b.id);
      const customerWaivers = allWaivers.filter(
        w => w.guestEmail.toLowerCase().trim() === customerData.email.toLowerCase().trim() ||
             bookingIds.includes(w.bookingId)
      );
      setWaivers(customerWaivers);
    } catch (err) {
      console.error('Error fetching customer details:', err);
      showToast('error', 'Error fetching customer data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomerDetails();
  }, [id]);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim() || !customer) return;
    setIsSubmittingNote(true);

    try {
      const author = user?.email || 'Staff Admin';
      const ok = await addCustomerPrivateNote(customer.email, noteText.trim(), author);
      if (ok) {
        showToast('success', 'Private staff note added successfully.');
        setNoteText('');
        // Reload details to sync notes list
        const updatedCustomer = await getCustomerProfileById(id);
        if (updatedCustomer) {
          setCustomer(updatedCustomer);
        }
      } else {
        showToast('error', 'Failed to save staff note.');
      }
    } catch (err) {
      console.error(err);
      showToast('error', 'Error occurred while saving note.');
    } finally {
      setIsSubmittingNote(false);
    }
  };

  // Helper to format currency
  const formatCost = (val: number) => {
    return `$${Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', background: '#121416', color: '#F4F1EA', display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: '1rem', fontFamily: "'Inter', sans-serif" }}>
        <Loader2 size={36} className="animate-spin" style={{ color: '#B9783B' }} />
        <span style={{ color: '#D8C7AF' }}>Loading customer profile profile...</span>
      </div>
    );
  }

  if (!customer) {
    return (
      <div style={{ minHeight: '100vh', background: '#121416', color: '#F4F1EA', display: 'flex', justifyContent: 'center', alignItems: 'center', fontFamily: "'Inter', sans-serif" }}>
        <div style={{ textAlign: 'center' }}>
          <AlertCircle size={48} color="#B9783B" style={{ margin: '0 auto 1rem' }} />
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Profile Not Found</h2>
          <Link href="/admin/customers" style={{ color: '#B9783B', textDecoration: 'underline' }}>Back to Directory</Link>
        </div>
      </div>
    );
  }

  // Calculated totals
  const confirmedBookings = bookings.filter(b => b.status === 'confirmed');
  const ltv = confirmedBookings.reduce((sum, b) => sum + (b.amountPaidToday || 0), 0);
  const totalTrips = bookings.length;
  const compliantWaiver = bookings.length > 0 && !bookings.some(b => b.status === 'pending waiver' || b.waiverSigned === false);
  const fullName = [customer.title, customer.firstName, customer.middleInitial, customer.lastName].filter(Boolean).join(' ') || customer.name || 'Unnamed Guest';

  return (
    <div style={{ minHeight: '100vh', background: '#121416', color: '#F4F1EA', fontFamily: "'Inter', sans-serif" }}>
      {/* Top Navbar */}
      <nav style={{ background: '#1E2124', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 600, fontSize: '1.25rem', color: '#B9783B' }}>
          <Users size={24} /> Client Relation profile
        </div>
        <Link 
          href="/admin/customers" 
          style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#D8C7AF', fontSize: '0.85rem' }}
        >
          <ArrowLeft size={16} /> Back to CRM Directory
        </Link>
      </nav>

      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: toast.type === 'success' ? '#708C84' : '#EF4444',
          color: 'white',
          padding: '1rem 1.5rem',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          zIndex: 9999,
          fontWeight: 600
        }}>
          {toast.message}
        </div>
      )}

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '2.5rem 2rem' }}>
        
        {/* Profile Header Card */}
        <div style={{ background: '#1E2124', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '2rem', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '2rem', marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'linear-gradient(135deg, #B9783B, #8C5523)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '1.75rem', fontWeight: 700, textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
              {fullName.charAt(0) || 'U'}
            </div>
            <div>
              <h1 style={{ fontSize: '1.85rem', fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, margin: '0 0 0.25rem 0', letterSpacing: '0.02em', color: 'white' }}>
                {fullName}
              </h1>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', fontSize: '0.75rem', color: '#D8C7AF', opacity: 0.8 }}>
                <span>Verified Member since {customer.createdAt ? new Date(customer.createdAt).toLocaleDateString() : 'N/A'}</span>
                <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#B9783B' }}></span>
                <span style={{ 
                  color: compliantWaiver ? '#708C84' : '#ef4444', 
                  fontWeight: 700 
                }}>
                  {compliantWaiver ? 'Waiver Compliant' : 'Pending Waiver Signature'}
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '2rem', background: '#121416', padding: '1rem 1.5rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
            <div>
              <span style={{ fontSize: '0.7rem', color: '#D8C7AF', opacity: 0.6, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Lifetime Spending (LTV)</span>
              <strong style={{ fontSize: '1.5rem', color: '#B9783B', fontWeight: 700 }}>{formatCost(ltv)}</strong>
            </div>
            <div style={{ borderLeft: '1px solid rgba(255,255,255,0.08)', paddingLeft: '2rem' }}>
              <span style={{ fontSize: '0.7rem', color: '#D8C7AF', opacity: 0.6, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Charter Trips</span>
              <strong style={{ fontSize: '1.5rem', color: 'white', fontWeight: 700 }}>{totalTrips} Voyages</strong>
            </div>
          </div>
        </div>

        {/* Two-Column Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem', alignItems: 'start' }}>
          
          {/* LEFT COLUMN: Contact & Profile Specs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ background: '#1E2124', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '1.25rem' }}>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#B9783B', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 1rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
                Contact & Account Details
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem', fontSize: '0.8rem' }}>
                <div>
                  <span style={{ opacity: 0.5, display: 'block', fontSize: '0.72rem', marginBottom: '0.2rem' }}>Email Address</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'white', fontWeight: 500 }}>
                    <Mail size={14} style={{ color: '#B9783B' }} /> {customer.email}
                  </div>
                </div>

                <div>
                  <span style={{ opacity: 0.5, display: 'block', fontSize: '0.72rem', marginBottom: '0.2rem' }}>Phone Number</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'white', fontWeight: 500 }}>
                    <Phone size={14} style={{ color: '#B9783B' }} /> {customer.phone || 'None provided'}
                  </div>
                </div>

                <div>
                  <span style={{ opacity: 0.5, display: 'block', fontSize: '0.72rem', marginBottom: '0.2rem' }}>Primary Physical Address</span>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.45rem', color: 'white', lineHeight: '1.4' }}>
                    <MapPin size={14} style={{ color: '#B9783B', marginTop: '0.15rem' }} /> 
                    <span>{customer.address || 'No billing address saved yet.'}</span>
                  </div>
                </div>

                <div style={{ borderTop: '1px dashed rgba(255,255,255,0.05)', paddingTop: '0.75rem', marginTop: '0.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ opacity: 0.6 }}>Marketing Subscribed:</span>
                    <span style={{ 
                      fontSize: '0.68rem', 
                      padding: '0.15rem 0.45rem', 
                      borderRadius: '4px', 
                      fontWeight: 700,
                      background: customer.marketingOptIn ? 'rgba(112, 140, 132, 0.12)' : 'rgba(255,255,255,0.06)', 
                      color: customer.marketingOptIn ? '#708C84' : '#D8C7AF' 
                    }}>
                      {customer.marketingOptIn ? 'Opted In' : 'No Consent'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div style={{ background: '#1E2124', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '1.25rem' }}>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#B9783B', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 1rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
                Concierge Shortcuts
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <a 
                  href={`mailto:${customer.email}`}
                  style={{ textDecoration: 'none', display: 'block', textAlign: 'center', background: '#B9783B', color: 'white', padding: '0.55rem', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 600, transition: 'all 0.2s' }}
                  onMouseOver={e => e.currentTarget.style.background = '#a2642e'}
                  onMouseOut={e => e.currentTarget.style.background = '#B9783B'}
                >
                  Send Direct Email
                </a>
                {customer.phone && (
                  <a 
                    href={`tel:${customer.phone}`}
                    style={{ textDecoration: 'none', display: 'block', textAlign: 'center', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#D8C7AF', padding: '0.55rem', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 600, transition: 'all 0.2s' }}
                    onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                    onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                  >
                    Call Phone Line
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Chronology logs, Waiver register, and Staff notes */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            {/* 1. Trip Chronology / History Timeline */}
            <div style={{ background: '#1E2124', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '1.5rem' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 1.25rem 0' }}>
                <Calendar size={18} style={{ color: '#B9783B' }} /> Voyage History & Schedule
              </h3>
              
              {bookings.length === 0 ? (
                <div style={{ padding: '2rem 1rem', textAlign: 'center', background: '#121416', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.03)' }}>
                  <AlertCircle size={32} color="#D8C7AF" style={{ opacity: 0.4, margin: '0 auto 0.75rem' }} />
                  <span style={{ fontSize: '0.78rem', color: '#D8C7AF', opacity: 0.6 }}>No bookings logged for this account yet.</span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {bookings.map(b => (
                    <div 
                      key={b.id} 
                      style={{ 
                        background: '#121416', 
                        border: '1px solid rgba(255,255,255,0.04)', 
                        borderRadius: '8px', 
                        padding: '1rem', 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        gap: '1rem'
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontWeight: 700, color: 'white', fontSize: '0.85rem' }}>BK-{b.id}</span>
                          <span style={{ 
                            fontSize: '0.66rem', 
                            padding: '0.1rem 0.35rem', 
                            borderRadius: '4px',
                            background: b.status === 'confirmed' ? 'rgba(112, 140, 132, 0.12)' : 'rgba(255, 255, 255, 0.06)',
                            color: b.status === 'confirmed' ? '#708C84' : '#D8C7AF'
                          }}>
                            {b.status}
                          </span>
                        </div>
                        <span style={{ fontSize: '0.78rem', color: 'white' }}>{b.experienceTitle} ({b.vesselTitle})</span>
                        <span style={{ fontSize: '0.72rem', color: '#D8C7AF', opacity: 0.6 }}>Date: {b.date} at {b.startTime} • Capt. {b.captainTitle.replace('Captain ', '')}</span>
                      </div>
                      
                      <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.35rem' }}>
                        <span style={{ color: '#B9783B', fontWeight: 700, fontSize: '0.9rem' }}>{formatCost(b.amountPaidToday)}</span>
                        <Link 
                          href="/admin/bookings" 
                          style={{ textDecoration: 'none', color: '#D8C7AF', opacity: 0.7, fontSize: '0.74rem', borderBottom: '1px solid rgba(216,199,175,0.3)', paddingBottom: '1px' }}
                        >
                          Booking Details
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 2. Waiver compliance trail */}
            <div style={{ background: '#1E2124', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '1.5rem' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 1.25rem 0' }}>
                <FileText size={18} style={{ color: '#B9783B' }} /> Liability Waiver Audit Records
              </h3>

              {waivers.length === 0 ? (
                <div style={{ padding: '2rem 1rem', textAlign: 'center', background: '#121416', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.03)' }}>
                  <ShieldAlert size={32} color="#ef4444" style={{ opacity: 0.6, margin: '0 auto 0.75rem' }} />
                  <span style={{ fontSize: '0.78rem', color: '#ef4444', fontWeight: 500 }}>No digital waiver signatures stored for this email.</span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {waivers.map(w => (
                    <div 
                      key={w.id} 
                      style={{ 
                        background: '#121416', 
                        border: '1px solid rgba(255,255,255,0.04)', 
                        borderRadius: '8px', 
                        padding: '1.25rem',
                        fontSize: '0.78rem'
                      }}
                    >
                      {/* Waiver title bar */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.6rem', marginBottom: '0.65rem' }}>
                        <strong style={{ color: 'white', fontSize: '0.82rem' }}>Waiver document: {w.id}</strong>
                        <span style={{ color: '#708C84', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                          <CheckCircle size={12} /> SIGNED
                        </span>
                      </div>

                      {/* Details breakdown */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', color: '#D8C7AF', opacity: 0.9 }}>
                        <div>
                          <span style={{ opacity: 0.5, display: 'block', fontSize: '0.66rem' }}>Signer Name:</span>
                          <span style={{ color: 'white', fontWeight: 600 }}>{w.name} (Self)</span>
                        </div>
                        <div>
                          <span style={{ opacity: 0.5, display: 'block', fontSize: '0.66rem' }}>Signed Timestamp:</span>
                          <span style={{ color: 'white' }}>{new Date(w.signedAt).toLocaleString()}</span>
                        </div>
                        <div>
                          <span style={{ opacity: 0.5, display: 'block', fontSize: '0.66rem' }}>Authorized Address:</span>
                          <span style={{ color: 'white' }}>{w.address}</span>
                        </div>
                        <div>
                          <span style={{ opacity: 0.5, display: 'block', fontSize: '0.66rem' }}>Network Audit Metadata:</span>
                          <span style={{ color: 'white', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            {w.ip} ({w.city || 'Localhost'}, {w.region || 'US'})
                          </span>
                        </div>
                      </div>

                      {/* Device metadata audit */}
                      <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '6px', padding: '0.5rem 0.75rem', marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.7rem', color: '#D8C7AF' }}>
                        {w.device === 'desktop' ? <Laptop size={14} style={{ color: '#B9783B' }} /> : <Smartphone size={14} style={{ color: '#B9783B' }} />}
                        <span>
                          <strong>Platform Audit:</strong> {w.browser || 'Unknown Browser'} on {w.os || 'Unknown OS'} ({w.device || 'Desktop'}) • Screen: {w.screenResolution || 'N/A'} • Lang: {w.language || 'en'}
                        </span>
                      </div>

                      {/* Dependent passengers linked */}
                      {w.passengers && w.passengers.length > 0 && (
                        <div style={{ marginTop: '0.75rem', borderTop: '1px dashed rgba(255,255,255,0.05)', paddingTop: '0.65rem' }}>
                          <span style={{ opacity: 0.6, fontSize: '0.7rem', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>Covered Co-Passengers & Dependents</span>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
                            {w.passengers.map((p, idx) => (
                              <span 
                                key={idx} 
                                style={{ 
                                  fontSize: '0.68rem', 
                                  padding: '0.15rem 0.45rem', 
                                  borderRadius: '4px',
                                  background: p.addedToMainWaiver ? 'rgba(185, 120, 59, 0.08)' : 'rgba(255,255,255,0.04)',
                                  border: '1px solid rgba(255,255,255,0.06)',
                                  color: p.addedToMainWaiver ? '#B9783B' : '#D8C7AF',
                                  fontWeight: p.addedToMainWaiver ? 700 : 500
                                }}
                              >
                                {p.name} ({p.relationship}) • {p.addedToMainWaiver ? 'Signed on Primary' : 'Requires Guest Sign'}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 3. Internal Private Staff Logs (CRM notes) */}
            <div style={{ background: '#1E2124', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '1.5rem' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 1.25rem 0' }}>
                <Info size={18} style={{ color: '#B9783B' }} /> Private Concierge & Staff Notes
              </h3>

              {/* Note timeline log list */}
              {(!customer.privateNotes || customer.privateNotes.length === 0) ? (
                <div style={{ padding: '1.5rem 1rem', textAlign: 'center', background: '#121416', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.03)', marginBottom: '1.25rem' }}>
                  <span style={{ fontSize: '0.74rem', color: '#D8C7AF', opacity: 0.5 }}>No private concierge logs recorded for this guest profile.</span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '1.5rem' }}>
                  {customer.privateNotes.map((note: any, idx: number) => (
                    <div key={idx} style={{ background: '#121416', border: '1px solid rgba(255,255,255,0.03)', padding: '0.85rem 1rem', borderRadius: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.68rem', opacity: 0.6, color: '#D8C7AF', marginBottom: '0.35rem' }}>
                        <span>Logged by <strong>{note.author}</strong></span>
                        <span>{new Date(note.date).toLocaleString()}</span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.78rem', color: 'white', lineHeight: '1.45', fontStyle: 'italic' }}>
                        "{note.note}"
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Note form */}
              <form onSubmit={handleAddNote} style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                <textarea
                  rows={3}
                  placeholder="Record food preferences, allergies, special requests, yacht setup details..."
                  value={noteText}
                  onChange={e => setNoteText(e.target.value)}
                  style={{
                    padding: '0.65rem 0.75rem',
                    background: '#121416',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '6px',
                    color: 'white',
                    fontSize: '0.78rem',
                    outline: 'none',
                    resize: 'none'
                  }}
                  required
                />
                
                <button
                  type="submit"
                  disabled={isSubmittingNote}
                  style={{
                    alignSelf: 'flex-end',
                    background: '#B9783B',
                    color: 'white',
                    border: 'none',
                    padding: '0.55rem 1rem',
                    borderRadius: '6px',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: isSubmittingNote ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}
                >
                  {isSubmittingNote ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                  Save Internal Note
                </button>
              </form>
            </div>

          </div>
        </div>

      </main>
    </div>
  );
}
