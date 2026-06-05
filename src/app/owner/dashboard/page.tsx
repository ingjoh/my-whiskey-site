'use client';

import { useAuth } from '@/components/AuthProvider';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { 
  Anchor, ArrowLeft, Search, Calendar, Ship, Users, CheckCircle, 
  Clock, AlertCircle, Loader2, DollarSign, X, RefreshCw, Eye,
  ArrowRight, FileText, Settings, CreditCard, ChevronRight
} from 'lucide-react';
import { 
  getContentItems, getAllBookings, ContentItem, BookingRecord 
} from '@/lib/db';

export default function OwnerDashboard() {
  const { user } = useAuth();
  const router = useRouter();

  // Data states
  const [owners, setOwners] = useState<ContentItem[]>([]);
  const [selectedOwner, setSelectedOwner] = useState<ContentItem | null>(null);
  const [assets, setAssets] = useState<ContentItem[]>([]);
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);

  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [vesselFilter, setVesselFilter] = useState('all');

  // Chart states & helpers
  const [chartDateType, setChartDateType] = useState<'booking' | 'excursion' | 'payment'>('excursion');
  const [hoveredBar, setHoveredBar] = useState<any | null>(null);
  const [timeScope, setTimeScope] = useState<string>('current-period');
  const [customStartDate, setCustomStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [customEndDate, setCustomEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  const today = new Date();

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [allOwners, allAssets, allBookings] = await Promise.all([
        getContentItems('owner'),
        getContentItems('asset'),
        getAllBookings()
      ]);

      setOwners(allOwners);
      setBookings(allBookings);

      // Check if logged-in user matches any owner email
      const matchedOwner = allOwners.find(
        o => o.email?.toLowerCase().trim() === user?.email?.toLowerCase().trim()
      );

      if (matchedOwner) {
        setSelectedOwner(matchedOwner);
        // Filter assets belonging to this owner
        setAssets(allAssets.filter(a => a.ownerId === matchedOwner.id));
      } else if (allOwners.length > 0) {
        // Fallback to first owner or allow switching if admin
        setSelectedOwner(allOwners[0]);
        setAssets(allAssets.filter(a => a.ownerId === allOwners[0].id));
      } else {
        setAssets([]);
      }
    } catch (err) {
      console.error('Error loading owner dashboard data:', err);
      showToast('error', 'Failed to retrieve owner record.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleOwnerChange = async (ownerId: string) => {
    const owner = owners.find(o => o.id === ownerId);
    if (!owner) return;
    
    setSelectedOwner(owner);
    setIsLoading(true);
    try {
      const allAssets = await getContentItems('asset');
      setAssets(allAssets.filter(a => a.ownerId === owner.id));
    } catch (err) {
      console.error(err);
      showToast('error', 'Failed to load assets for selected owner.');
    } finally {
      setIsLoading(false);
    }
  };

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  // Helper to format currency
  const formatCost = (val: number) => {
    return `$${Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  // Filter bookings that belong to this owner's assets
  const ownerAssetSlugs = assets.map(a => a.slug);
  const ownerBookings = bookings.filter(b => ownerAssetSlugs.includes(b.vesselSlug));

  // Financial splits calculations
  const revSharePct = selectedOwner?.revenueShare || 70; // default to 70% if unspecified

  const getOwnerRevenueSplits = (b: any) => {
    const totalOwnerShare = (b.subtotal || 0) * (revSharePct / 100);
    if (b.paymentPlan === 'full') {
      return {
        ownerPaid: totalOwnerShare,
        ownerDue: 0,
        total: totalOwnerShare
      };
    } else {
      // deposit plan: 20% paid today, 80% due later
      return {
        ownerPaid: totalOwnerShare * 0.20,
        ownerDue: totalOwnerShare * 0.80,
        total: totalOwnerShare
      };
    }
  };

  // Date and timeframe helper functions
  const getDueDateString = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      d.setDate(d.getDate() - 7);
      return d.toISOString().split('T')[0];
    } catch {
      return dateStr;
    }
  };

  const getNormalizedDate = (createdAtStr: string) => {
    if (!createdAtStr) return 'N/A';
    try {
      return new Date(createdAtStr).toISOString().split('T')[0];
    } catch {
      return 'N/A';
    }
  };

  const getPaymentDueDate = (booking: any) => {
    if (booking.paymentPlan === 'full') return 'Paid';
    if (!booking.date) return 'N/A';
    try {
      const dateObj = new Date(booking.date);
      dateObj.setDate(dateObj.getDate() - 7);
      return dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (err) {
      return 'N/A';
    }
  };

  const getSundayOfWeek = (dateStr: string) => {
    try {
      const d = new Date(dateStr + 'T00:00:00');
      const day = d.getDay();
      d.setDate(d.getDate() - day);
      return d.toISOString().split('T')[0];
    } catch {
      return dateStr;
    }
  };

  const getFirstDayOfMonth = (dateStr: string) => {
    try {
      return dateStr.substring(0, 7) + '-01';
    } catch {
      return dateStr;
    }
  };

  // Calculate timeframe bounds and interval type based on selection
  const getActiveRangeAndGrouping = () => {
    const today = new Date();
    let start = new Date();
    let end = new Date();
    let grouping: 'day' | 'week' | 'month' = 'day';

    switch (timeScope) {
      case 'this-month':
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        grouping = 'day';
        break;
      case 'last-30-days':
        start = new Date(today);
        start.setDate(today.getDate() - 29);
        end = new Date(today);
        grouping = 'day';
        break;
      case 'next-month':
        start = new Date(today.getFullYear(), today.getMonth() + 1, 1);
        end = new Date(today.getFullYear(), today.getMonth() + 2, 0);
        grouping = 'day';
        break;
      case 'next-30-days':
        start = new Date(today);
        end = new Date(today);
        end.setDate(today.getDate() + 29);
        grouping = 'day';
        break;
      case 'next-90-days':
        start = new Date(today);
        end = new Date(today);
        end.setDate(today.getDate() + 89);
        grouping = 'week';
        break;
      case 'current-period':
        start = new Date(today);
        start.setDate(today.getDate() - 30);
        end = new Date(today);
        end.setDate(today.getDate() + 60);
        grouping = 'week';
        break;
      case 'this-quarter': {
        const quarter = Math.floor(today.getMonth() / 3);
        start = new Date(today.getFullYear(), quarter * 3, 1);
        end = new Date(today.getFullYear(), (quarter + 1) * 3, 0);
        grouping = 'week';
        break;
      }
      case 'this-year':
        start = new Date(today.getFullYear(), 0, 1);
        end = new Date(today.getFullYear(), 11, 31);
        grouping = 'month';
        break;
      case 'last-12-months':
        start = new Date(today.getFullYear() - 1, today.getMonth() + 1, 1);
        end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        grouping = 'month';
        break;
      case 'all-time': {
        if (ownerBookings.length > 0) {
          const dates = ownerBookings
            .map(b => b.date || b.createdAt)
            .filter(Boolean)
            .map(dStr => new Date(dStr));
          if (dates.length > 0) {
            const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
            const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
            start = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate());
            end = new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate());
          }
        } else {
          start = new Date(today.getFullYear(), today.getMonth(), 1);
          end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        }
        
        const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        if (daysDiff <= 31) grouping = 'day';
        else if (daysDiff <= 180) grouping = 'week';
        else grouping = 'month';
        break;
      }
      case 'custom':
        if (customStartDate) start = new Date(customStartDate + 'T00:00:00');
        if (customEndDate) end = new Date(customEndDate + 'T23:59:59');
        
        const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        if (daysDiff <= 31) grouping = 'day';
        else if (daysDiff <= 180) grouping = 'week';
        else grouping = 'month';
        break;
    }

    return { start, end, grouping };
  };

  // Generate continuous date intervals
  const generateIntervals = (start: Date, end: Date, grouping: 'day' | 'week' | 'month') => {
    const intervals: string[] = [];
    const current = new Date(start);

    if (grouping === 'day') {
      while (current <= end) {
        intervals.push(current.toISOString().split('T')[0]);
        current.setDate(current.getDate() + 1);
      }
    } else if (grouping === 'week') {
      const startSunday = new Date(start);
      startSunday.setDate(startSunday.getDate() - startSunday.getDay());
      const temp = new Date(startSunday);
      
      while (temp <= end || (temp.getTime() - end.getTime()) < 7 * 24 * 60 * 60 * 1000) {
        intervals.push(temp.toISOString().split('T')[0]);
        temp.setDate(temp.getDate() + 7);
      }
    } else if (grouping === 'month') {
      const temp = new Date(start.getFullYear(), start.getMonth(), 1);
      const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);
      
      while (temp <= endMonth) {
        intervals.push(temp.toISOString().split('T')[0]);
        temp.setMonth(temp.getMonth() + 1);
      }
    }

    return intervals.slice(0, 60); // Safety cap
  };

  // Nice round tick intervals algorithm for dynamic scale
  const getNiceTicks = (maxVal: number) => {
    const minVal = 100;
    const testMax = maxVal < minVal ? minVal : maxVal;
    
    const log = Math.log10(testMax);
    const power = Math.floor(log);
    const ratio = testMax / Math.pow(10, power);
    
    let step: number;
    if (ratio <= 1.5) step = 0.2 * Math.pow(10, power);
    else if (ratio <= 3) step = 0.5 * Math.pow(10, power);
    else if (ratio <= 6) step = 1.0 * Math.pow(10, power);
    else step = 2.0 * Math.pow(10, power);
    
    if (step <= 0) step = 10;
    
    const ticks: number[] = [];
    let current = 0;
    while (current <= testMax + step * 0.1) {
      ticks.push(current);
      current += step;
    }
    
    if (ticks.length < 2) {
      ticks.push(step);
    }
    
    const minorStep = step / 5;
    const minorTicks: number[] = [];
    current = 0;
    while (current <= testMax + minorStep * 0.1) {
      if (current % step !== 0) {
        minorTicks.push(current);
      }
      current += minorStep;
    }
    
    return { majorTicks: ticks, minorTicks, maxAxisVal: ticks[ticks.length - 1] };
  };

  // Filters calculation (incorporates date scope bounds, search text, status, and vessel matching)
  const filteredBookings = ownerBookings.filter(b => {
    const matchesSearch = 
      (b.id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.guestName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.guestEmail || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || b.status === statusFilter;
    const matchesVessel = vesselFilter === 'all' || b.vesselTitle === vesselFilter;

    const { start: dateScopeStart, end: dateScopeEnd } = getActiveRangeAndGrouping();
    
    const isWithinBounds = (dateStr: string) => {
      if (!dateStr || dateStr === 'N/A') return false;
      try {
        const d = new Date(dateStr + 'T00:00:00');
        const s = new Date(dateScopeStart.toISOString().split('T')[0] + 'T00:00:00');
        const e = new Date(dateScopeEnd.toISOString().split('T')[0] + 'T23:59:59');
        return d >= s && d <= e;
      } catch {
        return false;
      }
    };

    const matchesDateScope = (() => {
      if (chartDateType === 'booking') {
        return isWithinBounds(getNormalizedDate(b.createdAt));
      } else if (chartDateType === 'excursion') {
        return isWithinBounds(b.date);
      } else if (chartDateType === 'payment') {
        const payDate1 = getNormalizedDate(b.createdAt);
        const payDate2 = b.paymentPlan === 'deposit' ? getDueDateString(b.date) : 'N/A';
        return isWithinBounds(payDate1) || (payDate2 !== 'N/A' && isWithinBounds(payDate2));
      }
      return false;
    })();

    return matchesSearch && matchesStatus && matchesVessel && matchesDateScope;
  });

  const getGroupedChartData = () => {
    const { start, end, grouping } = getActiveRangeAndGrouping();
    const intervals = generateIntervals(start, end, grouping);
    
    const dataMap: Record<string, { cat1: number; cat2: number; cat3: number }> = {};
    intervals.forEach(dateKey => {
      dataMap[dateKey] = { cat1: 0, cat2: 0, cat3: 0 };
    });

    const isWithinBounds = (dateStr: string) => {
      if (!dateStr || dateStr === 'N/A') return false;
      try {
        const d = new Date(dateStr + 'T00:00:00');
        const s = new Date(start.toISOString().split('T')[0] + 'T00:00:00');
        const e = new Date(end.toISOString().split('T')[0] + 'T23:59:59');
        return d >= s && d <= e;
      } catch {
        return false;
      }
    };

    filteredBookings.forEach(b => {
      if ((b.status as any) === 'cancelled') return;

      const splits = getOwnerRevenueSplits(b);

      if (chartDateType === 'booking') {
        const bDate = getNormalizedDate(b.createdAt);
        if (!isWithinBounds(bDate)) return;

        let key = bDate;
        if (grouping === 'week') key = getSundayOfWeek(bDate);
        else if (grouping === 'month') key = getFirstDayOfMonth(bDate);

        if (dataMap[key]) {
          if (b.paymentPlan === 'full') {
            dataMap[key].cat1 += splits.ownerPaid;
          } else {
            dataMap[key].cat2 += splits.ownerPaid;
            dataMap[key].cat3 += splits.ownerDue;
          }
        }
      } else if (chartDateType === 'excursion') {
        const eDate = b.date;
        if (!isWithinBounds(eDate)) return;

        let key = eDate;
        if (grouping === 'week') key = getSundayOfWeek(eDate);
        else if (grouping === 'month') key = getFirstDayOfMonth(eDate);

        if (dataMap[key]) {
          if (b.paymentPlan === 'full') {
            dataMap[key].cat1 += splits.ownerPaid;
          } else {
            dataMap[key].cat2 += splits.ownerPaid;
            dataMap[key].cat3 += splits.ownerDue;
          }
        }
      } else if (chartDateType === 'payment') {
        const payDate1 = getNormalizedDate(b.createdAt);
        if (isWithinBounds(payDate1)) {
          let key = payDate1;
          if (grouping === 'week') key = getSundayOfWeek(payDate1);
          else if (grouping === 'month') key = getFirstDayOfMonth(payDate1);

          if (dataMap[key]) {
            if (b.paymentPlan === 'full') {
              dataMap[key].cat1 += splits.ownerPaid;
            } else {
              dataMap[key].cat2 += splits.ownerPaid;
            }
          }
        }

        if (b.paymentPlan === 'deposit' && splits.ownerDue > 0) {
          const dueDate = getDueDateString(b.date);
          if (isWithinBounds(dueDate)) {
            let key = dueDate;
            if (grouping === 'week') key = getSundayOfWeek(dueDate);
            else if (grouping === 'month') key = getFirstDayOfMonth(dueDate);

            if (dataMap[key]) {
              dataMap[key].cat3 += splits.ownerDue;
            }
          }
        }
      }
    });

    const sortedData = intervals.map(date => {
      const values = dataMap[date] || { cat1: 0, cat2: 0, cat3: 0 };
      return {
        date,
        ...values,
        total: values.cat1 + values.cat2 + values.cat3
      };
    });

    return { chartData: sortedData, grouping };
  };

  const { chartData, grouping } = getGroupedChartData();
  const maxChartVal = chartData.reduce((max, d) => Math.max(max, d.total), 0);

  // Calculate timeframe filtered bookings for summary stats (excluding cancelled ones)
  const timeframeBookings = filteredBookings.filter(b => (b.status as any) !== 'cancelled');

  const confirmedCount = timeframeBookings.filter(b => b.status === 'confirmed').length;
  const pendingWaiverCount = timeframeBookings.filter(b => b.status === 'pending waiver').length;
  
  const totalBookingValue = timeframeBookings
    .reduce((sum, b) => sum + getOwnerRevenueSplits(b).total, 0);
    
  const totalRevenue = timeframeBookings
    .reduce((sum, b) => sum + getOwnerRevenueSplits(b).ownerPaid, 0);

  // Unique list of owner's vessels for dropdown filter
  const vesselOptions = Array.from(new Set(ownerBookings.map(b => b.vesselTitle).filter(Boolean)));


  return (
    <div style={{ minHeight: '100vh', background: '#121416', color: '#F4F1EA', fontFamily: "'Inter', sans-serif" }}>
      {/* Top Navbar */}
      <nav style={{ background: '#1E2124', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 600, fontSize: '1.25rem', color: '#B9783B' }}>
          <Ship size={24} /> Partner Fleet Owner Portal
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
        
        {/* Dynamic switcher for testing and administrators */}
        {owners.length > 1 && (
          <div style={{ background: 'rgba(185, 120, 59, 0.08)', border: '1px solid rgba(185, 120, 59, 0.15)', padding: '0.75rem 1.25rem', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
            <span style={{ fontSize: '0.78rem', color: '#B9783B', fontWeight: 600 }}>
              Testing Simulator: You can switch owner profiles below to view specific fleet assets & payouts.
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.74rem', color: '#D8C7AF' }}>Logged in as:</span>
              <select 
                value={selectedOwner?.id || ''}
                onChange={e => handleOwnerChange(e.target.value)}
                style={{ padding: '0.4rem 0.65rem', background: '#121416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', fontSize: '0.78rem', outline: 'none', cursor: 'pointer' }}
              >
                {owners.map(o => (
                  <option key={o.id} value={o.id}>{o.title} ({o.email})</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Header Block */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '2.25rem', fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, margin: '0 0 0.5rem 0', letterSpacing: '0.02em' }}>
              Fleet Operations & Earnings
            </h1>
            <p style={{ color: '#D8C7AF', opacity: 0.8, margin: 0 }}>
              Review charter performance, payout ledgers, asset statuses, and operational voyage calendars for {selectedOwner?.title || 'your fleet'}.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontSize: '0.74rem', color: '#B9783B', fontWeight: 700, border: '1px solid rgba(185,120,59,0.2)', padding: '0.45rem 0.85rem', borderRadius: '6px', background: 'rgba(185,120,59,0.04)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Contracted: {revSharePct}% Owner Share
            </span>
            <button 
              onClick={fetchData}
              style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.02)', padding: '0.5rem 0.85rem', borderRadius: '6px', color: '#D8C7AF', cursor: 'pointer', fontSize: '0.8rem' }}
            >
              <RefreshCw size={14} /> Refresh Portal
            </button>
          </div>
        </div>

        {/* Global Dashboard Controls */}
        <div style={{ 
          background: '#1E2124', 
          border: '1px solid rgba(255,255,255,0.06)', 
          borderRadius: '8px', 
          padding: '1.25rem 1.5rem', 
          marginBottom: '2.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1.25rem'
        }}>
          {/* Left side: Time Scope selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <span style={{ fontSize: '0.68rem', color: '#D8C7AF', opacity: 0.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Time Scope</span>
              <select
                value={timeScope}
                onChange={e => {
                  setTimeScope(e.target.value);
                  setHoveredBar(null);
                }}
                style={{
                  padding: '0.45rem 2rem 0.45rem 0.75rem',
                  background: '#121416',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '6px',
                  color: 'white',
                  fontSize: '0.78rem',
                  outline: 'none',
                  cursor: 'pointer',
                  appearance: 'none',
                  backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23B9783B\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'%3E%3C/polyline%3E%3C/svg%3E")',
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 8px center',
                  backgroundSize: '12px',
                  minWidth: '130px'
                }}
              >
                <option value="current-period">Current Period</option>
                <option value="this-month">This Month</option>
                <option value="last-30-days">Last 30 Days</option>
                <option value="next-month">Next Month</option>
                <option value="next-30-days">Next 30 Days</option>
                <option value="next-90-days">Next 90 Days</option>
                <option value="this-quarter">This Quarter</option>
                <option value="this-year">This Year</option>
                <option value="last-12-months">Last 12 Months</option>
                <option value="all-time">All Time</option>
                <option value="custom">Custom Range...</option>
              </select>
            </div>

            {/* Custom Date Picker Inputs */}
            {timeScope === 'custom' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <span style={{ fontSize: '0.65rem', color: '#D8C7AF', opacity: 0.5 }}>Start Date</span>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={e => {
                      setCustomStartDate(e.target.value);
                      setHoveredBar(null);
                    }}
                    style={{
                      padding: '0.38rem 0.5rem',
                      background: '#121416',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '6px',
                      color: 'white',
                      fontSize: '0.75rem',
                      outline: 'none',
                      colorScheme: 'dark'
                    }}
                  />
                </div>
                <span style={{ color: '#D8C7AF', opacity: 0.5, marginTop: '1rem', fontSize: '0.75rem' }}>to</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <span style={{ fontSize: '0.65rem', color: '#D8C7AF', opacity: 0.5 }}>End Date</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={e => {
                      setCustomEndDate(e.target.value);
                      setHoveredBar(null);
                    }}
                    style={{
                      padding: '0.38rem 0.5rem',
                      background: '#121416',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '6px',
                      color: 'white',
                      fontSize: '0.75rem',
                      outline: 'none',
                      colorScheme: 'dark'
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Right side: Date Segment switches */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'flex-end' }}>
            <span style={{ fontSize: '0.68rem', color: '#D8C7AF', opacity: 0.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date Segment</span>
            <div style={{ display: 'flex', background: '#121416', padding: '0.2rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)' }}>
              {(['booking', 'excursion', 'payment'] as const).map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    setChartDateType(type);
                    setHoveredBar(null);
                  }}
                  style={{
                    padding: '0.4rem 0.85rem',
                    background: chartDateType === type ? '#B9783B' : 'transparent',
                    color: chartDateType === type ? 'white' : '#D8C7AF',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '0.74rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                    transition: 'all 0.15s'
                  }}
                >
                  {type === 'booking' ? 'Booking Date' : type === 'excursion' ? 'Excursion Date' : 'Payment Date'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* KPI Grid Ribbon */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
          
          <div style={{ background: '#1E2124', border: '1px solid rgba(255,255,255,0.05)', padding: '1.25rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ background: 'rgba(112, 140, 132, 0.1)', color: '#708C84', padding: '0.75rem', borderRadius: '8px' }}>
              <CheckCircle size={24} />
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: '#D8C7AF', opacity: 0.6, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Confirmed Bookings</span>
              <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white' }}>{confirmedCount} Voyages</span>
            </div>
          </div>

          <div style={{ background: '#1E2124', border: '1px solid rgba(255,255,255,0.05)', padding: '1.25rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '0.75rem', borderRadius: '8px' }}>
              <Clock size={24} />
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: '#D8C7AF', opacity: 0.6, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pending Guest Waivers</span>
              <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white' }}>{pendingWaiverCount} Parties</span>
            </div>
          </div>

          <div style={{ background: '#1E2124', border: '1px solid rgba(255,255,255,0.05)', padding: '1.25rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ background: 'rgba(185,120,59,0.1)', color: '#B9783B', padding: '0.75rem', borderRadius: '8px' }}>
              <DollarSign size={24} />
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: '#D8C7AF', opacity: 0.6, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Owner Share Value</span>
              <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white' }}>{formatCost(totalBookingValue)}</span>
            </div>
          </div>

          <div style={{ background: '#1E2124', border: '1px solid rgba(255,255,255,0.05)', padding: '1.25rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ background: 'rgba(13, 148, 136, 0.1)', color: '#0D9488', padding: '0.75rem', borderRadius: '8px' }}>
              <DollarSign size={24} />
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: '#D8C7AF', opacity: 0.6, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Owner Share Paid</span>
              <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white' }}>{formatCost(totalRevenue)}</span>
            </div>
          </div>

        </div>

        {/* Dynamic Stacked Bar Chart */}
        <div style={{ background: '#1E2124', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '1.5rem', marginBottom: '2.5rem' }}>
          
          {/* Header Row: Title Only */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.75rem', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, color: 'white', margin: 0 }}>
              Owner Revenue Share Timeline
            </h3>
          </div>

          {/* Interactive Info / Hover Status Panel (Dedicated Row) */}
          <div style={{ 
            background: 'rgba(255, 255, 255, 0.01)', 
            border: '1px solid rgba(255, 255, 255, 0.04)', 
            borderRadius: '6px', 
            padding: '0.75rem 1rem', 
            marginBottom: '1.25rem', 
            display: 'flex', 
            alignItems: 'center', 
            minHeight: '44px',
            fontSize: '0.76rem',
            color: '#D8C7AF',
            width: '100%',
            boxSizing: 'border-box'
          }}>
            {hoveredBar ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem 1.5rem', width: '100%', alignItems: 'center' }}>
                <span>Date Group: <strong style={{ color: 'white', fontSize: '0.8rem' }}>{hoveredBar.date}</strong></span>
                <span style={{ height: '10px', width: '1px', background: 'rgba(255,255,255,0.1)' }} />
                <span>Total Expected Owner Share: <strong style={{ color: '#B9783B', fontSize: '0.8rem' }}>{formatCost(hoveredBar.total)}</strong></span>
                <span style={{ height: '10px', width: '1px', background: 'rgba(255,255,255,0.1)' }} />
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                    <span style={{ width: '8px', height: '8px', background: '#708C84', borderRadius: '50%' }} />
                    Full Paid Owner Share: <strong style={{ color: '#F4F1EA' }}>{formatCost(hoveredBar.cat1)}</strong>
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                    <span style={{ width: '8px', height: '8px', background: '#0D9488', borderRadius: '50%' }} />
                    Deposit Owner Share: <strong style={{ color: '#F4F1EA' }}>{formatCost(hoveredBar.cat2)}</strong>
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                    <span style={{ width: '8px', height: '8px', background: '#F97316', borderRadius: '50%' }} />
                    Balances Due Owner Share: <strong style={{ color: '#F4F1EA' }}>{formatCost(hoveredBar.cat3)}</strong>
                  </span>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ display: 'inline-block', width: '6px', height: '6px', background: '#B9783B', borderRadius: '50%', opacity: 0.8 }} />
                <span>Hover over any timeline bar to inspect structured transaction details.</span>
              </div>
            )}
          </div>

          {chartData.length === 0 ? (
            <div style={{ padding: '3rem 1rem', textAlign: 'center', color: '#D8C7AF', opacity: 0.6, fontSize: '0.8rem' }}>
              No revenue share data available for the current selection.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Responsive SVG Chart Container */}
              <div style={{ position: 'relative', width: '100%', overflowX: 'auto', background: '#121416', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)', padding: '1rem 0' }}>
                <div style={{ minWidth: '920px', width: '100%' }}>
                  {(() => {
                    const svgWidth = 920;
                    const svgHeight = 340;
                    const paddingLeft = 85;
                    const paddingRight = 25;
                    const paddingTop = 20;
                    const paddingBottom = 60;
                    const chartWidth = svgWidth - paddingLeft - paddingRight; // 810
                    const chartHeight = svgHeight - paddingTop - paddingBottom; // 260
                    const yAxisOrigin = paddingLeft; // 85
                    const xAxisOrigin = svgHeight - paddingBottom; // 280

                    const { majorTicks, minorTicks, maxAxisVal } = getNiceTicks(maxChartVal);
                    const safeMaxAxisVal = maxAxisVal <= 0 ? 1000 : maxAxisVal;
                    const getYCoord = (val: number) => xAxisOrigin - (val / safeMaxAxisVal) * chartHeight;

                    const formatYAxisLabel = (v: number) => {
                      if (v === 0) return '$0';
                      if (v >= 1000000) {
                        const mVal = v / 1000000;
                        return `$${mVal % 1 === 0 ? mVal : mVal.toFixed(1)}M`;
                      }
                      if (v >= 1000) {
                        const kVal = v / 1000;
                        return `$${kVal % 1 === 0 ? kVal : kVal.toFixed(1)}K`;
                      }
                      return `$${v}`;
                    };

                    const M = chartData.length;
                    const barWidth = chartWidth / M;
                    const barSpacing = Math.max(barWidth * 0.25, 4);
                    const innerBarWidth = Math.max(barWidth - barSpacing, 4);

                    let lastIdx = -999;

                    return (
                      <svg width="100%" height={svgHeight} viewBox={`0 0 ${svgWidth} ${svgHeight}`} style={{ overflow: 'visible' }}>
                        {/* Major Horizontal Gridlines & Y-Axis Labels (pointer-events disabled) */}
                        <g style={{ pointerEvents: 'none' }}>
                          {majorTicks.map((val, idx) => {
                            const y = getYCoord(val);
                            return (
                              <g key={`grid-${idx}`}>
                                <line
                                  x1={yAxisOrigin}
                                  y1={y}
                                  x2={svgWidth - paddingRight}
                                  y2={y}
                                  stroke={idx === 0 ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.04)"}
                                  strokeWidth={idx === 0 ? 1.5 : 1}
                                  strokeDasharray={idx === 0 ? undefined : "3,3"}
                                />
                                <line
                                  x1={yAxisOrigin - 6}
                                  y1={y}
                                  x2={yAxisOrigin}
                                  y2={y}
                                  stroke="rgba(255,255,255,0.3)"
                                  strokeWidth={1}
                                />
                                <text
                                  x={yAxisOrigin - 12}
                                  y={y + 4}
                                  fill="#D8C7AF"
                                  fontSize="0.72rem"
                                  fontWeight={500}
                                  textAnchor="end"
                                  opacity={0.8}
                                >
                                  {formatYAxisLabel(val)}
                                </text>
                              </g>
                            );
                          })}

                          {/* Minor Tick Mark Lines on Y-Axis */}
                          {minorTicks.map((val, idx) => {
                            const y = getYCoord(val);
                            return (
                              <line
                                key={`minor-${idx}`}
                                x1={yAxisOrigin - 3}
                                y1={y}
                                x2={yAxisOrigin}
                                y2={y}
                                stroke="rgba(255,255,255,0.15)"
                                strokeWidth={1}
                              />
                            );
                          })}
                        </g>

                        {/* Guide Line for hovered element (pointer-events disabled) */}
                        {hoveredBar && (() => {
                          const idx = chartData.findIndex(d => d.date === hoveredBar.date);
                          if (idx === -1) return null;
                          const x = yAxisOrigin + idx * barWidth + barWidth / 2;
                          return (
                            <line
                              x1={x}
                              y1={paddingTop}
                              x2={x}
                              y2={xAxisOrigin}
                              stroke="rgba(185, 120, 59, 0.25)"
                              strokeWidth={1}
                              strokeDasharray="2,2"
                              style={{ pointerEvents: 'none' }}
                            />
                          );
                        })()}

                        {/* Chart Stacked Bars */}
                        {chartData.map((item, index) => {
                          const xCoord = yAxisOrigin + index * barWidth + barWidth / 2;
                          const barLeft = xCoord - innerBarWidth / 2;
                          const isHovered = hoveredBar && hoveredBar.date === item.date;

                          const v1 = item.cat1;
                          const v2 = item.cat2;
                          const v3 = item.cat3;

                          const h1 = (v1 / safeMaxAxisVal) * chartHeight;
                          const h2 = (v2 / safeMaxAxisVal) * chartHeight;
                          const h3 = (v3 / safeMaxAxisVal) * chartHeight;
                          const hTotal = h1 + h2 + h3;

                          const y3 = xAxisOrigin - hTotal;
                          const y2 = xAxisOrigin - h1 - h2;
                          const y1 = xAxisOrigin - h1;

                          return (
                            <g key={`bar-${index}`}>
                              {/* Visual element group with pointer events disabled */}
                              <g style={{ pointerEvents: 'none' }}>
                                {/* Hover Highlight Panel */}
                                {isHovered && (
                                  <rect
                                    x={barLeft - 3}
                                    y={paddingTop}
                                    width={innerBarWidth + 6}
                                    height={chartHeight}
                                    fill="rgba(255, 255, 255, 0.02)"
                                    rx={4}
                                  />
                                )}

                                {/* Stack visual columns */}
                                {/* cat3 (Future Due: Orange) */}
                                {h3 > 0 && (
                                  <rect
                                    x={barLeft}
                                    y={y3}
                                    width={innerBarWidth}
                                    height={h3}
                                    fill="#F97316"
                                    opacity={isHovered ? 1 : 0.85}
                                    style={{ transition: 'all 0.15s' }}
                                  />
                                )}

                                {/* cat2 (Deposits Paid: Teal Blue) */}
                                {h2 > 0 && (
                                  <rect
                                    x={barLeft}
                                    y={y2}
                                    width={innerBarWidth}
                                    height={h2}
                                    fill="#0D9488"
                                    opacity={isHovered ? 1 : 0.85}
                                    style={{ transition: 'all 0.15s' }}
                                  />
                                )}

                                {/* cat1 (Completed / Paid: Sage Green) */}
                                {h1 > 0 && (
                                  <rect
                                    x={barLeft}
                                    y={y1}
                                    width={innerBarWidth}
                                    height={h1}
                                    fill="#708C84"
                                    opacity={isHovered ? 1 : 0.85}
                                    style={{ transition: 'all 0.15s' }}
                                  />
                                )}
                              </g>

                              {/* Hover sensor overlay - Zero gap full-width columns */}
                              <rect
                                x={yAxisOrigin + index * barWidth}
                                y={paddingTop}
                                width={barWidth}
                                height={chartHeight}
                                fill="transparent"
                                cursor="pointer"
                                onMouseEnter={() => setHoveredBar(item)}
                                onMouseLeave={() => setHoveredBar(null)}
                              />
                            </g>
                          );
                        })}

                        {/* Horizontal X-Axis Line (pointer-events disabled) */}
                        <line
                          x1={yAxisOrigin}
                          y1={xAxisOrigin}
                          x2={svgWidth - paddingRight}
                          y2={xAxisOrigin}
                          stroke="rgba(255,255,255,0.15)"
                          strokeWidth={1.5}
                          style={{ pointerEvents: 'none' }}
                        />

                        {/* Date Ticks & Selective Labels (pointer-events disabled) */}
                        <g style={{ pointerEvents: 'none' }}>
                          {chartData.map((item, index) => {
                            const xCoord = yAxisOrigin + index * barWidth + barWidth / 2;
                            const d = new Date(item.date + 'T00:00:00');
                            
                            let shouldLabel = false;
                            let labelText = '';
                            let isMajor = false;

                            if (grouping === 'day') {
                              const isFirst = index === 0;
                              const isLast = index === M - 1;
                              const isSunday = d.getDay() === 0;
                              const isFirstOfMonth = d.getDate() === 1;

                              if (isFirst) {
                                shouldLabel = true;
                                labelText = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                                isMajor = true;
                              } else if (isFirstOfMonth) {
                                shouldLabel = true;
                                labelText = d.toLocaleDateString(undefined, { month: 'short' }) + ' 1st';
                                isMajor = true;
                              } else if (isSunday) {
                                shouldLabel = true;
                                labelText = d.toLocaleDateString(undefined, { month: '2-digit', day: '2-digit' });
                              } else if (isLast) {
                                shouldLabel = true;
                                labelText = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                                isMajor = true;
                              }

                              if (shouldLabel) {
                                if (index - lastIdx < 4 && !isFirstOfMonth && !isLast) {
                                  shouldLabel = false;
                                } else {
                                  lastIdx = index;
                                }
                              }
                            } else if (grouping === 'week') {
                              const isFirst = index === 0;
                              const isLast = index === M - 1;
                              const isEvenWeek = index % 2 === 0;
                              
                              let isMonthChange = false;
                              if (index > 0) {
                                const prevD = new Date(chartData[index - 1].date + 'T00:00:00');
                                isMonthChange = prevD.getMonth() !== d.getMonth();
                              }

                              if (isFirst) {
                                shouldLabel = true;
                                labelText = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                                isMajor = true;
                              } else if (isMonthChange) {
                                shouldLabel = true;
                                labelText = d.toLocaleDateString(undefined, { month: 'short' });
                                isMajor = true;
                              } else if (isEvenWeek) {
                                shouldLabel = true;
                                labelText = d.toLocaleDateString(undefined, { month: '2-digit', day: '2-digit' });
                              } else if (isLast) {
                                shouldLabel = true;
                                labelText = d.toLocaleDateString(undefined, { month: '2-digit', day: '2-digit' });
                              }

                              if (shouldLabel) {
                                if (index - lastIdx < 2 && !isMonthChange && !isLast) {
                                  shouldLabel = false;
                                } else {
                                  lastIdx = index;
                                }
                              }
                            } else {
                              // month
                              shouldLabel = true;
                              const isJanuary = d.getMonth() === 0;
                              const isFirst = index === 0;
                              
                              if (isJanuary || isFirst) {
                                labelText = d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
                                isMajor = true;
                              } else {
                                labelText = d.toLocaleDateString(undefined, { month: 'short' });
                              }
                              
                              if (M > 18) {
                                if (index % 2 !== 0 && !isJanuary && index !== M - 1) {
                                  shouldLabel = false;
                                }
                              }
                            }

                            return (
                              <g key={`xtick-${index}`}>
                                <line
                                  x1={xCoord}
                                  y1={xAxisOrigin}
                                  x2={xCoord}
                                  y2={xAxisOrigin + (shouldLabel ? 8 : 4)}
                                  stroke={shouldLabel ? (isMajor ? '#B9783B' : 'rgba(255,255,255,0.4)') : 'rgba(255,255,255,0.15)'}
                                  strokeWidth={shouldLabel && isMajor ? 1.5 : 1}
                                />
                                {shouldLabel && (
                                  <text
                                    x={xCoord}
                                    y={xAxisOrigin + 22}
                                    fill={isMajor ? '#F4F1EA' : '#D8C7AF'}
                                    fontSize="0.68rem"
                                    fontWeight={isMajor ? 600 : 500}
                                    textAnchor="middle"
                                    opacity={isMajor ? 1 : 0.8}
                                  >
                                    {labelText}
                                  </text>
                                )}
                              </g>
                            );
                          })}
                        </g>
                      </svg>
                    );
                  })()}
                </div>
              </div>

              {/* Chart Legend */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', justifyContent: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.75rem', fontSize: '0.7rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <div style={{ width: '10px', height: '10px', background: '#708C84', borderRadius: '2px' }} />
                  <span style={{ color: '#D8C7AF' }}>Completed / Full Owner Share Paid</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <div style={{ width: '10px', height: '10px', background: '#0D9488', borderRadius: '2px' }} />
                  <span style={{ color: '#D8C7AF' }}>Deposit Owner Share Paid</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <div style={{ width: '10px', height: '10px', background: '#F97316', borderRadius: '2px' }} />
                  <span style={{ color: '#D8C7AF' }}>Future Owner Share Balance Due</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Section: Fleet Asset Management */}
        <h2 style={{ fontSize: '1.4rem', fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, marginBottom: '1rem', letterSpacing: '0.02em' }}>Registered Fleet Assets</h2>
        
        {assets.length === 0 ? (
          <div style={{ background: '#1E2124', border: '1px solid rgba(255,255,255,0.05)', padding: '3rem 1rem', borderRadius: '8px', textAlign: 'center', marginBottom: '2.5rem' }}>
            <Ship size={32} color="#B9783B" style={{ opacity: 0.5, margin: '0 auto 1rem' }} />
            <span style={{ fontSize: '0.85rem', color: '#D8C7AF' }}>No vessels or assets linked to this owner profile.</span>
          </div>
        ) : (
          <div style={{ background: '#1E2124', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', overflow: 'hidden', marginBottom: '2.5rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#121416', borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#D8C7AF', opacity: 0.8, textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '0.85rem 1rem' }}>Vessel / Asset</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Category</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Make / Model</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Key Specifications</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Base Rental Rate</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {assets.map(a => (
                  <tr key={a.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '1rem', fontWeight: 700, color: 'white' }}>{a.title}</td>
                    <td style={{ padding: '1rem', color: '#D8C7AF', textTransform: 'capitalize' }}>
                      {a.category || (a.isVessel ? 'Vessel' : 'Gear / Tender')}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {a.make || 'Custom'} {a.model || ''}
                    </td>
                    <td style={{ padding: '1rem', color: '#D8C7AF', opacity: 0.8 }}>
                      {a.specifications ? Object.entries(a.specifications).slice(0, 3).map(([k, v]) => `${k}: ${v}`).join(', ') : 'No specs logged'}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 600, color: '#B9783B' }}>
                      {formatCost(a.hourlyRate || 0)} / Hour
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      <span style={{ 
                        fontSize: '0.68rem', 
                        padding: '0.15rem 0.45rem', 
                        borderRadius: '4px', 
                        fontWeight: 700,
                        background: a.status === 'published' ? 'rgba(112, 140, 132, 0.12)' : 'rgba(255,255,255,0.06)', 
                        color: a.status === 'published' ? '#708C84' : '#D8C7AF' 
                      }}>
                        {a.status === 'published' ? 'Active' : 'Draft / Blocked'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Section: Fleet Booking Log & Financials */}
        <h2 style={{ fontSize: '1.4rem', fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, marginBottom: '1rem', letterSpacing: '0.02em', marginTop: '2.5rem' }}>
          Fleet Booking Log & Financials
        </h2>

        {/* Filter Controls Row */}
        <div style={{ background: '#1E2124', border: '1px solid rgba(255,255,255,0.06)', padding: '1rem', borderRadius: '8px', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem' }}>
          {/* Search bar */}
          <div style={{ flex: 2, display: 'flex', alignItems: 'center', background: '#121416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', paddingLeft: '0.75rem', minWidth: '240px' }}>
            <Search size={16} style={{ color: '#D8C7AF', opacity: 0.5 }} />
            <input 
              type="text" 
              placeholder="Search by ID, Guest name, email..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ padding: '0.6rem 0.75rem', background: 'transparent', border: 'none', color: 'white', fontSize: '0.85rem', outline: 'none', flex: 1 }}
            />
          </div>

          {/* Status selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', color: '#D8C7AF', opacity: 0.7 }}>Status:</span>
            <select 
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              style={{ padding: '0.55rem 0.75rem', background: '#121416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', fontSize: '0.8rem', outline: 'none', cursor: 'pointer' }}
            >
              <option value="all">All Statuses</option>
              <option value="confirmed">Confirmed</option>
              <option value="pending waiver">Pending Waiver</option>
              <option value="pending">Pending</option>
            </select>
          </div>

          {/* Vessel selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', color: '#D8C7AF', opacity: 0.7 }}>Vessel:</span>
            <select 
              value={vesselFilter}
              onChange={e => setVesselFilter(e.target.value)}
              style={{ padding: '0.55rem 0.75rem', background: '#121416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', fontSize: '0.8rem', outline: 'none', cursor: 'pointer' }}
            >
              <option value="all">All Vessels</option>
              {vesselOptions.map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Data Grid Table */}
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '4rem', flexDirection: 'column', gap: '1rem' }}>
            <Loader2 size={32} className="animate-spin" style={{ color: '#B9783B' }} />
            <span style={{ color: '#D8C7AF' }}>Loading dynamic bookings catalog...</span>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div style={{ background: '#1E2124', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '4rem 2rem', textAlign: 'center' }}>
            <AlertCircle size={40} color="#B9783B" style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
            <h4 style={{ color: 'white', fontSize: '1.15rem', margin: '0 0 0.5rem 0' }}>No Bookings Found</h4>
            <p style={{ color: '#D8C7AF', opacity: 0.7, margin: 0, fontSize: '0.85rem' }}>No reservation documents match your current filter parameters.</p>
          </div>
        ) : (
          <div style={{ background: '#1E2124', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#121416', borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#D8C7AF', opacity: 0.8, textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '0.85rem 1rem' }}>Booking ID</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Guest / Contact</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Vessel Selected</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Schedule</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Owner Paid Share</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Owner Due Share</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Due Date</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Waiver</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Status</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {/* Column Totals Row at the top under column headers */}
                <tr style={{ background: 'rgba(185, 120, 59, 0.08)', borderBottom: '2px solid rgba(255,255,255,0.08)', color: 'white', fontWeight: 600 }}>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <div style={{ fontSize: '0.65rem', color: '#D8C7AF', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Bookings</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{filteredBookings.length}</div>
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <div style={{ fontSize: '0.65rem', color: '#D8C7AF', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Guests</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{filteredBookings.reduce((sum, b) => sum + (b.guestCount || 1), 0)}</div>
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}></td>
                  <td style={{ padding: '0.75rem 1rem' }}></td>
                  <td style={{ padding: '0.75rem 1rem', color: '#B9783B', fontWeight: 700, fontSize: '0.85rem' }}>
                    <div style={{ fontSize: '0.65rem', color: '#D8C7AF', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Owner Paid</div>
                    <div>{formatCost(filteredBookings.reduce((sum, b) => sum + getOwnerRevenueSplits(b).ownerPaid, 0))}</div>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: '#ef4444', fontWeight: 700, fontSize: '0.85rem' }}>
                    <div style={{ fontSize: '0.65rem', color: '#D8C7AF', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Owner Due</div>
                    <div>{formatCost(filteredBookings.reduce((sum, b) => sum + getOwnerRevenueSplits(b).ownerDue, 0))}</div>
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}></td>
                  <td style={{ padding: '0.75rem 1rem' }}></td>
                  <td style={{ padding: '0.75rem 1rem' }}></td>
                  <td style={{ padding: '0.75rem 1rem' }}></td>
                </tr>

                {filteredBookings.map((b: any) => {
                  const splits = getOwnerRevenueSplits(b);
                  return (
                    <tr 
                      key={b.id} 
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer', transition: 'all 0.15s' }}
                      onClick={() => setSelectedBooking(b)}
                      onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.015)'}
                      onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '1rem', fontWeight: 700, color: 'white', fontFamily: 'monospace' }}>BK-{b.id}</td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ fontWeight: 600, color: 'white' }}>{b.guestName}</div>
                        <div style={{ opacity: 0.6, fontSize: '0.74rem', color: '#D8C7AF' }}>{b.guestEmail}</div>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ color: '#D8C7AF' }}>{b.vesselTitle}</div>
                        <div style={{ opacity: 0.6, fontSize: '0.74rem' }}>{b.captainTitle}</div>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ color: 'white', fontWeight: 500 }}>{b.date}</div>
                        <div style={{ opacity: 0.6, fontSize: '0.74rem', color: '#D8C7AF' }}>@{b.startTime}</div>
                      </td>
                      <td style={{ padding: '1rem', color: '#B9783B', fontWeight: 600 }}>{formatCost(splits.ownerPaid)}</td>
                      <td style={{ padding: '1rem', color: '#ef4444', fontWeight: 600 }}>{formatCost(splits.ownerDue)}</td>
                      <td style={{ padding: '1rem', color: '#D8C7AF' }}>{getPaymentDueDate(b)}</td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{ 
                          fontSize: '0.68rem', 
                          padding: '0.15rem 0.45rem', 
                          borderRadius: '4px', 
                          fontWeight: 700,
                          background: b.waiverSigned ? 'rgba(112, 140, 132, 0.12)' : 'rgba(239, 68, 68, 0.12)', 
                          color: b.waiverSigned ? '#708C84' : '#ef4444' 
                        }}>
                          {b.waiverSigned ? 'Signed' : 'Pending'}
                        </span>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{ 
                          fontSize: '0.68rem', 
                          padding: '0.15rem 0.45rem', 
                          borderRadius: '4px', 
                          fontWeight: 700,
                          background: b.status === 'confirmed' ? 'rgba(185,120,59,0.15)' : 'rgba(255,255,255,0.06)', 
                          color: b.status === 'confirmed' ? '#B9783B' : '#D8C7AF' 
                        }}>
                          {b.status}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedBooking(b);
                          }}
                          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '4px', padding: '0.35rem 0.55rem', cursor: 'pointer', color: '#D8C7AF', transition: 'all 0.2s', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                        >
                          <Eye size={12} /> View Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      </main>

      {/* DETAIL DRAWER / SLIDE-OUT PANEL */}
      {selectedBooking && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', justifyContent: 'flex-end', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)' }} onClick={() => setSelectedBooking(null)}>
          <div 
            style={{ width: '100%', maxWidth: '480px', height: '100%', background: '#1E2124', borderLeft: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, color: 'white', margin: 0 }}>Booking Details</h3>
                <span style={{ fontSize: '0.74rem', color: '#D8C7AF', opacity: 0.6, fontFamily: 'monospace' }}>Booking ID: BK-{selectedBooking.id}</span>
              </div>
              <button onClick={() => setSelectedBooking(null)} style={{ background: 'transparent', border: 'none', color: '#D8C7AF', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {/* Scrollable details */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* Status Banner */}
              <div style={{ background: 'rgba(185, 120, 59, 0.08)', border: '1px solid rgba(185, 120, 59, 0.15)', padding: '0.85rem 1rem', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: '#D8C7AF' }}>Status</span>
                <span style={{ 
                  fontSize: '0.72rem', 
                  padding: '0.18rem 0.55rem', 
                  borderRadius: '4px', 
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  background: selectedBooking.status === 'confirmed' ? 'rgba(112, 140, 132, 0.12)' : 'rgba(255,255,255,0.06)', 
                  color: selectedBooking.status === 'confirmed' ? '#708C84' : '#D8C7AF' 
                }}>{selectedBooking.status}</span>
              </div>

              {/* Customer Contact details */}
              <div style={{ background: '#121416', border: '1px solid rgba(255,255,255,0.04)', padding: '1rem', borderRadius: '8px' }}>
                <h4 style={{ fontSize: '0.75rem', fontWeight: 700, color: '#B9783B', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 0.65rem 0' }}>Client Information</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.78rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ opacity: 0.6 }}>Full Name:</span><strong style={{ color: 'white' }}>{selectedBooking.guestName}</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ opacity: 0.6 }}>Email Address:</span><strong style={{ color: 'white' }}>{selectedBooking.guestEmail}</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ opacity: 0.6 }}>Phone Number:</span><strong style={{ color: 'white' }}>{selectedBooking.guestPhone}</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ opacity: 0.6 }}>Group Size:</span><strong style={{ color: 'white' }}>{selectedBooking.guestCount} Passengers</strong></div>
                  {selectedBooking.specialConsiderations && (
                    <div style={{ borderTop: '1px dashed rgba(255,255,255,0.05)', paddingTop: '0.45rem', marginTop: '0.2rem' }}>
                      <span style={{ opacity: 0.6, display: 'block', marginBottom: '0.15rem' }}>Dietary & Medical Notes:</span>
                      <p style={{ color: 'white', margin: 0, fontStyle: 'italic' }}>{selectedBooking.specialConsiderations}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Charter details */}
              <div style={{ background: '#121416', border: '1px solid rgba(255,255,255,0.04)', padding: '1rem', borderRadius: '8px' }}>
                <h4 style={{ fontSize: '0.75rem', fontWeight: 700, color: '#B9783B', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 0.65rem 0' }}>Voyage Details</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.78rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ opacity: 0.6 }}>Experience:</span><strong style={{ color: 'white' }}>{selectedBooking.experienceTitle}</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ opacity: 0.6 }}>Vessel Selected:</span><strong style={{ color: 'white' }}>{selectedBooking.vesselTitle}</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ opacity: 0.6 }}>Captain Hired:</span><strong style={{ color: 'white' }}>{selectedBooking.captainTitle}</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ opacity: 0.6 }}>Voyage Date:</span><strong style={{ color: 'white' }}>{selectedBooking.date}</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ opacity: 0.6 }}>Boarding Time:</span><strong style={{ color: 'white' }}>{selectedBooking.startTime}</strong></div>
                </div>
              </div>

              {/* Financial calculations */}
              <div style={{ background: '#121416', border: '1px solid rgba(255,255,255,0.04)', padding: '1rem', borderRadius: '8px' }}>
                <h4 style={{ fontSize: '0.75rem', fontWeight: 700, color: '#B9783B', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 0.65rem 0' }}>Financial Split Ledger</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.78rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ opacity: 0.6 }}>Grand Total Invoice:</span><strong style={{ color: 'white' }}>{formatCost(selectedBooking.grandTotal)}</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ opacity: 0.6 }}>Amount Paid Today:</span><strong style={{ color: '#708C84' }}>{formatCost(selectedBooking.amountPaidToday)}</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ opacity: 0.6 }}>Amount Due Later:</span><strong style={{ color: '#ef4444' }}>{formatCost(selectedBooking.amountDueLater)}</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ opacity: 0.6 }}>Payment Plan:</span><strong style={{ color: 'white', textTransform: 'capitalize' }}>{selectedBooking.paymentPlan}</strong></div>
                  
                  {/* Partner Split Estimator */}
                  <div style={{ borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: '0.55rem', marginTop: '0.35rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ opacity: 0.6, color: '#D8C7AF' }}>Yacht Subtotal (Rental Base):</span>
                      <strong style={{ color: 'white' }}>{formatCost(selectedBooking.subtotal)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ opacity: 0.6, color: '#D8C7AF' }}>Owner share ({revSharePct}%):</span>
                      <strong style={{ color: '#B9783B' }}>{formatCost(selectedBooking.subtotal * (revSharePct / 100))}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ opacity: 0.6, color: '#D8C7AF' }}>Platform Commission ({100 - revSharePct}%):</span>
                      <strong style={{ color: 'white' }}>{formatCost(selectedBooking.subtotal * ((100 - revSharePct) / 100))}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed rgba(255,255,255,0.05)', paddingTop: '0.35rem', marginTop: '0.15rem' }}>
                      <span style={{ opacity: 0.6, color: '#D8C7AF' }}>Owner Paid Share:</span>
                      <strong style={{ color: '#708C84' }}>{formatCost(getOwnerRevenueSplits(selectedBooking).ownerPaid)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ opacity: 0.6, color: '#D8C7AF' }}>Owner Due Share:</span>
                      <strong style={{ color: '#ef4444' }}>{formatCost(getOwnerRevenueSplits(selectedBooking).ownerDue)}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Operational Dispatcher Notes (Read-only) */}
              {selectedBooking.operationalNotes && (
                <div style={{ background: '#121416', border: '1px solid rgba(255,255,255,0.04)', padding: '1rem', borderRadius: '8px' }}>
                  <h4 style={{ fontSize: '0.75rem', fontWeight: 700, color: 'white', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 0.45rem 0' }}>Internal Dispatcher Notes</h4>
                  <p style={{ color: '#D8C7AF', fontSize: '0.78rem', margin: 0, whiteSpace: 'pre-wrap' }}>{selectedBooking.operationalNotes}</p>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* Styled slideIn animation */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
      ` }} />
    </div>
  );
}
