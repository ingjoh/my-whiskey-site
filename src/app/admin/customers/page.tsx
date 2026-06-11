'use client';

import { useAuth } from '@/components/AuthProvider';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { 
  Anchor, ArrowLeft, Search, Users, CheckCircle, 
  Clock, AlertCircle, Loader2, DollarSign, RefreshCw, Eye,
  ArrowUpDown, ChevronRight, UserCheck, ShieldAlert
} from 'lucide-react';
import { getAllCustomerProfiles, getAllBookings, CustomerProfile, BookingRecord } from '@/lib/db';

export default function CustomersDashboard() {
  const { user } = useAuth();
  const router = useRouter();

  // Data states
  const [customers, setCustomers] = useState<CustomerProfile[]>([]);
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [waiverFilter, setWaiverFilter] = useState('all');
  const [sortField, setSortField] = useState<'name' | 'ltv' | 'trips' | 'createdAt'>('ltv');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showArchived, setShowArchived] = useState(false);
  
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [customerData, bookingData] = await Promise.all([
        getAllCustomerProfiles(),
        getAllBookings()
      ]);
      setCustomers(customerData);
      setBookings(bookingData);
    } catch (err) {
      console.error('Error fetching CRM data:', err);
      showToast('error', 'Failed to retrieve customer profiles.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  // Helper to format currency
  const formatCost = (val: number) => {
    return `$${Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  // Helper to calculate LTV for a customer
  const calculateCustomerLTV = (email: string) => {
    return bookings
      .filter(b => b.guestEmail.toLowerCase().trim() === email.toLowerCase().trim() && b.status === 'confirmed')
      .reduce((sum, b) => sum + (b.amountPaidToday || 0), 0);
  };

  // Helper to calculate total charters count
  const calculateCustomerTrips = (email: string) => {
    return bookings.filter(b => b.guestEmail.toLowerCase().trim() === email.toLowerCase().trim()).length;
  };

  // Helper to verify waiver status compliance
  const getCustomerWaiverStatus = (email: string) => {
    const customerBookings = bookings.filter(
      b => b.guestEmail.toLowerCase().trim() === email.toLowerCase().trim()
    );
    if (customerBookings.length === 0) return 'no_trips';
    
    // Check if any booking requires a waiver and hasn't been signed
    const pendingWaivers = customerBookings.some(
      b => b.status === 'pending waiver' || b.waiverSigned === false
    );
    
    return pendingWaivers ? 'pending' : 'pass';
  };

  // Handle Sort Toggle
  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc'); // Default to descending
    }
  };

  // Processing client filter and search list
  const processedCustomers = customers.map(c => {
    const ltv = calculateCustomerLTV(c.email);
    const trips = calculateCustomerTrips(c.email);
    const waiverStatus = getCustomerWaiverStatus(c.email);
    const fullName = [c.title, c.firstName, c.middleInitial, c.lastName].filter(Boolean).join(' ') || c.name || 'Unnamed Guest';
    
    return {
      ...c,
      fullName,
      ltv,
      trips,
      waiverStatus
    };
  }).filter(c => {
    if (!showArchived && c.isArchived) return false;
    const matchesSearch = 
      c.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.phone || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesWaiver = 
      waiverFilter === 'all' || 
      (waiverFilter === 'pass' && c.waiverStatus === 'pass') ||
      (waiverFilter === 'pending' && c.waiverStatus === 'pending') ||
      (waiverFilter === 'no_trips' && c.waiverStatus === 'no_trips');

    return matchesSearch && matchesWaiver;
  });

  // Sort logic
  const sortedCustomers = [...processedCustomers].sort((a, b) => {
    let comparison = 0;
    if (sortField === 'name') {
      comparison = a.fullName.localeCompare(b.fullName);
    } else if (sortField === 'ltv') {
      comparison = a.ltv - b.ltv;
    } else if (sortField === 'trips') {
      comparison = a.trips - b.trips;
    } else if (sortField === 'createdAt') {
      comparison = new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
    }
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  // CRM Aggregate stats
  const totalLtv = processedCustomers.reduce((sum, c) => sum + c.ltv, 0);
  const compliantCount = processedCustomers.filter(c => c.waiverStatus === 'pass').length;
  const pendingCount = processedCustomers.filter(c => c.waiverStatus === 'pending').length;

  return (
    <div style={{ minHeight: '100vh', background: '#121416', color: '#F4F1EA', fontFamily: "'Inter', sans-serif" }}>
      {/* Top Navbar */}
      <nav style={{ background: '#1E2124', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 600, fontSize: '1.25rem', color: '#B9783B' }}>
          <Users size={24} /> Customer CRM Command Center
        </div>
        <Link 
          href="/admin" 
          style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#D8C7AF', fontSize: '0.85rem' }}
        >
          <ArrowLeft size={16} /> Back to Main Admin
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
        
        {/* Header Block */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '2.25rem', fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, margin: '0 0 0.5rem 0', letterSpacing: '0.02em' }}>
              CRM Guest Profiles
            </h1>
            <p style={{ color: '#D8C7AF', opacity: 0.8, margin: 0 }}>
              Track guest lifetimes, audit legal release waivers, manage marketing consent, and record private concierge preferences.
            </p>
          </div>
          <button 
            onClick={fetchData}
            style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.02)', padding: '0.5rem 0.85rem', borderRadius: '6px', color: '#D8C7AF', cursor: 'pointer', fontSize: '0.8rem' }}
          >
            <RefreshCw size={14} /> Refresh Directory
          </button>
        </div>

        {/* CRM KPI Indicators */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ background: '#1E2124', border: '1px solid rgba(255,255,255,0.05)', padding: '1.25rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ background: 'rgba(185,120,59,0.1)', color: '#B9783B', padding: '0.75rem', borderRadius: '8px' }}>
              <DollarSign size={24} />
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: '#D8C7AF', opacity: 0.6, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Portfolio Lifetime Value (LTV)</span>
              <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white' }}>{formatCost(totalLtv)}</span>
            </div>
          </div>

          <div style={{ background: '#1E2124', border: '1px solid rgba(255,255,255,0.05)', padding: '1.25rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ background: 'rgba(112, 140, 132, 0.1)', color: '#708C84', padding: '0.75rem', borderRadius: '8px' }}>
              <UserCheck size={24} />
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: '#D8C7AF', opacity: 0.6, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Waiver Compliant Guests</span>
              <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white' }}>{compliantCount} Profiles</span>
            </div>
          </div>

          <div style={{ background: '#1E2124', border: '1px solid rgba(255,255,255,0.05)', padding: '1.25rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '0.75rem', borderRadius: '8px' }}>
              <ShieldAlert size={24} />
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: '#D8C7AF', opacity: 0.6, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pending Waivers / Alerts</span>
              <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white' }}>{pendingCount} Actions</span>
            </div>
          </div>
        </div>

        {/* Filter & Sorting Controls */}
        <div style={{ background: '#1E2124', border: '1px solid rgba(255,255,255,0.06)', padding: '1rem', borderRadius: '8px', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem' }}>
          {/* Search bar */}
          <div style={{ flex: 2, display: 'flex', alignItems: 'center', background: '#121416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', paddingLeft: '0.75rem', minWidth: '240px' }}>
            <Search size={16} style={{ color: '#D8C7AF', opacity: 0.5 }} />
            <input 
              type="text" 
              placeholder="Search by client name, email, phone..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ padding: '0.6rem 0.75rem', background: 'transparent', border: 'none', color: 'white', fontSize: '0.85rem', outline: 'none', flex: 1 }}
            />
          </div>

          {/* Waiver selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', color: '#D8C7AF', opacity: 0.7 }}>Waiver Status:</span>
            <select 
              value={waiverFilter}
              onChange={e => setWaiverFilter(e.target.value)}
              style={{ padding: '0.55rem 0.75rem', background: '#121416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', fontSize: '0.8rem', outline: 'none', cursor: 'pointer' }}
            >
              <option value="all">All Profiles</option>
              <option value="pass">Compliant (Pass)</option>
              <option value="pending">Pending Signature</option>
              <option value="no_trips">No Bookings Yet</option>
            </select>
          </div>

          {/* Archived selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: '#D8C7AF', cursor: 'pointer', userSelect: 'none' }}>
              <input 
                type="checkbox"
                checked={showArchived}
                onChange={e => setShowArchived(e.target.checked)}
                style={{ accentColor: '#B9783B', cursor: 'pointer' }}
              />
              <span>Show Archived</span>
            </label>
          </div>
        </div>

        {/* Data Table */}
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '4rem', flexDirection: 'column', gap: '1rem' }}>
            <Loader2 size={32} className="animate-spin" style={{ color: '#B9783B' }} />
            <span style={{ color: '#D8C7AF' }}>Loading CRM registers...</span>
          </div>
        ) : sortedCustomers.length === 0 ? (
          <div style={{ background: '#1E2124', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '4rem 2rem', textAlign: 'center' }}>
            <AlertCircle size={40} color="#B9783B" style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
            <h4 style={{ color: 'white', fontSize: '1.15rem', margin: '0 0 0.5rem 0' }}>No Profiles Found</h4>
            <p style={{ color: '#D8C7AF', opacity: 0.7, margin: 0, fontSize: '0.85rem' }}>No customer documents match your current filter parameters.</p>
          </div>
        ) : (
          <div style={{ background: '#1E2124', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#121416', borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#D8C7AF', opacity: 0.8, textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '0.85rem 1rem', cursor: 'pointer' }} onClick={() => toggleSort('name')}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      Customer Name {sortField === 'name' && <ArrowUpDown size={12} />}
                    </div>
                  </th>
                  <th style={{ padding: '0.85rem 1rem' }}>Contact Info</th>
                  <th style={{ padding: '0.85rem 1rem', cursor: 'pointer' }} onClick={() => toggleSort('createdAt')}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      Created {sortField === 'createdAt' && <ArrowUpDown size={12} />}
                    </div>
                  </th>
                  <th style={{ padding: '0.85rem 1rem', cursor: 'pointer', textAlign: 'right' }} onClick={() => toggleSort('trips')}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', justifyContent: 'flex-end' }}>
                      Charters {sortField === 'trips' && <ArrowUpDown size={12} />}
                    </div>
                  </th>
                  <th style={{ padding: '0.85rem 1rem', cursor: 'pointer', textAlign: 'right' }} onClick={() => toggleSort('ltv')}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', justifyContent: 'flex-end' }}>
                      Lifetime Value (LTV) {sortField === 'ltv' && <ArrowUpDown size={12} />}
                    </div>
                  </th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>Waiver Audit</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>Details</th>
                </tr>
              </thead>
              <tbody>
                {sortedCustomers.map(c => (
                  <tr 
                    key={c.id} 
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer', transition: 'all 0.15s' }}
                    onClick={() => router.push(`/admin/customers/${c.id}`)}
                    onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.015)'}
                    onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '1rem', fontWeight: 600, color: 'white' }}>
                      {c.fullName}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ color: 'white' }}>{c.email}</div>
                      <div style={{ opacity: 0.6, fontSize: '0.74rem', color: '#D8C7AF' }}>{c.phone || 'No phone recorded'}</div>
                    </td>
                    <td style={{ padding: '1rem', color: '#D8C7AF', opacity: 0.8 }}>
                      {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : 'N/A'}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 500, color: 'white' }}>
                      {c.trips} trips
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right', color: '#B9783B', fontWeight: 700 }}>
                      {formatCost(c.ltv)}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      <span style={{ 
                        fontSize: '0.68rem', 
                        padding: '0.15rem 0.45rem', 
                        borderRadius: '4px', 
                        fontWeight: 700,
                        background: c.waiverStatus === 'pass' 
                          ? 'rgba(112, 140, 132, 0.12)' 
                          : c.waiverStatus === 'pending' 
                            ? 'rgba(239, 68, 68, 0.12)' 
                            : 'rgba(255, 255, 255, 0.06)', 
                        color: c.waiverStatus === 'pass' 
                          ? '#708C84' 
                          : c.waiverStatus === 'pending' 
                            ? '#ef4444' 
                            : '#D8C7AF' 
                      }}>
                        {c.waiverStatus === 'pass' ? 'Compliant' : c.waiverStatus === 'pending' ? 'Pending' : 'No Voyages'}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      <Link 
                        href={`/admin/customers/${c.id}`}
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '4px', padding: '0.35rem 0.55rem', cursor: 'pointer', color: '#D8C7AF', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Eye size={12} /> View Profile
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
