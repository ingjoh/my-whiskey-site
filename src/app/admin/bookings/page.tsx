'use client';

import { useAuth } from '@/components/AuthProvider';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { 
  Anchor, ArrowLeft, Search, Calendar, Ship, Users, CheckCircle, 
  Clock, AlertCircle, Loader2, DollarSign, X, Edit3, ArrowRight, Eye, RefreshCw,
  MessageSquare
} from 'lucide-react';
import { 
  getAllBookings, updateBookingOperationalFields, getContentItems, 
  getAssetBlackouts, getAllCheckoutLocks, deleteAssetBlackout,
  sendBookingMessage, getBookingById, updateBookingMessageStatus
} from '@/lib/db';

export default function BookingsDashboard() {
  const { user } = useAuth();
  const router = useRouter();

  // Data states
  const [bookings, setBookings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);

  // Tab Selection
  const [activeDashboardTab, setActiveDashboardTab] = useState<'finance' | 'gantt'>('finance');

  // Operational states for Gantt
  const [vessels, setVessels] = useState<any[]>([]);
  const [gear, setGear] = useState<any[]>([]);
  const [allLocations, setAllLocations] = useState<any[]>([]);
  const [blackouts, setBlackouts] = useState<any[]>([]);
  const [checkoutLocks, setCheckoutLocks] = useState<any[]>([]);
  const [captains, setCaptains] = useState<any[]>([]);
  
  // Date range state for Gantt scheduler view
  const [ganttStartDate, setGanttStartDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  
  // Gantt Item detail modal state
  const [selectedGanttItem, setSelectedGanttItem] = useState<any | null>(null);
  const [showGanttModal, setShowGanttModal] = useState(false);

  // Hover states for Gantt detailed popover
  const [hoveredGanttItem, setHoveredGanttItem] = useState<any | null>(null);
  const [hoveredGanttPosition, setHoveredGanttPosition] = useState<{ x: number; y: number } | null>(null);

  const handleGanttItemMouseEnter = (e: React.MouseEvent, item: any) => {
    setHoveredGanttItem(item);
    setHoveredGanttPosition({ x: e.clientX, y: e.clientY });
  };

  const handleGanttItemMouseMove = (e: React.MouseEvent) => {
    setHoveredGanttPosition({ x: e.clientX, y: e.clientY });
  };

  const handleGanttItemMouseLeave = () => {
    setHoveredGanttItem(null);
    setHoveredGanttPosition(null);
  };
  
  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [vesselFilter, setVesselFilter] = useState('all');

  // Edit Drawer states
  const [editStatus, setEditStatus] = useState<any>('confirmed');
  const [editTripStatus, setEditTripStatus] = useState('scheduled');
  const [editNotes, setEditNotes] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [adminReplyText, setAdminReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

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

  const handleSelectBooking = async (b: any) => {
    setSelectedBooking(b);
    setEditStatus(b.status || 'confirmed');
    setEditTripStatus(b.tripStatus || 'scheduled');
    setEditNotes(b.operationalNotes || '');
    
    if (b.messageStatus === 'unread') {
      setBookings(prev => prev.map(item => item.id === b.id ? { ...item, messageStatus: 'read' } : item));
      await updateBookingMessageStatus(b.id, 'read');
    }
  };

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

  // Helper to find the Sunday of the week containing a date
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

  // Helper to find the first day of the month containing a date
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
        if (bookings.length > 0) {
          const dates = bookings
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

    return intervals.slice(0, 60); // Safety cap to avoid freezing browser layout on huge bounds
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

  // Filters calculation (includes date scope, search text, status, and vessel matching)
  const filteredBookings = bookings.filter(b => {
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
      if (b.status === 'cancelled') return;

      if (chartDateType === 'booking') {
        const bDate = getNormalizedDate(b.createdAt);
        if (!isWithinBounds(bDate)) return;

        let key = bDate;
        if (grouping === 'week') key = getSundayOfWeek(bDate);
        else if (grouping === 'month') key = getFirstDayOfMonth(bDate);

        if (dataMap[key]) {
          if (b.paymentPlan === 'full') {
            dataMap[key].cat1 += (b.amountPaidToday || 0);
          } else {
            dataMap[key].cat2 += (b.amountPaidToday || 0);
            dataMap[key].cat3 += (b.amountDueLater || 0);
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
            dataMap[key].cat1 += (b.amountPaidToday || 0);
          } else {
            dataMap[key].cat2 += (b.amountPaidToday || 0);
            dataMap[key].cat3 += (b.amountDueLater || 0);
          }
        }
      } else if (chartDateType === 'payment') {
        const payDate = getNormalizedDate(b.createdAt);
        if (isWithinBounds(payDate)) {
          let key = payDate;
          if (grouping === 'week') key = getSundayOfWeek(payDate);
          else if (grouping === 'month') key = getFirstDayOfMonth(payDate);

          if (dataMap[key]) {
            if (b.paymentPlan === 'full') {
              dataMap[key].cat1 += (b.amountPaidToday || 0);
            } else {
              dataMap[key].cat2 += (b.amountPaidToday || 0);
            }
          }
        }

        if (b.paymentPlan === 'deposit' && b.amountDueLater > 0) {
          const dueDate = getDueDateString(b.date);
          if (isWithinBounds(dueDate)) {
            let key = dueDate;
            if (grouping === 'week') key = getSundayOfWeek(dueDate);
            else if (grouping === 'month') key = getFirstDayOfMonth(dueDate);

            if (dataMap[key]) {
              dataMap[key].cat3 += (b.amountDueLater || 0);
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

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const [bookingsList, assetsList, locationsList, blackoutsList, locksList, staffList] = await Promise.all([
        getAllBookings(),
        getContentItems('asset'),
        getContentItems('location'),
        getAssetBlackouts(),
        getAllCheckoutLocks(),
        getContentItems('staff')
      ]);
      setBookings(bookingsList);
      setVessels(assetsList.filter((a: any) => a.isVessel));
      setGear(assetsList.filter((a: any) => !a.isVessel));
      setAllLocations(locationsList);
      setBlackouts(blackoutsList);
      setCheckoutLocks(locksList);
      setCaptains(staffList.filter((s: any) => s.isCaptain));
    } catch (err) {
      console.error('Failed to load dashboard operational data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBookings = fetchDashboardData;

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Poll selected booking when open to update messages dynamically
  useEffect(() => {
    if (!selectedBooking) return;
    
    const interval = setInterval(async () => {
      try {
        const updated = await getBookingById(selectedBooking.id);
        if (updated) {
          if (JSON.stringify(updated.messages || []) !== JSON.stringify(selectedBooking.messages || [])) {
            setSelectedBooking(updated);
            setBookings(prev => prev.map(b => b.id === updated.id ? updated : b));
          }
        }
      } catch (err) {
        console.warn('Error polling selected booking:', err);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [selectedBooking]);

  const handleSendAdminReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminReplyText.trim() || !selectedBooking || isSendingReply) return;

    setIsSendingReply(true);
    try {
      const ok = await sendBookingMessage(selectedBooking.id, 'admin', adminReplyText.trim());
      if (ok) {
        setAdminReplyText('');
        const updated = await getBookingById(selectedBooking.id);
        if (updated) {
          setSelectedBooking(updated);
          setBookings(prev => prev.map(b => b.id === updated.id ? updated : b));
        }
      } else {
        showToast('error', 'Failed to send reply.');
      }
    } catch (err) {
      console.error(err);
      showToast('error', 'Error sending reply.');
    } finally {
      setIsSendingReply(false);
    }
  };

  const handleDeleteBlackoutFromGantt = async (blackoutId: string) => {
    if (!confirm('Are you sure you want to delete this blackout period?')) return;
    try {
      const ok = await deleteAssetBlackout(blackoutId);
      if (ok) {
        showToast('success', 'Blackout period deleted.');
        setShowGanttModal(false);
        fetchDashboardData();
      } else {
        showToast('error', 'Failed to delete blackout.');
      }
    } catch (err) {
      console.error(err);
      showToast('error', 'Error occurred deleting blackout.');
    }
  };

  const getCaptainConflicts = () => {
    const conflicts: Array<{ captainName: string; date: string; details: string }> = [];
    
    const bookingsByDate: Record<string, any[]> = {};
    bookings.forEach(b => {
      if (b.status === 'cancelled' || !b.date || !b.captainId) return;
      if (!bookingsByDate[b.date]) {
        bookingsByDate[b.date] = [];
      }
      bookingsByDate[b.date].push(b);
    });

    Object.keys(bookingsByDate).forEach(dateStr => {
      const activeBookingsOnDate = bookingsByDate[dateStr];
      const captainBookings: Record<string, any[]> = {};
      activeBookingsOnDate.forEach(b => {
        if (!captainBookings[b.captainId]) {
          captainBookings[b.captainId] = [];
        }
        captainBookings[b.captainId].push(b);
      });

      Object.keys(captainBookings).forEach(capId => {
        const list = captainBookings[capId];
        if (list.length < 2) return;
        
        const sorted = [...list].sort((a, b) => a.startTime.localeCompare(b.startTime));
        
        for (let i = 0; i < sorted.length - 1; i++) {
          const b1 = sorted[i];
          const b2 = sorted[i+1];
          
          const lead1 = b1.leadTimeMinutes || 60;
          const crew1 = b1.crewDurationMinutes || 360;
          
          const start1 = new Date(`${dateStr}T${b1.startTime}:00`).getTime() - lead1 * 60 * 1000;
          const end1 = start1 + crew1 * 60 * 1000;

          const lead2 = b2.leadTimeMinutes || 60;
          const start2 = new Date(`${dateStr}T${b2.startTime}:00`).getTime() - lead2 * 60 * 1000;
          
          if (start2 < end1) {
            conflicts.push({
              captainName: b1.captainTitle || 'Captain',
              date: dateStr,
              details: `Scheduled on both "${b1.vesselTitle}" at ${b1.startTime} and "${b2.vesselTitle}" at ${b2.startTime}.`
            });
          }
        }
      });
    });

    return conflicts;
  };

  const getGearAllocationsForDate = (dateStr: string) => {
    const activeBookings = bookings.filter(b => b.date === dateStr && b.status !== 'cancelled');
    const allocated: Record<string, number> = {};
    
    activeBookings.forEach(b => {
      if (b.gearSlugs && b.gearSlugs.length > 0) {
        b.gearSlugs.forEach((slug: string) => {
          const count = slug.includes('snorkel') ? (b.guestCount || 2) : 1;
          allocated[slug] = (allocated[slug] || 0) + count;
        });
      }
    });
    
    return allocated;
  };

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const handleUpdateOperational = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBooking) return;
    setIsUpdating(true);
    try {
      const ok = await updateBookingOperationalFields(
        selectedBooking.id,
        editStatus,
        editTripStatus,
        editNotes
      );
      if (ok) {
        showToast('success', 'Booking logs updated successfully!');
        // Update local list
        setBookings(prev => prev.map(b => b.id === selectedBooking.id ? {
          ...b,
          status: editStatus,
          tripStatus: editTripStatus,
          operationalNotes: editNotes,
          updatedAt: new Date().toISOString()
        } : b));
        // Update selected object
        setSelectedBooking((prev: any) => ({
          ...prev,
          status: editStatus,
          tripStatus: editTripStatus,
          operationalNotes: editNotes
        }));
      } else {
        showToast('error', 'Failed to update booking fields');
      }
    } catch (err) {
      console.error(err);
      showToast('error', 'An error occurred during update');
    } finally {
      setIsUpdating(false);
    }
  };

  // Helper to format currency
  const formatCost = (val: number) => {
    return `$${Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };



  // Calculate timeframe filtered bookings for summary stats (excluding cancelled ones)
  const timeframeBookings = filteredBookings.filter(b => b.status !== 'cancelled');

  const unreadMessagesCount = bookings.filter(b => b.messageStatus === 'unread').length;

  const confirmedCount = timeframeBookings.filter(b => b.status === 'confirmed').length;
  const pendingWaiverCount = timeframeBookings.filter(b => b.status === 'pending waiver').length;
  
  const totalBookingValue = timeframeBookings
    .reduce((sum, b) => sum + (b.amountPaidToday || 0) + (b.amountDueLater || 0), 0);
    
  const totalRevenue = timeframeBookings
    .reduce((sum, b) => sum + (b.amountPaidToday || 0), 0);

  // Unique list of vessels for dropdown filter
  const vesselOptions = Array.from(new Set(bookings.map(b => b.vesselTitle).filter(Boolean)));

  return (
    <div style={{ minHeight: '100vh', background: '#121416', color: '#F4F1EA', fontFamily: "'Inter', sans-serif" }}>
      {/* Top Navbar */}
      <nav style={{ background: '#1E2124', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 600, fontSize: '1.25rem', color: '#B9783B' }}>
          <Anchor size={24} /> Bookings Command Center
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
        
        {unreadMessagesCount > 0 && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            borderRadius: '8px',
            padding: '0.85rem 1.25rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            fontSize: '0.82rem',
            color: '#F4F1EA',
            animation: 'fadeIn 0.2s ease-out'
          }}>
            <span style={{ background: '#ef4444', color: 'white', borderRadius: '4px', padding: '0.15rem 0.45rem', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase' }}>
              Action Required
            </span>
            <span>
              You have <strong>{unreadMessagesCount} booking{unreadMessagesCount > 1 ? 's' : ''}</strong> with pending guest messages. Look for the red <strong>New message</strong> dots in the list below.
            </span>
          </div>
        )}

        {/* Header Block */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '2.25rem', fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, margin: '0 0 0.5rem 0', letterSpacing: '0.02em' }}>
              Bareboat Charter Bookings
            </h1>
            <p style={{ color: '#D8C7AF', opacity: 0.8, margin: 0 }}>
              Track reservation schedules, verify digital waivers, audit payments, and log trip statuses.
            </p>
          </div>
          <button 
            onClick={fetchBookings}
            style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.02)', padding: '0.5rem 0.85rem', borderRadius: '6px', color: '#D8C7AF', cursor: 'pointer', fontSize: '0.8rem' }}
          >
            <RefreshCw size={14} /> Refresh Data
          </button>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', animation: 'fadeIn 0.2s ease' }}>
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
              <span style={{ fontSize: '0.75rem', color: '#D8C7AF', opacity: 0.6, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Booking Value</span>
              <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white' }}>{formatCost(totalBookingValue)}</span>
            </div>
          </div>

          <div style={{ background: '#1E2124', border: '1px solid rgba(255,255,255,0.05)', padding: '1.25rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ background: 'rgba(13, 148, 136, 0.1)', color: '#0D9488', padding: '0.75rem', borderRadius: '8px' }}>
              <DollarSign size={24} />
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: '#D8C7AF', opacity: 0.6, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Revenue Paid</span>
              <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white' }}>{formatCost(totalRevenue)}</span>
            </div>
          </div>

        </div>

        {/* Tab Selection: Bookings & Finance vs Fleet Scheduler Timeline */}
        <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: '2.5rem', marginTop: '1rem', paddingBottom: '1px' }}>
          <button 
            type="button"
            onClick={() => setActiveDashboardTab('finance')}
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: activeDashboardTab === 'finance' ? '2px solid #B9783B' : '2px solid transparent',
              color: activeDashboardTab === 'finance' ? '#F4F1EA' : '#D8C7AF',
              padding: '0.75rem 1.25rem',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '1rem',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <DollarSign size={18} /> Bookings & Financial Analytics
          </button>
          <button 
            type="button"
            onClick={() => setActiveDashboardTab('gantt')}
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: activeDashboardTab === 'gantt' ? '2px solid #B9783B' : '2px solid transparent',
              color: activeDashboardTab === 'gantt' ? '#F4F1EA' : '#D8C7AF',
              padding: '0.75rem 1.25rem',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '1rem',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <Calendar size={18} /> Fleet Operations Scheduler
          </button>
        </div>

        {activeDashboardTab === 'finance' && (
          <>
            {/* Dynamic Stacked Bar Chart */}
            <div style={{ background: '#1E2124', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '1.5rem', marginBottom: '2.5rem' }}>
          
          {/* Header Row: Title Only */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.75rem', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, color: 'white', margin: 0 }}>
              Financial Timeline Breakdown
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
                <span>Total Expected: <strong style={{ color: '#B9783B', fontSize: '0.8rem' }}>{formatCost(hoveredBar.total)}</strong></span>
                <span style={{ height: '10px', width: '1px', background: 'rgba(255,255,255,0.1)' }} />
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                    <span style={{ width: '8px', height: '8px', background: '#708C84', borderRadius: '50%' }} />
                    Full Paid/Completed: <strong style={{ color: '#F4F1EA' }}>{formatCost(hoveredBar.cat1)}</strong>
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                    <span style={{ width: '8px', height: '8px', background: '#0D9488', borderRadius: '50%' }} />
                    Upfront Deposits: <strong style={{ color: '#F4F1EA' }}>{formatCost(hoveredBar.cat2)}</strong>
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                    <span style={{ width: '8px', height: '8px', background: '#F97316', borderRadius: '50%' }} />
                    Balances Due: <strong style={{ color: '#F4F1EA' }}>{formatCost(hoveredBar.cat3)}</strong>
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
              No transaction data available for the current selection.
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
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', justifyContent: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.75rem', fontSize: '0.7rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <div style={{ width: '10px', height: '10px', background: '#708C84', borderRadius: '2px' }} />
                  <span style={{ color: '#D8C7AF' }}>Completed / Full Payments</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <div style={{ width: '10px', height: '10px', background: '#0D9488', borderRadius: '2px' }} />
                  <span style={{ color: '#D8C7AF' }}>Deposits Paid</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <div style={{ width: '10px', height: '10px', background: '#F97316', borderRadius: '2px' }} />
                  <span style={{ color: '#D8C7AF' }}>Future Balances Due (Orange)</span>
                </div>
              </div>
            </div>
          )}
        </div>

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
                  <th style={{ padding: '0.85rem 1rem' }}>Vessel & Captain</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Schedule</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Paid Today</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Balance Due</th>
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
                    <div style={{ fontSize: '0.65rem', color: '#D8C7AF', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Paid</div>
                    <div>{formatCost(filteredBookings.reduce((sum, b) => sum + (b.amountPaidToday || 0), 0))}</div>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: '#ef4444', fontWeight: 700, fontSize: '0.85rem' }}>
                    <div style={{ fontSize: '0.65rem', color: '#D8C7AF', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Due</div>
                    <div>{formatCost(filteredBookings.reduce((sum, b) => sum + (b.amountDueLater || 0), 0))}</div>
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}></td>
                  <td style={{ padding: '0.75rem 1rem' }}></td>
                  <td style={{ padding: '0.75rem 1rem' }}></td>
                  <td style={{ padding: '0.75rem 1rem' }}></td>
                </tr>

                {filteredBookings.map(b => (
                  <tr 
                    key={b.id} 
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer', transition: 'all 0.15s' }}
                    onClick={() => handleSelectBooking(b)}
                    onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.015)'}
                    onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '1rem', fontWeight: 700, color: 'white', fontFamily: 'monospace' }}>BK-{b.id}</td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ fontWeight: 600, color: 'white' }}>{b.guestName}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', opacity: 0.6, fontSize: '0.74rem', color: '#D8C7AF' }}>
                        <span>{b.guestEmail}</span>
                      </div>
                      {b.messages && b.messages.length > 0 && (() => {
                        const status = b.messageStatus || 'unread';
                        let badgeBg = 'rgba(239, 68, 68, 0.12)';
                        let badgeColor = '#ef4444';
                        let statusText = 'New message';
                        
                        if (status === 'read') {
                          badgeBg = 'rgba(226, 161, 94, 0.12)';
                          badgeColor = '#E2A15E';
                          statusText = 'Read';
                        } else if (status === 'answered') {
                          badgeBg = 'rgba(112, 140, 132, 0.12)';
                          badgeColor = '#708C84';
                          statusText = 'Answered';
                        }
                        
                        return (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.35rem' }}>
                            <span style={{ 
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              fontSize: '0.62rem', 
                              padding: '0.1rem 0.4rem', 
                              borderRadius: '4px', 
                              fontWeight: 700,
                              background: badgeBg, 
                              color: badgeColor
                            }}>
                              <span style={{ display: 'inline-block', width: '5px', height: '5px', borderRadius: '50%', background: badgeColor }} />
                              {statusText}
                            </span>
                            <span style={{ fontSize: '0.62rem', color: '#D8C7AF', opacity: 0.5 }}>
                              ({new Date(b.messages[b.messages.length - 1].timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })})
                            </span>
                          </div>
                        );
                      })()}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ color: '#D8C7AF' }}>{b.vesselTitle}</div>
                      <div style={{ opacity: 0.6, fontSize: '0.74rem' }}>{b.captainTitle}</div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ color: 'white', fontWeight: 500 }}>{b.date}</div>
                      <div style={{ opacity: 0.6, fontSize: '0.74rem', color: '#D8C7AF' }}>@{b.startTime}</div>
                    </td>
                    <td style={{ padding: '1rem', color: '#B9783B', fontWeight: 600 }}>{formatCost(b.amountPaidToday)}</td>
                    <td style={{ padding: '1rem', color: '#ef4444', fontWeight: 600 }}>{formatCost(b.amountDueLater)}</td>
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
                          handleSelectBooking(b);
                        }}
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '4px', padding: '0.35rem 0.55rem', cursor: 'pointer', color: '#D8C7AF', transition: 'all 0.2s', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                      >
                        <Eye size={12} /> Manage
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
          </>
        )}

        {/* Fleet Operations Gantt Scheduler Grid */}
        {activeDashboardTab === 'gantt' && (() => {
          const DAY_START = 6 * 60; // 06:00
          const DAY_END = 22 * 60;  // 22:00
          const DAY_DURATION = DAY_END - DAY_START; // 960 mins

          const getEventTimeRange = (ev: any, dateStr: string) => {
            let startTotal = 6 * 60;
            let endTotal = 22 * 60;

            if (ev.ganttType === 'booking') {
              const leadMins = ev.leadTimeMinutes !== undefined ? ev.leadTimeMinutes : 60;
              const crewMins = ev.crewDurationMinutes !== undefined ? ev.crewDurationMinutes : 360;
              if (ev.startTime) {
                const parts = ev.startTime.split(':');
                const h = parseInt(parts[0], 10) || 0;
                const m = parseInt(parts[1], 10) || 0;
                const guestStart = h * 60 + m;
                startTotal = guestStart - leadMins;
                endTotal = startTotal + crewMins;
              }
            } else if (ev.ganttType === 'lock') {
              if (ev.startTime) {
                const parts = ev.startTime.split(':');
                const h = parseInt(parts[0], 10) || 0;
                const m = parseInt(parts[1], 10) || 0;
                startTotal = h * 60 + m;
                endTotal = startTotal + 30; // Holds are 30 mins
              }
            } else if (ev.ganttType === 'blackout') {
              const isStartDay = ev.startDate === dateStr;
              const isEndDay = ev.endDate === dateStr;
              
              if (isStartDay && ev.startTime) {
                const parts = ev.startTime.split(':');
                const h = parseInt(parts[0], 10) || 0;
                const m = parseInt(parts[1], 10) || 0;
                startTotal = h * 60 + m;
              } else {
                startTotal = 6 * 60;
              }
              
              if (isEndDay && ev.endTime) {
                const parts = ev.endTime.split(':');
                const h = parseInt(parts[0], 10) || 0;
                const m = parseInt(parts[1], 10) || 0;
                endTotal = h * 60 + m;
              } else {
                endTotal = 22 * 60;
              }
            }

            return { startTotal, endTotal };
          };

          const weekDates = generateIntervals(
            new Date(ganttStartDate + 'T00:00:00'),
            new Date(new Date(ganttStartDate + 'T00:00:00').getTime() + 6 * 24 * 60 * 60 * 1000),
            'day'
          );

          const parsedVesselData = vessels.map(vessel => {
            const dayDataList = weekDates.map(dateStr => {
              const cellBookings = bookings.filter(b => b.vesselSlug === vessel.slug && b.date === dateStr && b.status !== 'cancelled');
              const cellBlackouts = blackouts.filter(b => b.vesselSlug === vessel.slug && dateStr >= b.startDate && dateStr <= b.endDate);
              const cellLocks = checkoutLocks.filter(l => l.vesselSlug === vessel.slug && l.date === dateStr);

              const rawEvents = [
                ...cellBookings.map(b => ({ ...b, ganttType: 'booking' })),
                ...cellBlackouts.map(b => ({ ...b, type: 'blackout', ganttType: 'blackout' })),
                ...cellLocks.map(l => ({ ...l, type: 'lock', ganttType: 'lock' }))
              ];

              const eventsWithTimes = rawEvents.map(ev => {
                const { startTotal, endTotal } = getEventTimeRange(ev, dateStr);
                return {
                  ...ev,
                  opStart: startTotal,
                  opEnd: endTotal
                };
              });

              eventsWithTimes.sort((a, b) => a.opStart - b.opStart);

              const lanes: number[] = [];
              const eventsWithLanes = eventsWithTimes.map(ev => {
                let laneIdx = -1;
                for (let i = 0; i < lanes.length; i++) {
                  if (ev.opStart >= lanes[i]) {
                    lanes[i] = ev.opEnd;
                    laneIdx = i;
                    break;
                  }
                }
                if (laneIdx === -1) {
                  lanes.push(ev.opEnd);
                  laneIdx = lanes.length - 1;
                }
                return {
                  ...ev,
                  lane: laneIdx
                };
              });

              return {
                dateStr,
                events: eventsWithLanes,
                laneCount: Math.max(lanes.length, 1)
              };
            });

            const maxLanes = Math.max(...dayDataList.map(d => d.laneCount), 1);
            return {
              vessel,
              days: dayDataList,
              maxLanes
            };
          });

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', animation: 'fadeIn 0.2s ease' }}>
              
              {/* Controls Row */}
              <div style={{ background: '#1E2124', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <span style={{ fontSize: '0.68rem', color: '#D8C7AF', opacity: 0.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>View Start Date</span>
                    <input
                      type="date"
                      value={ganttStartDate}
                      onChange={e => setGanttStartDate(e.target.value)}
                      style={{ padding: '0.45rem 0.75rem', background: '#121416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', fontSize: '0.78rem', outline: 'none', colorScheme: 'dark' }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '0.25rem', marginTop: '1rem' }}>
                    <button
                      onClick={() => {
                        const d = new Date(ganttStartDate + 'T00:00:00');
                        d.setDate(d.getDate() - 7);
                        setGanttStartDate(d.toISOString().split('T')[0]);
                      }}
                      style={{ background: '#121416', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '4px', padding: '0.4rem 0.75rem', color: '#D8C7AF', fontSize: '0.75rem', cursor: 'pointer' }}
                      title="Previous Week"
                    >
                      « Week
                    </button>
                    <button
                      onClick={() => {
                        const d = new Date(ganttStartDate + 'T00:00:00');
                        d.setDate(d.getDate() - 1);
                        setGanttStartDate(d.toISOString().split('T')[0]);
                      }}
                      style={{ background: '#121416', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '4px', padding: '0.4rem 0.75rem', color: '#D8C7AF', fontSize: '0.75rem', cursor: 'pointer' }}
                      title="Previous Day"
                    >
                      ‹ Day
                    </button>
                    <button
                      onClick={() => setGanttStartDate(new Date().toISOString().split('T')[0])}
                      style={{ background: '#121416', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '4px', padding: '0.4rem 0.75rem', color: '#B9783B', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                    >
                      Today
                    </button>
                    <button
                      onClick={() => {
                        const d = new Date(ganttStartDate + 'T00:00:00');
                        d.setDate(d.getDate() + 1);
                        setGanttStartDate(d.toISOString().split('T')[0]);
                      }}
                      style={{ background: '#121416', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '4px', padding: '0.4rem 0.75rem', color: '#D8C7AF', fontSize: '0.75rem', cursor: 'pointer' }}
                      title="Next Day"
                    >
                      Day ›
                    </button>
                    <button
                      onClick={() => {
                        const d = new Date(ganttStartDate + 'T00:00:00');
                        d.setDate(d.getDate() + 7);
                        setGanttStartDate(d.toISOString().split('T')[0]);
                      }}
                      style={{ background: '#121416', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '4px', padding: '0.4rem 0.75rem', color: '#D8C7AF', fontSize: '0.75rem', cursor: 'pointer' }}
                      title="Next Week"
                    >
                      Week »
                    </button>
                  </div>
                </div>

                {/* Legend */}
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.72rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <span style={{ width: '10px', height: '10px', background: 'rgba(185, 120, 59, 0.15)', border: '1px solid rgba(185, 120, 59, 0.4)', borderRadius: '3px' }} />
                    Confirmed
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <span style={{ width: '10px', height: '10px', background: 'rgba(216, 199, 175, 0.1)', border: '1px solid rgba(216, 199, 175, 0.3)', borderRadius: '3px' }} />
                    Pending Waiver
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <span style={{ width: '10px', height: '10px', background: 'rgba(150, 150, 150, 0.15)', border: '1px solid rgba(150, 150, 150, 0.3)', borderRadius: '3px' }} />
                    Checkout Hold
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <span style={{ width: '10px', height: '10px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '3px' }} />
                    Maintenance Blackout
                  </span>
                </div>
              </div>

              {/* Captain Double Booking Alerts */}
              {getCaptainConflicts().length > 0 && (
                <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#EF4444', fontWeight: 600, fontSize: '0.9rem' }}>
                    <AlertCircle size={18} />
                    <span>Captain Schedule Collisions Detected ({getCaptainConflicts().length})</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {getCaptainConflicts().map((conf, idx) => (
                      <div key={idx} style={{ fontSize: '0.82rem', color: '#D8C7AF', display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                        <strong style={{ color: 'white' }}>{conf.captainName}</strong> on <span style={{ color: '#E2A15E' }}>{conf.date}</span>: {conf.details}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Gantt Grid Panel */}
              <div style={{ background: '#1E2124', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', overflow: 'hidden' }}>
                <div style={{ overflowX: 'hidden', overflowY: 'hidden', width: '100%' }}>
                    
                    {/* Grid Header Row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '160px repeat(7, 1fr)', background: '#121416', borderBottom: '1px solid rgba(255,255,255,0.08)', position: 'sticky', top: 0, zIndex: 10 }}>
                      <div style={{ padding: '1rem', fontWeight: 600, fontSize: '0.85rem', color: '#B9783B', background: '#121416', position: 'sticky', left: 0, zIndex: 11, borderRight: '1px solid rgba(255,255,255,0.05)' }}>Vessel / Fleet</div>
                      {weekDates.map(dateStr => {
                        const dateObj = new Date(dateStr + 'T00:00:00');
                        const dayLabel = dateObj.toLocaleDateString(undefined, { weekday: 'short' });
                        const dateLabel = dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                        return (
                          <div key={dateStr} style={{ padding: '0.5rem 0.25rem 0.25rem 0.25rem', borderLeft: '1px solid rgba(255,255,255,0.05)', textAlign: 'center', display: 'flex', flexDirection: 'column', background: '#121416' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'white' }}>{dayLabel}</span>
                            <span style={{ fontSize: '0.68rem', color: '#D8C7AF', opacity: 0.6, marginBottom: '0.25rem' }}>{dateLabel}</span>
                            <div style={{ position: 'relative', width: '100%', height: '14px', marginTop: '0.15rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.15rem' }}>
                              <span style={{ position: 'absolute', left: '0%', fontSize: '0.55rem', color: '#D8C7AF', opacity: 0.4 }}>6a</span>
                              <span style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', fontSize: '0.55rem', color: '#D8C7AF', opacity: 0.4 }}>2p</span>
                              <span style={{ position: 'absolute', right: '0%', fontSize: '0.55rem', color: '#D8C7AF', opacity: 0.4 }}>10p</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Grid Body Rows */}
                    {parsedVesselData.map(({ vessel, days, maxLanes }) => {
                      const laneHeight = 36;
                      const rowHeight = maxLanes * laneHeight + 16;

                      return (
                        <div key={vessel.id} style={{ display: 'grid', gridTemplateColumns: '160px repeat(7, 1fr)', borderBottom: '1px solid rgba(255,255,255,0.05)', height: `${rowHeight}px` }}>
                          
                          {/* Vessel Cell */}
                          <div style={{ 
                            padding: '0.75rem', 
                            display: 'flex', 
                            flexDirection: 'column', 
                            gap: '0.25rem', 
                            background: '#121416', 
                            borderRight: '1px solid rgba(255,255,255,0.05)', 
                            position: 'sticky', 
                            left: 0, 
                            zIndex: 8, 
                            height: '100%', 
                            boxSizing: 'border-box' 
                          }}>
                            <span style={{ fontWeight: 600, fontSize: '0.82rem', color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{vessel.title}</span>
                            <span style={{ fontSize: '0.7rem', color: '#D8C7AF', opacity: 0.5 }}>Cap: {vessel.maxGuests || 12} guests</span>
                            <span style={{ fontSize: '0.65rem', color: '#B9783B', fontWeight: 600, background: 'rgba(185,120,59,0.1)', padding: '1px 4px', borderRadius: '4px', width: 'fit-content', marginTop: '0.15rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              ⚓ {allLocations.find(l => l.slug === vessel.homeLocation)?.title || vessel.homeLocation || 'Destin'}
                            </span>
                          </div>

                          {/* Day Cells */}
                          {days.map(dayData => {
                            return (
                              <div 
                                key={dayData.dateStr} 
                                style={{ 
                                  position: 'relative', 
                                  borderLeft: '1px solid rgba(255,255,255,0.05)', 
                                  background: 'rgba(255,255,255,0.005)',
                                  height: '100%'
                                }}
                              >
                                {/* Grid Line background stripes at 25%, 50%, 75% */}
                                <div style={{ position: 'absolute', inset: 0, display: 'flex', pointerEvents: 'none' }}>
                                  <div style={{ width: '25%', borderRight: '1px solid rgba(255,255,255,0.03)' }} />
                                  <div style={{ width: '25%', borderRight: '1px solid rgba(255,255,255,0.03)' }} />
                                  <div style={{ width: '25%', borderRight: '1px solid rgba(255,255,255,0.03)' }} />
                                  <div style={{ width: '25%' }} />
                                </div>

                                {dayData.events.map((ev, idx) => {
                                  const startClamp = Math.max(DAY_START, Math.min(DAY_END, ev.opStart));
                                  const endClamp = Math.max(DAY_START, Math.min(DAY_END, ev.opEnd));
                                  
                                  if (endClamp <= startClamp) return null;

                                  const leftPercent = ((startClamp - DAY_START) / DAY_DURATION) * 100;
                                  const widthPercent = ((endClamp - startClamp) / DAY_DURATION) * 100;

                                  const topOffset = 8 + ev.lane * laneHeight;

                                  let bgColor = 'rgba(255,255,255,0.05)';
                                  let borderColor = 'rgba(255,255,255,0.1)';
                                  let textColor = '#D8C7AF';
                                  let titleStr = '';
                                  let timeStr = '';

                                  if (ev.ganttType === 'lock') {
                                    bgColor = 'rgba(255, 255, 255, 0.03)';
                                    borderColor = 'rgba(255, 255, 255, 0.1)';
                                    textColor = 'rgba(255, 255, 255, 0.4)';
                                    titleStr = `Hold: ${ev.holderEmail}`;
                                    timeStr = ev.startTime;
                                  } else if (ev.ganttType === 'blackout') {
                                    bgColor = 'rgba(239, 68, 68, 0.08)';
                                    borderColor = 'rgba(239, 68, 68, 0.25)';
                                    textColor = '#F87171';
                                    titleStr = `Blackout: ${ev.title}`;
                                    timeStr = ev.startTime ? `${ev.startTime} - ${ev.endTime || 'End'}` : 'All Day';
                                  } else {
                                    const isWaiver = ev.status === 'pending waiver';
                                    bgColor = isWaiver ? 'rgba(216, 199, 175, 0.08)' : 'rgba(185, 120, 59, 0.12)';
                                    borderColor = isWaiver ? 'rgba(216, 199, 175, 0.25)' : 'rgba(185, 120, 59, 0.35)';
                                    textColor = isWaiver ? '#D8C7AF' : '#E2A15E';
                                    titleStr = `${ev.guestName} (${ev.experienceTitle})`;
                                    timeStr = ev.startTime;
                                  }

                                  return (
                                    <div
                                      key={idx}
                                      onClick={() => {
                                        setSelectedGanttItem(ev);
                                        setShowGanttModal(true);
                                      }}
                                      onMouseEnter={(e) => handleGanttItemMouseEnter(e, ev)}
                                      onMouseMove={(e) => handleGanttItemMouseMove(e)}
                                      onMouseLeave={handleGanttItemMouseLeave}
                                      style={{
                                        position: 'absolute',
                                        left: `${leftPercent}%`,
                                        width: `${widthPercent}%`,
                                        top: `${topOffset}px`,
                                        height: '28px',
                                        background: bgColor,
                                        border: `1px solid ${borderColor}`,
                                        borderRadius: '4px',
                                        padding: '2px 6px',
                                        fontSize: '0.68rem',
                                        color: textColor,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'center',
                                        transition: 'filter 0.15s, transform 0.15s',
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                                        zIndex: 2,
                                        boxSizing: 'border-box'
                                      }}
                                      onMouseOver={e => {
                                        e.currentTarget.style.filter = 'brightness(1.15)';
                                        e.currentTarget.style.transform = 'scaleY(1.03)';
                                      }}
                                      onMouseOut={e => {
                                        e.currentTarget.style.filter = 'none';
                                        e.currentTarget.style.transform = 'none';
                                      }}
                                    >
                                      <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={titleStr}>
                                        {titleStr}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Accessory & Gear Depletion Gauges */}
              <div style={{ background: '#1E2124', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '1.5rem' }}>
                <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.75rem', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '1.1rem', fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, color: 'white', margin: 0 }}>
                    Accessory & Gear Stock Allocations
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: '#D8C7AF', opacity: 0.6 }}>
                    Showing allocations for timeline date: <strong style={{ color: 'white' }}>{ganttStartDate}</strong>
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                  {gear.map(g => {
                    const maxQty = g.quantity || 12;
                    const allocated = getGearAllocationsForDate(ganttStartDate)[g.slug] || 0;
                    const pct = Math.min(Math.round((allocated / maxQty) * 100), 100);
                    const isHigh = pct >= 80;
                    
                    return (
                      <div key={g.id} style={{ background: '#121416', border: '1px solid rgba(255,255,255,0.04)', padding: '1rem', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <span style={{ fontWeight: 600, fontSize: '0.88rem', color: 'white' }}>{g.title}</span>
                            <span style={{ display: 'block', fontSize: '0.75rem', color: '#D8C7AF', opacity: 0.5 }}>Add-on Accessory Stock</span>
                          </div>
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: isHigh ? '#EF4444' : '#708C84' }}>
                            {allocated} / {maxQty}
                          </span>
                        </div>
                        
                        {/* Progress bar */}
                        <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: isHigh ? '#EF4444' : '#B9783B', borderRadius: '3px', transition: 'width 0.3s ease' }} />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: '#D8C7AF', opacity: 0.6 }}>
                          <span>{pct}% Capacity Used</span>
                          {isHigh && <span style={{ color: '#EF4444', fontWeight: 600 }}>⚠️ Critical Stock Risk</span>}
                        </div>
                      </div>
                    );
                  })}

                  {gear.length === 0 && (
                    <div style={{ gridColumn: '1 / -1', padding: '2rem', textAlign: 'center', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '6px', color: '#D8C7AF', opacity: 0.5, fontSize: '0.8rem' }}>
                      No gear accessory stocks registered in asset inventory.
                    </div>
                  )}
                </div>
              </div>

            </div>
          );
        })()}
      </main>

      {/* GANTT DETAIL MODAL */}
      {showGanttModal && selectedGanttItem && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(3px)' }} onClick={() => setShowGanttModal(false)}>
          <div style={{ width: '100%', maxWidth: '500px', background: '#1E2124', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '2rem', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', position: 'relative' }} onClick={e => e.stopPropagation()}>
            
            {/* Modal Header */}
            <div style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.75rem', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.3rem', fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, color: 'white', margin: 0 }}>
                {selectedGanttItem.ganttType === 'lock' 
                  ? 'Checkout Lock Hold' 
                  : selectedGanttItem.ganttType === 'blackout' 
                    ? 'Maintenance Blackout' 
                    : 'Charter Reservation Details'}
              </h3>
              <button onClick={() => setShowGanttModal(false)} style={{ background: 'transparent', border: 'none', color: '#D8C7AF', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.86rem', color: '#D8C7AF' }}>
              
              {selectedGanttItem.ganttType === 'lock' && (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>Holder Email / Identifier</span>
                    <strong style={{ color: 'white' }}>{selectedGanttItem.holderEmail}</strong>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem' }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>Hold Date</span>
                      <strong style={{ color: 'white', display: 'block' }}>{selectedGanttItem.date}</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>Start Time</span>
                      <strong style={{ color: 'white', display: 'block' }}>{selectedGanttItem.startTime}</strong>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>Expires At</span>
                    <strong style={{ color: 'white' }}>{new Date(selectedGanttItem.expiresAt).toLocaleTimeString()}</strong>
                  </div>
                </>
              )}

              {selectedGanttItem.ganttType === 'blackout' && (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>Reason / Title</span>
                    <strong style={{ color: 'white', fontSize: '1rem' }}>{selectedGanttItem.title}</strong>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem' }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>Start Schedule</span>
                      <strong style={{ color: 'white', display: 'block' }}>{selectedGanttItem.startDate} {selectedGanttItem.startTime && `@ ${selectedGanttItem.startTime}`}</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>End Schedule</span>
                      <strong style={{ color: 'white', display: 'block' }}>{selectedGanttItem.endDate} {selectedGanttItem.endTime && `@ ${selectedGanttItem.endTime}`}</strong>
                    </div>
                  </div>
                  {selectedGanttItem.notes && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>Maintenance Notes</span>
                      <p style={{ margin: 0, color: 'white', lineHeight: '1.4' }}>{selectedGanttItem.notes}</p>
                    </div>
                  )}
                  <button
                    onClick={() => handleDeleteBlackoutFromGantt(selectedGanttItem.id)}
                    style={{ marginTop: '1.5rem', background: '#EF4444', color: 'white', border: 'none', padding: '0.65rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, transition: 'background 0.2s' }}
                    onMouseOver={e => e.currentTarget.style.background = '#DC2626'}
                    onMouseOut={e => e.currentTarget.style.background = '#EF4444'}
                  >
                    Delete Blackout Period
                  </button>
                </>
              )}

              {selectedGanttItem.ganttType === 'booking' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>Guest Name</span>
                      <strong style={{ color: 'white', display: 'block', fontSize: '0.95rem' }}>{selectedGanttItem.guestName}</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>Excursion Voyage</span>
                      <strong style={{ color: '#B9783B', display: 'block', fontSize: '0.95rem' }}>{selectedGanttItem.experienceTitle}</strong>
                    </div>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.25rem' }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>Date & Time</span>
                      <strong style={{ color: 'white', display: 'block' }}>{selectedGanttItem.date} @ {selectedGanttItem.startTime}</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>Assigned Vessel</span>
                      <strong style={{ color: 'white', display: 'block' }}>{selectedGanttItem.vesselTitle}</strong>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.25rem' }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>Guest Email</span>
                      <span style={{ color: 'white', display: 'block', wordBreak: 'break-all' }}>{selectedGanttItem.guestEmail}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>Guest Phone</span>
                      <span style={{ color: 'white', display: 'block' }}>{selectedGanttItem.guestPhone}</span>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.25rem' }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>Start Port</span>
                      <span style={{ color: 'white', display: 'block', fontWeight: 600 }}>
                        {allLocations.find(l => l.slug === selectedGanttItem.startLocation)?.title || selectedGanttItem.startLocation || 'Destin Harbor'}
                      </span>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>End Port</span>
                      <span style={{ color: 'white', display: 'block', fontWeight: 600 }}>
                        {allLocations.find(l => l.slug === selectedGanttItem.endLocation)?.title || selectedGanttItem.endLocation || 'Destin Harbor'}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.25rem' }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>Waiver Status</span>
                      <span style={{ color: selectedGanttItem.waiverSigned ? '#10B981' : '#EF4444', fontWeight: 600, display: 'block' }}>
                        {selectedGanttItem.waiverSigned ? '✓ Signed' : '✗ Pending'}
                      </span>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>Split Payment Plan</span>
                      <span style={{ color: '#D8C7AF', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>
                        {selectedGanttItem.paymentPlan === 'deposit' ? 'Deposit Split' : 'Paid in Full'}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.25rem', background: 'rgba(0,0,0,0.15)', padding: '0.75rem', borderRadius: '6px' }}>
                    <div>
                      <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>Upfront Deposit Paid</span>
                      <strong style={{ color: 'white', display: 'block', fontSize: '1rem' }}>{formatCost(selectedGanttItem.amountPaidToday)}</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>Due At Charter Date</span>
                      <strong style={{ color: selectedGanttItem.amountDueLater > 0 ? '#F97316' : '#10B981', display: 'block', fontSize: '1rem' }}>{formatCost(selectedGanttItem.amountDueLater)}</strong>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                    <button
                      onClick={() => {
                        setSelectedGanttItem(null);
                        setShowGanttModal(false);
                        setSelectedBooking(selectedGanttItem);
                        setEditStatus(selectedGanttItem.status || 'confirmed');
                        setEditTripStatus(selectedGanttItem.tripStatus || 'scheduled');
                        setEditNotes(selectedGanttItem.operationalNotes || '');
                      }}
                      style={{ flex: 1, background: '#B9783B', color: 'white', border: 'none', padding: '0.65rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, transition: 'background 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
                      onMouseOver={e => e.currentTarget.style.background = '#A0632E'}
                      onMouseOut={e => e.currentTarget.style.background = '#B9783B'}
                    >
                      <Edit3 size={14} /> Open Operational Logs
                    </button>
                    <button
                      onClick={() => {
                        setShowGanttModal(false);
                        router.push(`/admin/customers?search=${encodeURIComponent(selectedGanttItem.guestEmail)}`);
                      }}
                      style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#D8C7AF', padding: '0.65rem 1rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
                    >
                      Guest Profile
                    </button>
                  </div>
                </>
              )}
              
            </div>

          </div>
        </div>
      )}

      {/* Dynamic Hover Tooltip Card */}
      {hoveredGanttItem && hoveredGanttPosition && (
        <div 
          style={{
            position: 'fixed',
            left: `${(() => {
              const tooltipWidth = 320;
              let x = hoveredGanttPosition.x + 15;
              if (typeof window !== 'undefined' && x + tooltipWidth > window.innerWidth) {
                x = hoveredGanttPosition.x - tooltipWidth - 15;
              }
              return x;
            })()}px`,
            top: `${(() => {
              const tooltipHeight = 220;
              let y = hoveredGanttPosition.y + 15;
              if (typeof window !== 'undefined' && y + tooltipHeight > window.innerHeight) {
                y = hoveredGanttPosition.y - tooltipHeight - 15;
              }
              return y;
            })()}px`,
            zIndex: 2000,
            background: 'rgba(30, 33, 36, 0.94)',
            backdropFilter: 'blur(12px)',
            border: hoveredGanttItem.ganttType === 'blackout' 
              ? '1px solid rgba(239, 68, 68, 0.4)' 
              : hoveredGanttItem.ganttType === 'lock' 
                ? '1px solid rgba(255, 255, 255, 0.25)' 
                : '1px solid rgba(185, 120, 59, 0.4)',
            borderRadius: '8px',
            padding: '1rem',
            width: '320px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
            pointerEvents: 'none',
            fontSize: '0.78rem',
            color: '#D8C7AF',
            fontFamily: "'Inter', sans-serif",
            animation: 'fadeIn 0.15s ease'
          }}
        >
          {hoveredGanttItem.ganttType === 'booking' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.35rem' }}>
                <div>
                  <div style={{ fontWeight: 700, color: 'white', fontSize: '0.85rem' }}>{hoveredGanttItem.guestName}</div>
                  <div style={{ fontSize: '0.68rem', opacity: 0.6 }}>BK-{hoveredGanttItem.id}</div>
                </div>
                <span style={{ 
                  fontSize: '0.62rem', 
                  padding: '0.1rem 0.35rem', 
                  borderRadius: '3px', 
                  fontWeight: 700,
                  background: hoveredGanttItem.status === 'confirmed' ? 'rgba(185,120,59,0.2)' : 'rgba(255,255,255,0.08)',
                  color: hoveredGanttItem.status === 'confirmed' ? '#B9783B' : '#D8C7AF'
                }}>
                  {hoveredGanttItem.status}
                </span>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <div>Voyage: <strong style={{ color: 'white' }}>{hoveredGanttItem.experienceTitle}</strong></div>
                <div>Vessel: <strong style={{ color: 'white' }}>{hoveredGanttItem.vesselTitle}</strong></div>
                <div>Captain: <strong style={{ color: 'white' }}>{hoveredGanttItem.captainTitle || 'Not Assigned'}</strong></div>
                <div>Date & Time: <strong style={{ color: '#B9783B' }}>{hoveredGanttItem.date} @ {hoveredGanttItem.startTime}</strong></div>
                
                <div style={{ fontSize: '0.7rem', color: '#708C84', background: 'rgba(112,140,132,0.08)', padding: '4px 6px', borderRadius: '4px', marginTop: '0.2rem' }}>
                  🕒 Operational Block: {(() => {
                    const lead = hoveredGanttItem.leadTimeMinutes || 60;
                    const crew = hoveredGanttItem.crewDurationMinutes || 360;
                    const parts = (hoveredGanttItem.startTime || '00:00').split(':');
                    const startMins = (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0);
                    const opStart = startMins - lead;
                    const opEnd = opStart + crew;
                    
                    const formatMin = (m: number) => {
                      const hr = Math.floor(m / 60) % 24;
                      const mn = m % 60;
                      return `${hr.toString().padStart(2, '0')}:${mn.toString().padStart(2, '0')}`;
                    };
                    return `${formatMin(opStart)} - ${formatMin(opEnd)} (${lead}m prep + ${crew - lead}m trip)`;
                  })()}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.35rem', fontSize: '0.7rem' }}>
                <div>Waiver: <span style={{ color: hoveredGanttItem.waiverSigned ? '#10B981' : '#EF4444', fontWeight: 600 }}>{hoveredGanttItem.waiverSigned ? 'Signed' : 'Pending'}</span></div>
                <div>Guests: <span style={{ color: 'white', fontWeight: 600 }}>{hoveredGanttItem.guestCount} pass</span></div>
              </div>

              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.35rem', fontSize: '0.7rem', display: 'flex', justifyContent: 'space-between' }}>
                <span>Paid: <strong style={{ color: '#708C84' }}>{formatCost(hoveredGanttItem.amountPaidToday)}</strong></span>
                <span>Due: <strong style={{ color: hoveredGanttItem.amountDueLater > 0 ? '#F97316' : '#10B981' }}>{formatCost(hoveredGanttItem.amountDueLater)}</strong></span>
              </div>
            </div>
          )}

          {hoveredGanttItem.ganttType === 'blackout' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, color: '#F87171' }}>Maintenance Blackout</span>
                <span style={{ fontSize: '0.62rem', background: 'rgba(239, 68, 68, 0.15)', color: '#EF4444', padding: '1px 4px', borderRadius: '3px', fontWeight: 600 }}>Blocked</span>
              </div>
              <div style={{ fontWeight: 600, color: 'white', fontSize: '0.82rem' }}>{hoveredGanttItem.title}</div>
              <div>Schedule: <strong style={{ color: 'white' }}>{hoveredGanttItem.startDate} {hoveredGanttItem.startTime ? `@ ${hoveredGanttItem.startTime}` : ''}</strong></div>
              <div>Until: <strong style={{ color: 'white' }}>{hoveredGanttItem.endDate} {hoveredGanttItem.endTime ? `@ ${hoveredGanttItem.endTime}` : ''}</strong></div>
              {hoveredGanttItem.notes && (
                <div style={{ fontStyle: 'italic', fontSize: '0.72rem', opacity: 0.8, marginTop: '0.2rem', borderTop: '1px dashed rgba(255,255,255,0.05)', paddingTop: '0.2rem' }}>
                  "{hoveredGanttItem.notes}"
                </div>
              )}
            </div>
          )}

          {hoveredGanttItem.ganttType === 'lock' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.3rem' }}>
                <span style={{ fontWeight: 700, color: 'white' }}>Checkout Lock Hold</span>
              </div>
              <div>Email: <strong style={{ color: 'white' }}>{hoveredGanttItem.holderEmail}</strong></div>
              <div>Date: <strong style={{ color: 'white' }}>{hoveredGanttItem.date}</strong></div>
              <div>Time: <strong style={{ color: 'white' }}>{hoveredGanttItem.startTime}</strong></div>
              <div>Expires: <strong style={{ color: '#E2A15E' }}>{new Date(hoveredGanttItem.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong></div>
            </div>
          )}
        </div>
      )}

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
                <h3 style={{ fontSize: '1.25rem', fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, color: 'white', margin: 0 }}>Manage Booking</h3>
                <span style={{ fontSize: '0.74rem', color: '#D8C7AF', opacity: 0.6, fontFamily: 'monospace' }}>Booking ID: BK-{selectedBooking.id}</span>
              </div>
              <button onClick={() => setSelectedBooking(null)} style={{ background: 'transparent', border: 'none', color: '#D8C7AF', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {/* Scrollable details */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* Customer Contact details */}
              <div style={{ background: '#121416', border: '1px solid rgba(255,255,255,0.04)', padding: '1rem', borderRadius: '8px' }}>
                <h4 style={{ fontSize: '0.75rem', fontWeight: 700, color: '#B9783B', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 0.65rem 0' }}>Client Information</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.78rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ opacity: 0.6 }}>Full Name:</span><strong style={{ color: 'white' }}>{selectedBooking.guestName}</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ opacity: 0.6 }}>Email Address:</span><strong style={{ color: 'white' }}>{selectedBooking.guestEmail}</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ opacity: 0.6 }}>Phone Number:</span><strong style={{ color: 'white' }}>{selectedBooking.guestPhone}</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ opacity: 0.6 }}>Group Size:</span><strong style={{ color: 'white' }}>{selectedBooking.guestCount} Passengers</strong></div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed rgba(255,255,255,0.05)', paddingTop: '0.45rem', marginTop: '0.2rem' }}>
                    <span style={{ opacity: 0.6 }}>Guest Portal:</span>
                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                      <a 
                        href={`/guest/portal?id=${selectedBooking.id}&token=${selectedBooking.token}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#B9783B', textDecoration: 'underline', fontWeight: 600 }}
                      >
                        Launch Portal ↗
                      </a>
                      <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>
                      <button
                        onClick={() => {
                          const link = `${window.location.origin}/guest/portal?id=${selectedBooking.id}&token=${selectedBooking.token}`;
                          navigator.clipboard.writeText(link);
                          setToast({ type: 'success', message: 'Guest Portal link copied to clipboard!' });
                          setTimeout(() => setToast(null), 3000);
                        }}
                        style={{ background: 'transparent', border: 'none', color: '#D8C7AF', cursor: 'pointer', padding: 0, textDecoration: 'underline', fontSize: '0.78rem', fontWeight: 600 }}
                      >
                        Copy Link
                      </button>
                    </div>
                  </div>
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
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ opacity: 0.6 }}>Cancellation Protection:</span><strong style={{ color: 'white' }}>{selectedBooking.cancellationInsurance ? 'Yes (5% paid)' : 'No'}</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ opacity: 0.6 }}>Payment Plan:</span><strong style={{ color: 'white', textTransform: 'capitalize' }}>{selectedBooking.paymentPlan}</strong></div>
                  
                  {/* Partner Split Estimator */}
                  <div style={{ borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: '0.55rem', marginTop: '0.35rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ opacity: 0.6, color: '#D8C7AF' }}>Vessel Owner Share (70%):</span>
                      <strong style={{ color: '#B9783B' }}>{formatCost(selectedBooking.subtotal * 0.7)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ opacity: 0.6, color: '#D8C7AF' }}>Platform Commission (30%):</span>
                      <strong style={{ color: 'white' }}>{formatCost(selectedBooking.subtotal * 0.3)}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Operational log modifier form */}
              <form onSubmit={handleUpdateOperational} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '1rem' }}>
                <h4 style={{ fontSize: '0.75rem', fontWeight: 700, color: 'white', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Operational Control logs</h4>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label style={{ fontSize: '0.68rem', color: '#D8C7AF', opacity: 0.7 }}>Reservation Status</label>
                    <select 
                      value={editStatus}
                      onChange={e => setEditStatus(e.target.value)}
                      style={{ padding: '0.45rem 0.55rem', background: '#121416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', fontSize: '0.74rem', outline: 'none' }}
                    >
                      <option value="confirmed">Confirmed</option>
                      <option value="pending waiver">Pending Waiver</option>
                      <option value="pending">Pending</option>
                    </select>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label style={{ fontSize: '0.68rem', color: '#D8C7AF', opacity: 0.7 }}>Trip Progress</label>
                    <select 
                      value={editTripStatus}
                      onChange={e => setEditTripStatus(e.target.value)}
                      style={{ padding: '0.45rem 0.55rem', background: '#121416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', fontSize: '0.74rem', outline: 'none' }}
                    >
                      <option value="scheduled">Scheduled</option>
                      <option value="underway">Underway</option>
                      <option value="completed">Completed</option>
                      <option value="weather_cancelled">Weather Cancelled</option>
                      <option value="mechanical_cancelled">Mechanical Delay</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label style={{ fontSize: '0.68rem', color: '#D8C7AF', opacity: 0.7 }}>Internal Dispatcher Notes</label>
                  <textarea 
                    rows={3}
                    placeholder="e.g. Booker prefers late return..."
                    value={editNotes}
                    onChange={e => setEditNotes(e.target.value)}
                    style={{ padding: '0.5rem 0.65rem', background: '#121416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', fontSize: '0.74rem', outline: 'none', resize: 'none' }}
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={isUpdating}
                  style={{ background: '#B9783B', color: 'white', border: 'none', padding: '0.6rem', borderRadius: '6px', fontWeight: 600, fontSize: '0.78rem', cursor: isUpdating ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', marginTop: '0.25rem' }}
                >
                  {isUpdating ? <Loader2 size={12} className="animate-spin" /> : 'Save Operational Changes'}
                </button>
              </form>

              {/* Client Chat Feed */}
              <div style={{ background: '#121416', border: '1px solid rgba(255,255,255,0.04)', padding: '1rem', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.55rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ fontSize: '0.75rem', fontWeight: 700, color: '#B9783B', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <MessageSquare size={14} /> Guest Portal Messenger
                  </h4>
                  <span style={{ fontSize: '0.62rem', color: '#D8C7AF', opacity: 0.5 }}>Real-time Concierge Channel</span>
                </div>

                {/* Messages Log */}
                <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.65rem', paddingRight: '0.2rem' }}>
                  {(!selectedBooking.messages || selectedBooking.messages.length === 0) ? (
                    <p style={{ fontSize: '0.74rem', color: '#D8C7AF', opacity: 0.5, fontStyle: 'italic', margin: '0.5rem 0', textAlign: 'center' }}>
                      No messages logged on this booking.
                    </p>
                  ) : (
                    selectedBooking.messages.map((msg: any) => {
                      const isAdmin = msg.sender === 'admin';
                      return (
                        <div 
                          key={msg.id}
                          style={{
                            alignSelf: isAdmin ? 'flex-end' : 'flex-start',
                            maxWidth: '85%',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: isAdmin ? 'flex-end' : 'flex-start'
                          }}
                        >
                          <div style={{
                            background: isAdmin ? '#B9783B' : 'rgba(255,255,255,0.05)',
                            color: isAdmin ? 'white' : '#F4F1EA',
                            padding: '0.45rem 0.65rem',
                            borderRadius: '8px',
                            borderBottomRightRadius: isAdmin ? '2px' : '8px',
                            borderBottomLeftRadius: isAdmin ? '8px' : '2px',
                            fontSize: '0.75rem',
                            lineHeight: '1.35',
                            wordBreak: 'break-word'
                          }}>
                            {msg.text}
                          </div>
                          <span style={{ fontSize: '0.58rem', color: '#D8C7AF', opacity: 0.4, marginTop: '0.15rem' }}>
                            {isAdmin ? 'Admin' : 'Guest'} • {new Date(msg.timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Response Form */}
                <form onSubmit={handleSendAdminReply} style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.75rem', display: 'flex', gap: '0.4rem' }}>
                  <input 
                    type="text"
                    value={adminReplyText}
                    onChange={e => setAdminReplyText(e.target.value)}
                    placeholder="Type reply to guest..."
                    required
                    disabled={isSendingReply}
                    style={{
                      flex: 1,
                      padding: '0.45rem 0.65rem',
                      borderRadius: '4px',
                      background: '#1E2124',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: 'white',
                      fontSize: '0.75rem',
                      outline: 'none'
                    }}
                  />
                  <button
                    type="submit"
                    disabled={!adminReplyText.trim() || isSendingReply}
                    style={{
                      background: (!adminReplyText.trim() || isSendingReply) ? 'rgba(255,255,255,0.05)' : '#B9783B',
                      color: (!adminReplyText.trim() || isSendingReply) ? '#666' : 'white',
                      border: 'none',
                      padding: '0 0.75rem',
                      borderRadius: '4px',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      cursor: (!adminReplyText.trim() || isSendingReply) ? 'not-allowed' : 'pointer'
                    }}
                  >
                    Reply
                  </button>
                </form>
              </div>

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
