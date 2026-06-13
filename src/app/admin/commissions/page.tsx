'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ChevronLeft, DollarSign, TrendingUp, CheckCircle2, XCircle, Clock, 
  ArrowUpRight, Filter, Calendar, Building, Users, MapPin, Activity, 
  FileText, RefreshCw, Search, Check, AlertCircle, Percent
} from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { 
  getCommissionLedger, 
  updateBookingCommissionStatus, 
  getContentItems,
  BookingRecord,
  ContentItem
} from '@/lib/db';

export default function CommissionsLedgerDashboard() {
  const { user } = useAuth();
  const router = useRouter();

  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [companies, setCompanies] = useState<ContentItem[]>([]);
  const [staffList, setStaffList] = useState<ContentItem[]>([]);
  const [locations, setLocations] = useState<ContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'company' | 'staff' | 'location'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending_charter' | 'accrued' | 'paid' | 'cancelled' | 'unpaid'>('all');

  // Load ledger data
  const loadLedgerData = async () => {
    try {
      setIsLoading(true);
      const [ledgerBookings, allCompanies, allStaff, allLocations] = await Promise.all([
        getCommissionLedger(),
        getContentItems('company'),
        getContentItems('staff'),
        getContentItems('location')
      ]);

      // Sort bookings by trip date descending
      const sortedBookings = [...ledgerBookings].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setBookings(sortedBookings);
      setCompanies(allCompanies);
      setStaffList(allStaff);
      setLocations(allLocations);
    } catch (err) {
      console.error('Failed to load commissions ledger data:', err);
      showToast('error', 'Failed to retrieve commission records.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLedgerData();
  }, []);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const handleStatusUpdate = async (bookingId: string, newStatus: any) => {
    try {
      const success = await updateBookingCommissionStatus(bookingId, newStatus);
      if (success) {
        showToast('success', `Commission status updated to ${newStatus}.`);
        // Update local state
        setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, commissionStatus: newStatus } : b));
      } else {
        showToast('error', 'Failed to update commission status.');
      }
    } catch (err) {
      console.error('Error changing status:', err);
      showToast('error', 'Error occurred while saving status.');
    }
  };

  // Find the entity name for a referrer
  const getReferrerName = (referredById?: string, referredByType?: string) => {
    if (!referredById) return 'Direct / None';
    let entity: ContentItem | undefined;
    if (referredByType === 'company') {
      entity = companies.find(c => c.slug === referredById);
    } else if (referredByType === 'staff') {
      entity = staffList.find(s => s.slug === referredById);
    } else if (referredByType === 'location') {
      entity = locations.find(l => l.slug === referredById);
    }
    return entity ? entity.title : referredById;
  };

  // Render entity icon
  const renderReferrerIcon = (type?: string) => {
    if (type === 'company') return <Building size={14} color="#B9783B" style={{ flexShrink: 0 }} />;
    if (type === 'staff') return <Users size={14} color="#708C84" style={{ flexShrink: 0 }} />;
    if (type === 'location') return <MapPin size={14} color="#5F9EA0" style={{ flexShrink: 0 }} />;
    return <Activity size={14} color="#D8C7AF" style={{ flexShrink: 0 }} />;
  };

  // Calculate Metrics
  const totalAttributed = bookings.length;
  
  // Pending Charter
  const pendingCharterSum = bookings
    .filter(b => b.commissionStatus === 'pending_charter')
    .reduce((sum, b) => sum + (b.commissionAmount || 0), 0);

  // Accrued Ready
  const accruedSum = bookings
    .filter(b => b.commissionStatus === 'accrued' || b.commissionStatus === 'unpaid')
    .reduce((sum, b) => sum + (b.commissionAmount || 0), 0);

  // Paid Settled
  const paidSum = bookings
    .filter(b => b.commissionStatus === 'paid')
    .reduce((sum, b) => sum + (b.commissionAmount || 0), 0);

  const totalCommissionsAccrued = bookings
    .filter(b => b.commissionStatus !== 'cancelled' && b.commissionStatus !== 'n/a')
    .reduce((sum, b) => sum + (b.commissionAmount || 0), 0);

  // Filter Bookings
  const filteredBookings = bookings.filter(b => {
    const nameStr = b.guestName || `${b.guestFirstName || ''} ${b.guestLastName || ''}`;
    // Search filter
    const matchesSearch = 
      nameStr.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.referredById || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      getReferrerName(b.referredById, b.referredByType).toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.utmCampaign || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.utmSource || '').toLowerCase().includes(searchQuery.toLowerCase());

    // Type filter
    const matchesType = typeFilter === 'all' || b.referredByType === typeFilter;

    // Status filter
    let matchesStatus = true;
    if (statusFilter !== 'all') {
      if (statusFilter === 'unpaid') {
        matchesStatus = b.commissionStatus === 'unpaid' || b.commissionStatus === 'accrued' || b.commissionStatus === 'pending_charter';
      } else {
        matchesStatus = b.commissionStatus === statusFilter;
      }
    }

    return matchesSearch && matchesType && matchesStatus;
  });

  // Render Status Badge
  const renderStatusBadge = (status?: string) => {
    switch (status) {
      case 'pending_charter':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 600, background: 'rgba(234, 179, 8, 0.12)', color: '#EAB308', border: '1px solid rgba(234, 179, 8, 0.2)' }}>
            <Clock size={12} /> Pending Charter
          </span>
        );
      case 'accrued':
      case 'unpaid':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 600, background: 'rgba(59, 130, 246, 0.12)', color: '#3B82F6', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
            <AlertCircle size={12} /> Approved (Unpaid)
          </span>
        );
      case 'paid':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 600, background: 'rgba(16, 185, 129, 0.12)', color: '#10B981', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
            <CheckCircle2 size={12} /> Paid
          </span>
        );
      case 'cancelled':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 600, background: 'rgba(239, 68, 68, 0.12)', color: '#EF4444', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            <XCircle size={12} /> Cancelled
          </span>
        );
      default:
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 600, background: 'rgba(255, 255, 255, 0.05)', color: '#D8C7AF', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
            N/A
          </span>
        );
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#121416', color: '#F4F1EA', fontFamily: "'Inter', sans-serif" }}>
      {/* Top Navbar */}
      <nav style={{ background: '#1E2124', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link href="/admin" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: '#D8C7AF', fontSize: '0.9rem' }}>
          <ChevronLeft size={16} /> Back to Dashboard
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 600, fontSize: '1.15rem', color: '#B9783B' }}>
          <DollarSign size={20} /> Commissions & Payouts Ledger
        </div>
      </nav>

      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: toast.type === 'success' ? '#10B981' : '#EF4444',
          color: 'white',
          padding: '1rem 1.5rem',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          zIndex: 9999,
          fontWeight: 500
        }}>
          {toast.message}
        </div>
      )}

      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '3rem 2rem' }}>
        {/* Header Section */}
        <div style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'end', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div>
            <h1 style={{ fontSize: '2.25rem', fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, marginBottom: '0.5rem', letterSpacing: '0.02em' }}>Commissions & Attribution</h1>
            <p style={{ color: '#D8C7AF', opacity: 0.8, margin: 0 }}>Review campaign referrals, monitor booking attributions, and manage commission payouts for crew and marketing partners.</p>
          </div>
          <button 
            onClick={loadLedgerData}
            style={{
              background: '#1E2124',
              color: '#F4F1EA',
              border: '1px solid rgba(255,255,255,0.08)',
              padding: '0.6rem 1rem',
              borderRadius: '6px',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s'
            }}
            onMouseOver={e => e.currentTarget.style.borderColor = 'rgba(185,120,59,0.3)'}
            onMouseOut={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
          >
            <RefreshCw size={16} /> Refresh Data
          </button>
        </div>

        {/* Metrics Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
          <div style={{ background: '#1E2124', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '10px', padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{ background: 'rgba(185,120,59,0.12)', padding: '0.75rem', borderRadius: '8px', color: '#B9783B' }}>
              <TrendingUp size={24} />
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', color: '#D8C7AF', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>All-Time Accrued</span>
              <span style={{ fontSize: '1.6rem', fontWeight: 700, color: 'white', display: 'block', marginTop: '0.2rem' }}>
                ${totalCommissionsAccrued.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div style={{ background: '#1E2124', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '10px', padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{ background: 'rgba(234, 179, 8, 0.12)', padding: '0.75rem', borderRadius: '8px', color: '#EAB308' }}>
              <Clock size={24} />
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', color: '#D8C7AF', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>Pending Voyage</span>
              <span style={{ fontSize: '1.6rem', fontWeight: 700, color: '#EAB308', display: 'block', marginTop: '0.2rem' }}>
                ${pendingCharterSum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div style={{ background: '#1E2124', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '10px', padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{ background: 'rgba(59, 130, 246, 0.12)', padding: '0.75rem', borderRadius: '8px', color: '#3B82F6' }}>
              <AlertCircle size={24} />
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', color: '#D8C7AF', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>Approved (Unpaid)</span>
              <span style={{ fontSize: '1.6rem', fontWeight: 700, color: '#3B82F6', display: 'block', marginTop: '0.2rem' }}>
                ${accruedSum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div style={{ background: '#1E2124', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '10px', padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{ background: 'rgba(16, 185, 129, 0.12)', padding: '0.75rem', borderRadius: '8px', color: '#10B981' }}>
              <CheckCircle2 size={24} />
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', color: '#D8C7AF', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>Settled / Paid</span>
              <span style={{ fontSize: '1.6rem', fontWeight: 700, color: '#10B981', display: 'block', marginTop: '0.2rem' }}>
                ${paidSum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Filter Controls Ribbon */}
        <div style={{ background: '#1E2124', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', flex: 1 }}>
            {/* Search Input */}
            <div style={{ position: 'relative', minWidth: '280px', flex: 1 }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#D8C7AF', opacity: 0.5 }} />
              <input 
                type="text" 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search guest, booking ref, or affiliate..."
                style={{
                  width: '100%',
                  background: '#121416',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '6px',
                  padding: '0.55rem 0.75rem 0.55rem 2.25rem',
                  color: 'white',
                  fontSize: '0.85rem',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
                onFocus={e => e.target.style.borderColor = 'rgba(185,120,59,0.5)'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
              />
            </div>

            {/* Referrer Entity Type Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', color: '#D8C7AF', opacity: 0.6, fontWeight: 600 }}>Affiliate:</span>
              <select 
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value as any)}
                style={{ padding: '0.5rem 0.75rem', background: '#121416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', fontSize: '0.82rem', outline: 'none', cursor: 'pointer' }}
              >
                <option value="all">All Types</option>
                <option value="company">Brokers & Agencies (Companies)</option>
                <option value="staff">Captains & Crew (Staff)</option>
                <option value="location">Home Ports & Stops (Locations)</option>
              </select>
            </div>

            {/* Status Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', color: '#D8C7AF', opacity: 0.6, fontWeight: 600 }}>Status:</span>
              <select 
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as any)}
                style={{ padding: '0.5rem 0.75rem', background: '#121416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', fontSize: '0.82rem', outline: 'none', cursor: 'pointer' }}
              >
                <option value="all">All Statuses</option>
                <option value="pending_charter">Pending Voyage</option>
                <option value="unpaid">Approved (Unpaid)</option>
                <option value="paid">Paid</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div style={{ fontSize: '0.8rem', color: '#D8C7AF', opacity: 0.7 }}>
            Found <strong>{filteredBookings.length}</strong> matching entries
          </div>
        </div>

        {/* Ledger Table */}
        <div style={{ background: '#1E2124', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', overflow: 'hidden' }}>
          {isLoading ? (
            <div style={{ padding: '4rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', color: '#D8C7AF' }}>
              <RefreshCw size={36} className="animate-spin" style={{ color: '#B9783B' }} />
              <span>Loading ledger documents...</span>
            </div>
          ) : filteredBookings.length === 0 ? (
            <div style={{ padding: '4rem', color: '#D8C7AF', opacity: 0.7, textAlign: 'center' }}>
              <AlertCircle size={36} style={{ color: '#B9783B', margin: '0 auto 1rem auto' }} />
              <div style={{ fontWeight: 600, fontSize: '1rem', color: 'white' }}>No Commission Records Found</div>
              <p style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>Adjust your filters or generate a QR referral booking to populate the list.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.1)' }}>
                    <th style={{ padding: '1rem 1.25rem', color: '#D8C7AF', fontWeight: 600 }}>Booking / Guest</th>
                    <th style={{ padding: '1rem 1.25rem', color: '#D8C7AF', fontWeight: 600 }}>Date</th>
                    <th style={{ padding: '1rem 1.25rem', color: '#D8C7AF', fontWeight: 600 }}>Subtotal</th>
                    <th style={{ padding: '1rem 1.25rem', color: '#D8C7AF', fontWeight: 600 }}>Affiliate Referrer</th>
                    <th style={{ padding: '1rem 1.25rem', color: '#D8C7AF', fontWeight: 600 }}>Campaign / UTM</th>
                    <th style={{ padding: '1rem 1.25rem', color: '#D8C7AF', fontWeight: 600 }}>Rate & Fee</th>
                    <th style={{ padding: '1rem 1.25rem', color: '#D8C7AF', fontWeight: 600 }}>Status</th>
                    <th style={{ padding: '1rem 1.25rem', color: '#D8C7AF', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBookings.map((b) => {
                    const guestName = b.guestName || `${b.guestFirstName || ''} ${b.guestLastName || ''}`;
                    const refName = getReferrerName(b.referredById, b.referredByType);
                    return (
                      <tr 
                        key={b.id} 
                        style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background-color 0.15s' }}
                        onMouseOver={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.01)'}
                        onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        {/* Booking & Guest Info */}
                        <td style={{ padding: '1rem 1.25rem' }}>
                          <div style={{ fontWeight: 600, color: 'white' }}>{guestName}</div>
                          <div style={{ fontSize: '0.72rem', opacity: 0.6, marginTop: '0.15rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <span style={{ color: '#B9783B' }}>{b.id}</span>
                            <span style={{ opacity: 0.5 }}>•</span>
                            <span>{b.experienceTitle}</span>
                          </div>
                        </td>

                        {/* Date */}
                        <td style={{ padding: '1rem 1.25rem', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#F4F1EA' }}>
                            <Calendar size={13} style={{ opacity: 0.6 }} />
                            {b.date}
                          </div>
                        </td>

                        {/* Subtotal */}
                        <td style={{ padding: '1rem 1.25rem' }}>
                          <div style={{ color: '#D8C7AF' }}>
                            ${Number(b.subtotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        </td>

                        {/* Referrer */}
                        <td style={{ padding: '1rem 1.25rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {renderReferrerIcon(b.referredByType)}
                            <div>
                              <div style={{ fontWeight: 550, color: '#F4F1EA' }}>{refName}</div>
                              {b.referredById && (
                                <div style={{ fontSize: '0.68rem', opacity: 0.5, marginTop: '0.1rem' }}>
                                  slug: {b.referredById}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* UTM attribution tags */}
                        <td style={{ padding: '1rem 1.25rem' }}>
                          {b.utmCampaign || b.utmSource || b.utmMedium ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                              {b.utmCampaign && (
                                <span style={{ display: 'inline-block', fontSize: '0.65rem', background: '#121416', padding: '0.15rem 0.35rem', borderRadius: '3px', border: '1px solid rgba(255,255,255,0.05)', color: '#D8C7AF', whiteSpace: 'nowrap', width: 'fit-content' }}>
                                  campaign: <strong>{b.utmCampaign}</strong>
                                </span>
                              )}
                              {b.utmSource && (
                                <span style={{ display: 'inline-block', fontSize: '0.65rem', background: '#121416', padding: '0.15rem 0.35rem', borderRadius: '3px', border: '1px solid rgba(255,255,255,0.05)', color: '#D8C7AF', opacity: 0.7, whiteSpace: 'nowrap', width: 'fit-content' }}>
                                  src: {b.utmSource} {b.utmMedium ? `(${b.utmMedium})` : ''}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.72rem', opacity: 0.4, fontStyle: 'italic' }}>Direct QR / No UTM</span>
                          )}
                        </td>

                        {/* Rate & Fee */}
                        <td style={{ padding: '1rem 1.25rem' }}>
                          <div style={{ fontWeight: 600, color: '#B9783B' }}>
                            ${Number(b.commissionAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                          <div style={{ fontSize: '0.68rem', opacity: 0.6, marginTop: '0.15rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                            <Percent size={10} />
                            <span>{b.commissionRate || 0}% rate</span>
                          </div>
                        </td>

                        {/* Status Badge */}
                        <td style={{ padding: '1rem 1.25rem' }}>
                          {renderStatusBadge(b.commissionStatus)}
                        </td>

                        {/* Actions drop-down controls */}
                        <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                            {b.commissionStatus === 'pending_charter' && (
                              <>
                                <button 
                                  title="Approve / Accrue Commission"
                                  onClick={() => handleStatusUpdate(b.id, 'accrued')}
                                  style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3B82F6', border: '1px solid rgba(59, 130, 246, 0.3)', padding: '0.35rem 0.6rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                                >
                                  <Check size={12} /> Approve
                                </button>
                                <button 
                                  title="Cancel Commission"
                                  onClick={() => handleStatusUpdate(b.id, 'cancelled')}
                                  style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#EF4444', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '0.35rem 0.6rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}
                                >
                                  Cancel
                                </button>
                              </>
                            )}
                            
                            {(b.commissionStatus === 'accrued' || b.commissionStatus === 'unpaid') && (
                              <>
                                <button 
                                  title="Settle / Mark as Paid"
                                  onClick={() => handleStatusUpdate(b.id, 'paid')}
                                  style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10B981', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '0.35rem 0.6rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                                >
                                  <CheckCircle2 size={12} /> Settle Paid
                                </button>
                                <button 
                                  title="Cancel Commission"
                                  onClick={() => handleStatusUpdate(b.id, 'cancelled')}
                                  style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#EF4444', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '0.35rem 0.6rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}
                                >
                                  Cancel
                                </button>
                              </>
                            )}

                            {b.commissionStatus === 'paid' && (
                              <button 
                                title="Revert to Unpaid/Accrued"
                                onClick={() => handleStatusUpdate(b.id, 'accrued')}
                                style={{ background: '#121416', color: '#D8C7AF', border: '1px solid rgba(255,255,255,0.08)', padding: '0.35rem 0.6rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.72rem' }}
                              >
                                Revert to Unpaid
                              </button>
                            )}

                            {b.commissionStatus === 'cancelled' && (
                              <button 
                                title="Re-enable / Mark Pending"
                                onClick={() => handleStatusUpdate(b.id, 'pending_charter')}
                                style={{ background: '#121416', color: '#D8C7AF', border: '1px solid rgba(255,255,255,0.08)', padding: '0.35rem 0.6rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.72rem' }}
                              >
                                Re-enable (Pending)
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
