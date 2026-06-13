'use client';

import { useAuth } from '@/components/AuthProvider';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { 
  Anchor, ArrowLeft, Search, Calendar, Ship, Users, CheckCircle, 
  Clock, AlertCircle, Loader2, DollarSign, X, Edit3, ArrowRight, Eye, RefreshCw,
  MessageSquare, ChevronLeft, ChevronRight, Plus
} from 'lucide-react';
import { 
  getAllBookings, updateBookingOperationalFields, getContentItems, 
  getAssetBlackouts, getAllCheckoutLocks, deleteAssetBlackout,
  sendBookingMessage, getBookingById, updateBookingMessageStatus,
  ensureBookingToken, archiveBooking, deleteBooking,
  getAllCustomerProfiles, saveAdminInternalBooking, checkBlackoutConflicts,
  saveAssetBlackout
} from '@/lib/db';

// Helper to format local timezone Date objects as YYYY-MM-DD
const formatLocalYYYYMMDD = (d: Date) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

// Helper to format currency
const formatCost = (val: number) => {
  return `$${Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

// Helper to get total amount paid today with fallback for active bookings
const getPaidToday = (b: any) => {
  if (!b) return 0;
  const rawPaidToday = b.amountPaidToday || 0;
  const isActive = b.status !== 'pending' && b.status !== 'cancelled' && !b.isArchived;
  if (isActive && rawPaidToday === 0) {
    const grandTotal = b.grandTotal || 0;
    const rawDueLater = b.amountDueLater || 0;
    return Math.max(0, grandTotal - rawDueLater);
  }
  return rawPaidToday;
};

const getDueDateString = (dateStr: string) => {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr + 'T00:00:00');
    d.setDate(d.getDate() - 7);
    return formatLocalYYYYMMDD(d);
  } catch {
    return dateStr;
  }
};

const getNormalizedDate = (createdAtStr: string) => {
  if (!createdAtStr) return 'N/A';
  try {
    return formatLocalYYYYMMDD(new Date(createdAtStr));
  } catch {
    return 'N/A';
  }
};

const getPaymentDueDate = (booking: any) => {
  if (booking.paymentPlan === 'full') return 'Paid';
  if (!booking.date) return 'N/A';
  try {
    const dateObj = new Date(booking.date + 'T00:00:00');
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
    return formatLocalYYYYMMDD(d);
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
  const [showArchived, setShowArchived] = useState(false);

  // Sorting states
  const [sortField, setSortField] = useState<string>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc'); // Default to descending for dates/totals on first click
    }
  };

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

  // Admin Reschedule/Cancellation states
  const [showAdminReschedule, setShowAdminReschedule] = useState(false);
  const [adminNewDate, setAdminNewDate] = useState('');
  const [adminNewTime, setAdminNewTime] = useState('09:30');
  const [adminBypassAvailability, setAdminBypassAvailability] = useState(false);
  const [isReschedulingAdmin, setIsReschedulingAdmin] = useState(false);

  const [showAdminCancel, setShowAdminCancel] = useState(false);
  const [adminRefundOverride, setAdminRefundOverride] = useState<number | ''>('');
  const [adminCancelReason, setAdminCancelReason] = useState('');
  const [isCancellingAdmin, setIsCancellingAdmin] = useState(false);
  const [adminCancelSource, setAdminCancelSource] = useState('customer_call');
  const [adminAutoProcessRefund, setAdminAutoProcessRefund] = useState(false);

  // Modal visibility states
  const [showInternalBookingModal, setShowInternalBookingModal] = useState(false);
  const [showBlackoutModal, setShowBlackoutModal] = useState(false);

  // Loaded metadata for selections
  const [allCustomers, setAllCustomers] = useState<any[]>([]);
  const [allCompanies, setAllCompanies] = useState<any[]>([]);
  const [adventures, setAdventures] = useState<any[]>([]);

  // Internal booking form states
  const [internalBookingGuestEmail, setInternalBookingGuestEmail] = useState('');
  const [internalBookingGuestName, setInternalBookingGuestName] = useState('');
  const [internalBookingGuestPhone, setInternalBookingGuestPhone] = useState('');
  const [internalBookingGuestCount, setInternalBookingGuestCount] = useState<number>(1);
  const [internalBookingVesselSlug, setInternalBookingVesselSlug] = useState('');
  const [internalBookingAdventureId, setInternalBookingAdventureId] = useState('');
  const [internalBookingDate, setInternalBookingDate] = useState('');
  const [internalBookingTime, setInternalBookingTime] = useState('09:30');
  const [internalBookingPricingOverridden, setInternalBookingPricingOverridden] = useState(false);
  const [internalBookingSubtotal, setInternalBookingSubtotal] = useState<number>(0);
  const [internalBookingSalesTax, setInternalBookingSalesTax] = useState<number>(0);
  const [internalBookingGrandTotal, setInternalBookingGrandTotal] = useState<number>(0);
  const [internalBookingPaymentMethod, setInternalBookingPaymentMethod] = useState<'card' | 'eft' | 'none'>('none');
  const [internalBookingReconciliationRef, setInternalBookingReconciliationRef] = useState('');
  const [internalBookingSendNotification, setInternalBookingSendNotification] = useState(true);
  const [internalBookingAgentType, setInternalBookingAgentType] = useState<'person' | 'company' | 'none'>('none');
  const [internalBookingAgentId, setInternalBookingAgentId] = useState('');
  const [internalBookingCommissionType, setInternalBookingCommissionType] = useState<'percentage' | 'flat' | 'none'>('none');
  const [internalBookingCommissionRate, setInternalBookingCommissionRate] = useState<number>(0);
  const [internalBookingCommissionAmount, setInternalBookingCommissionAmount] = useState<number>(0);
  const [internalBookingCommissionStatus, setInternalBookingCommissionStatus] = useState<'unpaid' | 'paid' | 'n/a'>('n/a');
  const [internalBookingBypassConflicts, setInternalBookingBypassConflicts] = useState(false);
  const [internalBookingConflictWarning, setInternalBookingConflictWarning] = useState<string | null>(null);
  const [isSavingInternalBooking, setIsSavingInternalBooking] = useState(false);
  const [internalBookingBookedViaAgent, setInternalBookingBookedViaAgent] = useState(false);
  const [internalBookingEndTime, setInternalBookingEndTime] = useState('13:30');
  const [internalBookingCalendarExpanded, setInternalBookingCalendarExpanded] = useState(false);
  const [internalBookingCalendarMonth, setInternalBookingCalendarMonth] = useState<Date>(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });

  // Blackout form states
  const [blackoutVesselSlug, setBlackoutVesselSlug] = useState('');
  const [blackoutTitle, setBlackoutTitle] = useState('');
  const [blackoutStartDate, setBlackoutStartDate] = useState('');
  const [blackoutEndDate, setBlackoutEndDate] = useState('');
  const [blackoutStartTime, setBlackoutStartTime] = useState('');
  const [blackoutEndTime, setBlackoutEndTime] = useState('');
  const [blackoutNotes, setBlackoutNotes] = useState('');
  const [blackoutBypassConflicts, setBlackoutBypassConflicts] = useState(false);
  const [blackoutConflictWarning, setBlackoutConflictWarning] = useState<string | null>(null);
  const [isSavingBlackout, setIsSavingBlackout] = useState(false);

  const START_TIMES = ['08:00', '09:00', '09:30', '10:00', '11:00', '12:00', '13:00', '13:30', '14:00', '15:00', '16:00', '17:00'];

  const [calendarMonth, setCalendarMonth] = useState<Date>(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });

  const isAdminSlotAvailable = (dateStr: string, timeStr: string) => {
    if (!selectedBooking) return false;
    
    if (dateStr === selectedBooking.date && timeStr === selectedBooking.startTime) {
      return true;
    }

    const targetDate = new Date(`${dateStr}T${timeStr}:00`);
    const now = new Date();
    if (targetDate.getTime() <= now.getTime()) {
      return false;
    }

    const vesselSlug = selectedBooking.vesselSlug;

    // 1. Conflicts
    const conflict = bookings.find(b => 
      b.vesselSlug === vesselSlug && 
      b.date === dateStr && 
      b.startTime === timeStr && 
      b.status !== 'cancelled' &&
      !b.isArchived &&
      b.id !== selectedBooking.id
    );
    if (conflict) {
      return false;
    }

    // 2. Blackouts
    const blackout = blackouts.find(b => {
      if (b.vesselSlug !== vesselSlug) return false;
      const bStart = new Date(b.startTime ? `${b.startDate}T${b.startTime}:00` : `${b.startDate}T00:00:00`).getTime();
      const bEnd = new Date(b.endTime ? `${b.endDate}T${b.endTime}:00` : `${b.endDate}T23:59:59`).getTime();
      const candStart = targetDate.getTime();
      const candEnd = candStart + 4 * 60 * 60 * 1000;
      return candStart < bEnd && candEnd > bStart;
    });
    if (blackout) {
      return false;
    }

    // 3. Locks
    const lock = checkoutLocks.find(l => 
      l.vesselSlug === vesselSlug && 
      l.date === dateStr && 
      l.startTime === timeStr && 
      l.holderEmail.toLowerCase().trim() !== selectedBooking.guestEmail.toLowerCase().trim()
    );
    if (lock) {
      return false;
    }

    return true;
  };

  const getDaysInMonth = (monthDate: Date) => {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const numDays = new Date(year, month + 1, 0).getDate();
    
    const days: Array<{ day: number | null; dateStr: string; isAvailable: boolean }> = [];
    
    for (let i = 0; i < firstDayIndex; i++) {
      days.push({ day: null, dateStr: '', isAvailable: false });
    }
    
    const today = new Date();
    today.setHours(0,0,0,0);
    
    for (let day = 1; day <= numDays; day++) {
      const dayDate = new Date(year, month, day);
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      
      const isPast = dayDate.getTime() < today.getTime();
      
      let isAvailable = !isPast;
      
      if (!adminBypassAvailability && isAvailable && selectedBooking) {
        const allTimesBlocked = START_TIMES.every(time => {
          return !isAdminSlotAvailable(dateStr, time);
        });
        if (allTimesBlocked) {
          isAvailable = false;
        }
      }
      
      days.push({ day, dateStr, isAvailable });
    }
    
    return days;
  };

  const getTransitHoursBetween = (fromSlug: string, toSlug: string, speedKnots: number = 15): number => {
    if (!fromSlug || !toSlug || fromSlug === toSlug) return 0;
    const fromLoc = allLocations.find(l => l.slug === fromSlug);
    const toLoc = allLocations.find(l => l.slug === toSlug);
    if (!fromLoc || !toLoc || !fromLoc.latitude || !fromLoc.longitude || !toLoc.latitude || !toLoc.longitude) {
      return 1.5; // Default relocation time in hours if coordinates are not resolved
    }
    
    const R = 3440.065; // Earth radius in nautical miles
    const lat1 = (fromLoc.latitude * Math.PI) / 180;
    const lat2 = (toLoc.latitude * Math.PI) / 180;
    const dLat = ((toLoc.latitude - fromLoc.latitude) * Math.PI) / 180;
    const dLon = ((toLoc.longitude - fromLoc.longitude) * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    const speed = speedKnots > 0 ? speedKnots : 15;
    return distance / speed;
  };

  const getAdventureLeadTime = (adv: any): number => {
    if (!adv.itinerary || adv.itinerary.length === 0) return 60; // 1 hour default
    const publicIndices = adv.itinerary
      .map((step: any, idx: number) => (!step.isCrewOnly ? idx : -1))
      .filter((idx: number) => idx !== -1);
    
    if (publicIndices.length === 0) return 0;
    
    let cumulative = 0;
    for (let i = 0; i <= publicIndices[0]; i++) {
      if (i > 0) {
        cumulative += Number(adv.itinerary[i].offsetMinutes || 0);
      }
    }
    return cumulative;
  };

  const getDurationMinutes = (start: string, end: string): number => {
    if (!start || !end) return 0;
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    let diff = (endH * 60 + endM) - (startH * 60 + startM);
    if (diff < 0) {
      // Crossed midnight
      diff += 24 * 60;
    }
    return diff;
  };

  const checkInternalBookingSlotAvailability = (
    vesselSlug: string,
    dateStr: string,
    timeStr: string,
    customDurationMinutes?: number
  ): { blocked: boolean; reason?: string; detail?: string } => {
    if (!vesselSlug || !dateStr || !timeStr) return { blocked: false };

    const selectedAdv = adventures.find(a => a.id === internalBookingAdventureId || a.slug === internalBookingAdventureId);
    const selectedVessel = vessels.find(v => v.slug === vesselSlug);

    // 1. Blackout checks
    const matchedBlackout = blackouts.find(b => {
      if (b.vesselSlug !== vesselSlug) return false;
      
      const bStartStr = b.startTime ? `${b.startDate}T${b.startTime}:00` : `${b.startDate}T00:00:00`;
      const bEndStr = b.endTime ? `${b.endDate}T${b.endTime}:00` : `${b.endDate}T23:59:59`;
      
      const bStart = new Date(bStartStr).getTime();
      const bEnd = new Date(bEndStr).getTime();
      
      const leadMins = selectedAdv ? getAdventureLeadTime(selectedAdv) : 60;
      const crewMins = customDurationMinutes !== undefined
        ? customDurationMinutes + leadMins + 60
        : (selectedAdv ? (selectedAdv.crewDurationMinutes || selectedAdv.guestDurationMinutes || 240) : 240);
      
      const candStart = new Date(`${dateStr}T${timeStr}:00`).getTime() - leadMins * 60 * 1000;
      const candEnd = candStart + crewMins * 60 * 1000;
      
      return candStart < bEnd && candEnd > bStart;
    });
    
    if (matchedBlackout) {
      return { blocked: true, reason: 'vessel-blackout', detail: matchedBlackout.title };
    }
    
    // 2. Checkout lock check
    const hasLock = checkoutLocks.some(
      l => l.vesselSlug === vesselSlug && 
           l.date === dateStr && 
           l.startTime === timeStr
    );
    if (hasLock) {
      return { blocked: true, reason: 'checkout-lock' };
    }
    
    // 3. Overlapping bookings and relocation buffers
    const candLeadMins = selectedAdv ? getAdventureLeadTime(selectedAdv) : 60;
    const candCrewMins = customDurationMinutes !== undefined
      ? customDurationMinutes + candLeadMins + 60
      : (selectedAdv ? (selectedAdv.crewDurationMinutes || selectedAdv.guestDurationMinutes || 240) : 240);
    const candStart = new Date(`${dateStr}T${timeStr}:00`).getTime() - candLeadMins * 60 * 1000;
    const candEnd = candStart + candCrewMins * 60 * 1000;
    
    const candStartLoc = selectedAdv?.startLocation || selectedVessel?.homeLocation || 'destin-harbor';
    const candEndLoc = selectedAdv?.endLocation || selectedVessel?.homeLocation || 'destin-harbor';
    const vesselSpeed = selectedVessel?.relocationSpeed || 15;
    
    const matchedConflict = bookings.find(b => {
      if (b.vesselSlug !== vesselSlug || b.status === 'cancelled' || b.isArchived) return false;
      
      const bLeadMins = b.leadTimeMinutes !== undefined ? b.leadTimeMinutes : 60;
      const bCrewMins = b.crewDurationMinutes !== undefined ? b.crewDurationMinutes : 360;
      const bStart = new Date(`${b.date}T${b.startTime}:00`).getTime() - bLeadMins * 60 * 1000;
      const bEnd = bStart + bCrewMins * 60 * 1000;
      
      const bStartLoc = b.startLocation || selectedVessel?.homeLocation || 'destin-harbor';
      const bEndLoc = b.endLocation || selectedVessel?.homeLocation || 'destin-harbor';
      
      // Direct overlap
      if (candStart < bEnd && candEnd > bStart) {
        return true;
      }
      
      // Relocation buffer: Candidate starts after B ends
      if (bEnd <= candStart) {
        const transitHours = getTransitHoursBetween(bEndLoc, candStartLoc, vesselSpeed);
        const transitMs = transitHours * 60 * 60 * 1000;
        if (candStart - bEnd < transitMs) {
          return true;
        }
      }
      
      // Relocation buffer: Candidate ends before B starts
      if (candEnd <= bStart) {
        const transitHours = getTransitHoursBetween(candEndLoc, bStartLoc, vesselSpeed);
        const transitMs = transitHours * 60 * 60 * 1000;
        if (bStart - candEnd < transitMs) {
          return true;
        }
      }
      
      return false;
    });
    
    if (matchedConflict) {
      return { blocked: true, reason: 'booking-overlap', detail: matchedConflict.guestName };
    }
    
    return { blocked: false };
  };

  const getInternalBookingDaysInMonth = (monthDate: Date) => {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const numDays = new Date(year, month + 1, 0).getDate();
    
    const days: Array<{ day: number | null; dateStr: string; isAvailable: boolean }> = [];
    
    for (let i = 0; i < firstDayIndex; i++) {
      days.push({ day: null, dateStr: '', isAvailable: false });
    }
    
    const today = new Date();
    today.setHours(0,0,0,0);
    
    for (let day = 1; day <= numDays; day++) {
      const dayDate = new Date(year, month, day);
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      
      const isPast = dayDate.getTime() < today.getTime();
      let isAvailable = !isPast;
      
      if (isAvailable && internalBookingVesselSlug) {
        const selectedAdv = adventures.find(a => a.id === internalBookingAdventureId || a.slug === internalBookingAdventureId);
        const startTimes = selectedAdv?.startTimes && selectedAdv.startTimes.length > 0 ? selectedAdv.startTimes : START_TIMES;
        
        const allTimesBlocked = startTimes.every((time: string) => {
          const checkResult = checkInternalBookingSlotAvailability(internalBookingVesselSlug, dateStr, time);
          return checkResult.blocked;
        });
        
        if (allTimesBlocked) {
          isAvailable = false;
        }
      }
      
      days.push({ day, dateStr, isAvailable });
    }
    
    return days;
  };

  const calculateRefundEstimate = (b: any) => {
    if (!b) return 0;
    const subtotal = b.subtotal || 0;
    const grandTotal = b.grandTotal || 0;
    const rawPaidToday = b.amountPaidToday || 0;
    const rawDueLater = b.amountDueLater || 0;
    
    const isActive = b.status !== 'pending' && b.status !== 'cancelled' && !b.isArchived;
    const amountPaidToday = (isActive && rawPaidToday === 0)
      ? Math.max(0, grandTotal - rawDueLater)
      : rawPaidToday;

    const hasInsurance = b.cancellationInsurance || false;
    const insuranceCost = hasInsurance ? subtotal * 0.05 : 0;

    if (!b.date) return amountPaidToday;

    const tripDate = new Date(`${b.date}T${b.startTime || '00:00'}:00`);
    const now = new Date();
    const diffTime = tripDate.getTime() - now.getTime();
    const diffHours = diffTime / (1000 * 60 * 60);
    const diffDays = diffHours / 24;

    let estimate = 0;

    if (hasInsurance) {
      if (diffHours >= 48) {
        estimate = Math.max(0, amountPaidToday - insuranceCost);
      } else {
        const liability = 0.5 * (grandTotal - insuranceCost) + insuranceCost;
        estimate = Math.max(0, amountPaidToday - liability);
      }
    } else {
      if (diffDays >= 14) {
        estimate = amountPaidToday;
      } else if (diffDays >= 7 && diffDays < 14) {
        const liability = 0.5 * grandTotal;
        estimate = Math.max(0, amountPaidToday - liability);
      } else {
        estimate = 0;
      }
    }

    return Math.round(estimate * 100) / 100;
  };

  const getAdminAvailabilityStatus = () => {
    if (!selectedBooking || !adminNewDate || !adminNewTime) return { available: true, message: '' };
    
    if (adminNewDate === selectedBooking.date && adminNewTime === selectedBooking.startTime) {
      return { available: true, message: 'Current slot selected.' };
    }

    const targetDate = new Date(`${adminNewDate}T${adminNewTime}:00`);
    const now = new Date();
    if (targetDate.getTime() <= now.getTime()) {
      return { available: false, message: 'Past date/time selected.' };
    }

    const vesselSlug = selectedBooking.vesselSlug;

    // 1. Conflicts
    const conflict = bookings.find(b => 
      b.vesselSlug === vesselSlug && 
      b.date === adminNewDate && 
      b.startTime === adminNewTime && 
      b.status !== 'cancelled' &&
      !b.isArchived &&
      b.id !== selectedBooking.id
    );
    if (conflict) {
      return { available: false, message: `Conflict: Already booked by BK-${conflict.id} (${conflict.guestName})` };
    }

    // 2. Blackouts
    const blackout = blackouts.find(b => {
      if (b.vesselSlug !== vesselSlug) return false;
      const bStart = new Date(b.startTime ? `${b.startDate}T${b.startTime}:00` : `${b.startDate}T00:00:00`).getTime();
      const bEnd = new Date(b.endTime ? `${b.endDate}T${b.endTime}:00` : `${b.endDate}T23:59:59`).getTime();
      const candStart = targetDate.getTime();
      const candEnd = candStart + 4 * 60 * 60 * 1000;
      return candStart < bEnd && candEnd > bStart;
    });
    if (blackout) {
      return { available: false, message: `Blackout Conflict: ${blackout.title}` };
    }

    // 3. Locks
    const lock = checkoutLocks.find(l => 
      l.vesselSlug === vesselSlug && 
      l.date === adminNewDate && 
      l.startTime === adminNewTime && 
      l.holderEmail.toLowerCase().trim() !== selectedBooking.guestEmail.toLowerCase().trim()
    );
    if (lock) {
      return { available: false, message: `Held in checkout lock by: ${lock.holderEmail}` };
    }

    return { available: true, message: 'Slot is available.' };
  };

  const handleAdminRescheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBooking || isReschedulingAdmin || !adminNewDate || !adminNewTime) return;

    const avail = getAdminAvailabilityStatus();
    if (!avail.available && !adminBypassAvailability) {
      alert(`Cannot reschedule: ${avail.message}. Check "Bypass availability checks" to override.`);
      return;
    }

    if (!confirm(`Are you sure you want to reschedule booking BK-${selectedBooking.id} to ${adminNewDate} at ${adminNewTime}?`)) {
      return;
    }

    setIsReschedulingAdmin(true);
    try {
      const idToken = await user?.getIdToken();
      
      const clientMetadata = {
        ip: 'Admin Portal',
        city: 'Admin',
        region: 'Admin',
        country: 'Admin',
        loc: 'Admin',
        userAgent: navigator.userAgent,
        browser: 'Admin Console',
        os: 'Admin Console',
        device: 'Desktop'
      };

      const res = await fetch('/api/bookings/reschedule', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(idToken ? { 'Authorization': `Bearer ${idToken}` } : {})
        },
        body: JSON.stringify({
          bookingId: selectedBooking.id,
          token: selectedBooking.token,
          newDate: adminNewDate,
          newStartTime: adminNewTime,
          clientMetadata,
          isAdminOverride: true,
          bypassAvailabilityCheck: adminBypassAvailability
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to reschedule.');
      }

      showToast('success', 'Booking rescheduled successfully!');
      fetchDashboardData();
      
      const updated = await getBookingById(selectedBooking.id);
      if (updated) setSelectedBooking(updated);
      
      setShowAdminReschedule(false);
    } catch (err: any) {
      console.error(err);
      showToast('error', `Reschedule failed: ${err.message}`);
    } finally {
      setIsReschedulingAdmin(false);
    }
  };

  const handleAdminCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBooking || isCancellingAdmin) return;

    const finalOverride = adminRefundOverride === '' ? undefined : Number(adminRefundOverride);

    if (!confirm(`Are you sure you want to cancel booking BK-${selectedBooking.id}? This will cancel all scheduled pre-trip messages and update the reservation status to Cancelled.`)) {
      return;
    }

    setIsCancellingAdmin(true);
    try {
      const idToken = await user?.getIdToken();

      const clientMetadata = {
        ip: 'Admin Portal',
        city: 'Admin',
        region: 'Admin',
        country: 'Admin',
        loc: 'Admin',
        userAgent: navigator.userAgent,
        browser: 'Admin Console',
        os: 'Admin Console',
        device: 'Desktop'
      };

      const res = await fetch('/api/bookings/cancel', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(idToken ? { 'Authorization': `Bearer ${idToken}` } : {})
        },
        body: JSON.stringify({
          bookingId: selectedBooking.id,
          token: selectedBooking.token,
          clientMetadata,
          isAdminOverride: true,
          refundOverrideAmount: finalOverride,
          cancelReason: adminCancelReason || (adminCancelSource === 'company_operational' ? 'Cancelled due to company operational reasons' : 'Guest requested cancellation via call/email'),
          cancellationSource: adminCancelSource,
          autoProcessRefund: adminAutoProcessRefund
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to cancel booking.');
      }

      const cancelRes = await res.json();
      showToast('success', 'Booking cancelled successfully!');
      if (adminAutoProcessRefund && cancelRes.stripeRefundError) {
        showToast('error', `Stripe refund failed: ${cancelRes.stripeRefundError}. Process manually.`);
      } else if (cancelRes.refundStatus === 'refunded') {
        showToast('success', `Stripe refund of $${cancelRes.refundEstimate} processed.`);
      }

      fetchDashboardData();

      const updated = await getBookingById(selectedBooking.id);
      if (updated) setSelectedBooking(updated);

      setShowAdminCancel(false);
    } catch (err: any) {
      console.error(err);
      showToast('error', `Cancellation failed: ${err.message}`);
    } finally {
      setIsCancellingAdmin(false);
    }
  };

  const [isArchivingBooking, setIsArchivingBooking] = useState(false);
  const [isDeletingBooking, setIsDeletingBooking] = useState(false);

  const handleArchiveBooking = async () => {
    if (!selectedBooking) return;
    if (!confirm(`Are you sure you want to archive booking BK-${selectedBooking.id}? This will remove it from active listings but retain the financial records.`)) return;
    
    setIsArchivingBooking(true);
    try {
      const ok = await archiveBooking(selectedBooking.id);
      if (ok) {
        showToast('success', `Booking BK-${selectedBooking.id} archived successfully.`);
        setBookings(prev => prev.map(b => b.id === selectedBooking.id ? { ...b, isArchived: true } : b));
        setSelectedBooking((prev: any) => prev ? { ...prev, isArchived: true } : null);
      } else {
        showToast('error', 'Failed to archive booking.');
      }
    } catch (error) {
      console.error(error);
      showToast('error', 'An error occurred.');
    } finally {
      setIsArchivingBooking(false);
    }
  };

  const handleDeleteBooking = async () => {
    if (!selectedBooking) return;
    
    if (selectedBooking.stripePaymentIntentId && selectedBooking.status !== 'cancelled') {
      const proceed = confirm(`Warning: This booking has an associated Stripe Payment (ID: ${selectedBooking.stripePaymentIntentId}) and is NOT cancelled. Deleting this booking will NOT automatically refund the customer. Are you sure you want to proceed without refunding?`);
      if (!proceed) return;
    }
    
    if (!confirm(`Are you sure you want to PERMANENTLY delete booking BK-${selectedBooking.id}? This action will completely erase the booking document and cannot be undone.`)) return;
    
    setIsDeletingBooking(true);
    try {
      const ok = await deleteBooking(selectedBooking.id);
      if (ok) {
        showToast('success', `Booking BK-${selectedBooking.id} deleted successfully.`);
        setBookings(prev => prev.filter(b => b.id !== selectedBooking.id));
        setSelectedBooking(null);
      } else {
        showToast('error', 'Failed to delete booking.');
      }
    } catch (error) {
      console.error(error);
      showToast('error', 'An error occurred.');
    } finally {
      setIsDeletingBooking(false);
    }
  };

  const handleSelectBooking = async (b: any) => {
    let activeBooking = b;
    if (!b.token || b.token === 'undefined') {
      try {
        const secureToken = await ensureBookingToken(b.id, b.token);
        if (secureToken) {
          activeBooking = { ...b, token: secureToken };
          setBookings(prev => prev.map(item => item.id === b.id ? { ...item, token: secureToken } : item));
        }
      } catch (err) {
        console.error('Failed to auto-generate secure token on select:', err);
      }
    }

    setSelectedBooking(activeBooking);
    setEditStatus(activeBooking.status || 'confirmed');
    setEditTripStatus(activeBooking.tripStatus || 'scheduled');
    setEditNotes(activeBooking.operationalNotes || '');

    // Initialize admin reschedule and cancel values
    setAdminNewDate(activeBooking.date || '');
    setAdminNewTime(activeBooking.startTime || '09:30');
    setAdminBypassAvailability(false);
    setShowAdminReschedule(false);
    if (activeBooking.date) {
      const activeD = new Date(activeBooking.date + 'T00:00:00');
      if (!isNaN(activeD.getTime())) {
        setCalendarMonth(activeD);
      }
    }
    
    setAdminCancelReason('');
    setShowAdminCancel(false);
    setAdminCancelSource('customer_call');
    setAdminAutoProcessRefund(false);
    
    // Pre-calculate refund estimate for admin view
    const calculatedRefund = calculateRefundEstimate(activeBooking);
    setAdminRefundOverride(calculatedRefund);
    
    if (activeBooking.messageStatus === 'unread') {
      setBookings(prev => prev.map(item => item.id === activeBooking.id ? { ...item, messageStatus: 'read' } : item));
      await updateBookingMessageStatus(activeBooking.id, 'read');
    }
  };

  // Helpers migrated to outer scope

  // Calculate timeframe bounds and interval type based on selection
  const getActiveRangeAndGrouping = () => {
    const today = new Date();
    // Normalize today to midnight local time
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    let start = new Date(todayMidnight);
    let end = new Date(todayMidnight);
    let grouping: 'day' | 'week' | 'month' = 'day';

    switch (timeScope) {
      case 'this-month':
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        grouping = 'day';
        break;
      case 'last-30-days':
        start = new Date(todayMidnight);
        start.setDate(todayMidnight.getDate() - 29);
        end = new Date(todayMidnight);
        grouping = 'day';
        break;
      case 'next-month':
        start = new Date(today.getFullYear(), today.getMonth() + 1, 1);
        end = new Date(today.getFullYear(), today.getMonth() + 2, 0);
        grouping = 'day';
        break;
      case 'next-30-days':
        start = new Date(todayMidnight);
        end = new Date(todayMidnight);
        end.setDate(todayMidnight.getDate() + 29);
        grouping = 'day';
        break;
      case 'next-90-days':
        start = new Date(todayMidnight);
        end = new Date(todayMidnight);
        end.setDate(todayMidnight.getDate() + 89);
        grouping = 'week';
        break;
      case 'current-period':
        start = new Date(todayMidnight);
        start.setDate(todayMidnight.getDate() - 30);
        end = new Date(todayMidnight);
        end.setDate(todayMidnight.getDate() + 60);
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
            .map(b => b.date || (b.createdAt ? b.createdAt.split('T')[0] : null))
            .filter(Boolean)
            .map(dStr => new Date(dStr + 'T00:00:00'));
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
    const current = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const targetEnd = new Date(end.getFullYear(), end.getMonth(), end.getDate());

    if (grouping === 'day') {
      while (current <= targetEnd) {
        intervals.push(formatLocalYYYYMMDD(current));
        current.setDate(current.getDate() + 1);
      }
    } else if (grouping === 'week') {
      const startSunday = new Date(current);
      startSunday.setDate(startSunday.getDate() - startSunday.getDay());
      const temp = new Date(startSunday);
      
      while (temp <= targetEnd || (temp.getTime() - targetEnd.getTime()) < 7 * 24 * 60 * 60 * 1000) {
        intervals.push(formatLocalYYYYMMDD(temp));
        temp.setDate(temp.getDate() + 7);
      }
    } else if (grouping === 'month') {
      const temp = new Date(current.getFullYear(), current.getMonth(), 1);
      const endMonth = new Date(targetEnd.getFullYear(), targetEnd.getMonth(), 1);
      
      while (temp <= endMonth) {
        intervals.push(formatLocalYYYYMMDD(temp));
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
    if (!showArchived && b.isArchived) return false;
    const matchesSearch = 
      (b.id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.guestName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.guestEmail || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = (() => {
      if (statusFilter === 'all') return true;
      if (statusFilter === 'pending') {
        return (b.status || '').toLowerCase().startsWith('pending');
      }
      return b.status === statusFilter;
    })();

    const matchesVessel = vesselFilter === 'all' || b.vesselTitle === vesselFilter;

    const { start: dateScopeStart, end: dateScopeEnd } = getActiveRangeAndGrouping();
    
    const isWithinBounds = (dateStr: string) => {
      if (!dateStr || dateStr === 'N/A') return false;
      try {
        const d = new Date(dateStr + 'T00:00:00');
        const s = new Date(dateScopeStart.getFullYear(), dateScopeStart.getMonth(), dateScopeStart.getDate());
        const e = new Date(dateScopeEnd.getFullYear(), dateScopeEnd.getMonth(), dateScopeEnd.getDate(), 23, 59, 59);
        return d >= s && d <= e;
      } catch {
        return false;
      }
    };

    const matchesDateScope = (() => {
      if (timeScope === 'all-time') return true;
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

  // Sort filteredBookings
  const sortedBookings = [...filteredBookings].sort((a, b) => {
    let aVal: any = a[sortField];
    let bVal: any = b[sortField];

    if (sortField === 'id') {
      aVal = a.id || '';
      bVal = b.id || '';
    } else if (sortField === 'guestName') {
      aVal = (a.guestName || '').toLowerCase();
      bVal = (b.guestName || '').toLowerCase();
    } else if (sortField === 'createdAt') {
      aVal = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      bVal = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    } else if (sortField === 'date') {
      aVal = a.date ? new Date(a.date + 'T' + (a.startTime || '00:00')).getTime() : 0;
      bVal = b.date ? new Date(b.date + 'T' + (b.startTime || '00:00')).getTime() : 0;
    } else if (sortField === 'grandTotal') {
      aVal = a.grandTotal || 0;
      bVal = b.grandTotal || 0;
    } else if (sortField === 'paidToday') {
      aVal = getPaidToday(a);
      bVal = getPaidToday(b);
    } else if (sortField === 'amountDueLater') {
      aVal = a.amountDueLater || 0;
      bVal = b.amountDueLater || 0;
    } else if (sortField === 'status') {
      aVal = (a.status || '').toLowerCase();
      bVal = (b.status || '').toLowerCase();
    }

    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
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
        const s = new Date(start.getFullYear(), start.getMonth(), start.getDate());
        const e = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59);
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
            dataMap[key].cat1 += getPaidToday(b);
          } else {
            dataMap[key].cat2 += getPaidToday(b);
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
            dataMap[key].cat1 += getPaidToday(b);
          } else {
            dataMap[key].cat2 += getPaidToday(b);
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
              dataMap[key].cat1 += getPaidToday(b);
            } else {
              dataMap[key].cat2 += getPaidToday(b);
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
      const [
        bookingsList, assetsList, locationsList, blackoutsList, locksList, staffList,
        customersList, companiesList, adventuresList
      ] = await Promise.all([
        getAllBookings(),
        getContentItems('asset'),
        getContentItems('location'),
        getAssetBlackouts(),
        getAllCheckoutLocks(),
        getContentItems('staff'),
        getAllCustomerProfiles(),
        getContentItems('company'),
        getContentItems('adventure')
      ]);
      setBookings(bookingsList);
      setVessels(assetsList.filter((a: any) => a.isVessel));
      setGear(assetsList.filter((a: any) => !a.isVessel));
      setAllLocations(locationsList);
      setBlackouts(blackoutsList);
      setCheckoutLocks(locksList);
      setCaptains(staffList.filter((s: any) => s.isCaptain));
      setAllCustomers(customersList);
      setAllCompanies(companiesList);
      setAdventures(adventuresList);
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
    const activeBookings = bookings.filter(b => b.date === dateStr && b.status !== 'cancelled' && !b.isArchived);
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

  // Helpers migrated to outer scope

  // Helper to guarantee single BK- prefix
  const formatBookingId = (id: string) => {
    if (!id) return '';
    return id.startsWith('BK-') ? id : `BK-${id}`;
  };

  // Helper to render table headers with client-side sorting capabilities
  const renderSortableHeader = (label: string, field: string) => {
    const isSorted = sortField === field;
    return (
      <th 
        onClick={() => handleSort(field)} 
        style={{ padding: '0.85rem 1rem', cursor: 'pointer', userSelect: 'none', transition: 'color 0.15s' }}
        onMouseOver={e => e.currentTarget.style.color = '#B9783B'}
        onMouseOut={e => e.currentTarget.style.color = isSorted ? '#B9783B' : '#D8C7AF'}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <span style={{ color: isSorted ? '#B9783B' : 'inherit', fontWeight: isSorted ? 700 : 500 }}>{label}</span>
          {isSorted ? (
            sortDirection === 'asc' ? <span style={{ color: '#B9783B', fontSize: '0.65rem' }}>▲</span> : <span style={{ color: '#B9783B', fontSize: '0.65rem' }}>▼</span>
          ) : (
            <span style={{ opacity: 0.25, fontSize: '0.65rem' }}>⇅</span>
          )}
        </div>
      </th>
    );
  };



  // Decoupled statsBookings that are only filtered by date scope and vessel selection (ignoring status filter and search term)
  const statsBookings = bookings.filter(b => {
    if (!showArchived && b.isArchived) return false;
    const matchesVessel = vesselFilter === 'all' || b.vesselTitle === vesselFilter;

    const { start: dateScopeStart, end: dateScopeEnd } = getActiveRangeAndGrouping();
    
    const isWithinBounds = (dateStr: string) => {
      if (!dateStr || dateStr === 'N/A') return false;
      try {
        const d = new Date(dateStr + 'T00:00:00');
        const s = new Date(dateScopeStart.getFullYear(), dateScopeStart.getMonth(), dateScopeStart.getDate());
        const e = new Date(dateScopeEnd.getFullYear(), dateScopeEnd.getMonth(), dateScopeEnd.getDate(), 23, 59, 59);
        return d >= s && d <= e;
      } catch {
        return false;
      }
    };

    const matchesDateScope = (() => {
      if (timeScope === 'all-time') return true;
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

    return matchesVessel && matchesDateScope;
  });

  // Calculate timeframe filtered bookings for summary stats (excluding cancelled ones)
  const timeframeBookings = statsBookings.filter(b => b.status !== 'cancelled');

  // Autocomplete suggestions
  const [internalBookingGuestSearch, setInternalBookingGuestSearch] = useState('');
  const [showGuestSuggestions, setShowGuestSuggestions] = useState(false);

  const filteredCustomerSuggestions = allCustomers.filter(c => 
    (c.name || '').toLowerCase().includes(internalBookingGuestSearch.toLowerCase()) ||
    (c.email || '').toLowerCase().includes(internalBookingGuestSearch.toLowerCase())
  );

  const handleSelectSuggestedGuest = (guest: any) => {
    setInternalBookingGuestEmail(guest.email || '');
    setInternalBookingGuestName(guest.name || '');
    setInternalBookingGuestPhone(guest.phone || '');
    setInternalBookingGuestSearch(`${guest.name} (${guest.email})`);
    setShowGuestSuggestions(false);
  };

  const getAvailableAgents = () => {
    const agentsList: Array<{ id: string; name: string; type: 'person' | 'company'; defaultCommission?: number }> = [];
    
    // 1. Staff Agents
    captains.forEach((s: any) => {
      if (s.isAgent || s.isReseller) {
        agentsList.push({
          id: s.id,
          name: `[Crew] ${s.title}`,
          type: 'person',
          defaultCommission: 0
        });
      }
    });

    // 2. Customer Agents
    allCustomers.forEach((c: any) => {
      if (c.isAgent || c.isReseller) {
        agentsList.push({
          id: c.id,
          name: `[Guest] ${c.name} (${c.email})`,
          type: 'person',
          defaultCommission: 0
        });
      }
    });

    // 3. Company Agents
    allCompanies.forEach((comp: any) => {
      if (comp.isAgent || comp.isReseller || comp.isOta) {
        agentsList.push({
          id: comp.id,
          name: `[Company] ${comp.title || comp.name}`,
          type: 'company',
          defaultCommission: comp.defaultCommissionRate || 0
        });
      }
    });

    return agentsList;
  };

  const handleAgentChange = (selectedAgentId: string) => {
    setInternalBookingAgentId(selectedAgentId);
    if (!selectedAgentId) {
      setInternalBookingAgentType('none');
      setInternalBookingCommissionType('none');
      setInternalBookingCommissionRate(0);
      setInternalBookingCommissionAmount(0);
      return;
    }

    const agents = getAvailableAgents();
    const agent = agents.find(a => a.id === selectedAgentId);
    if (!agent) return;

    setInternalBookingAgentType(agent.type);

    let defaultRate = agent.defaultCommission || 0;
    
    if (agent.type === 'person') {
      const personProfile = captains.find(s => s.id === selectedAgentId) || allCustomers.find(c => c.id === selectedAgentId);
      if (personProfile && personProfile.companyId) {
        const company = allCompanies.find(c => c.id === personProfile.companyId);
        if (company && company.defaultCommissionRate) {
          defaultRate = Number(company.defaultCommissionRate);
        }
      }
    }

    if (defaultRate > 0) {
      setInternalBookingCommissionType('percentage');
      setInternalBookingCommissionRate(defaultRate);
      const amt = Number((internalBookingSubtotal * (defaultRate / 100)).toFixed(2));
      setInternalBookingCommissionAmount(amt);
      setInternalBookingCommissionStatus('unpaid');
    } else {
      setInternalBookingCommissionType('none');
      setInternalBookingCommissionRate(0);
      setInternalBookingCommissionAmount(0);
      setInternalBookingCommissionStatus('n/a');
    }
  };

  const recalculateCommission = (
    sub: number,
    type: 'percentage' | 'flat' | 'none',
    rate: number,
    amt: number
  ) => {
    if (type === 'percentage') {
      const calculatedAmt = Number((sub * (rate / 100)).toFixed(2));
      setInternalBookingCommissionAmount(calculatedAmt);
    } else if (type === 'flat') {
      // keep flat amount
    } else {
      setInternalBookingCommissionAmount(0);
    }
  };

  const handleAdventureChange = (advId: string) => {
    setInternalBookingAdventureId(advId);
    const adv = adventures.find(a => a.id === advId || a.slug === advId);
    if (adv) {
      const durationMinutes = adv.guestDurationMinutes || 240;
      const [h, m] = internalBookingTime.split(':').map(Number);
      const totalMinutes = h * 60 + m + durationMinutes;
      const endH = Math.floor(totalMinutes / 60) % 24;
      const endM = totalMinutes % 60;
      setInternalBookingEndTime(`${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`);

      if (internalBookingPricingOverridden) return;

      const sub = Number(adv.basePrice || 0);
      const tax = Number((sub * 0.07).toFixed(2));
      const total = Number((sub + tax).toFixed(2));
      setInternalBookingSubtotal(sub);
      setInternalBookingSalesTax(tax);
      setInternalBookingGrandTotal(total);

      if (internalBookingAgentId) {
        recalculateCommission(sub, internalBookingCommissionType, internalBookingCommissionRate, internalBookingCommissionAmount);
      }
    }
  };

  const handlePricingChange = (sub: number, tax: number, total: number) => {
    setInternalBookingSubtotal(sub);
    setInternalBookingSalesTax(tax);
    setInternalBookingGrandTotal(total);

    if (internalBookingAgentId) {
      recalculateCommission(sub, internalBookingCommissionType, internalBookingCommissionRate, internalBookingCommissionAmount);
    }
  };

  const handleSaveInternalBooking = async () => {
    if (!internalBookingGuestEmail.trim() || !internalBookingGuestName.trim() || !internalBookingDate || !internalBookingVesselSlug || !internalBookingAdventureId) {
      alert('Please fill in Guest Name, Email, Date, Vessel, and Adventure.');
      return;
    }

    setInternalBookingConflictWarning(null);

    const durationMins = getDurationMinutes(internalBookingTime, internalBookingEndTime) || 240;

    // 1. Conflict Check
    if (!internalBookingBypassConflicts) {
      const checkResult = checkInternalBookingSlotAvailability(
        internalBookingVesselSlug, 
        internalBookingDate, 
        internalBookingTime,
        durationMins
      );
      if (checkResult.blocked) {
        let warnMsg = `The selected time slot is not available: `;
        if (checkResult.reason === 'booking-overlap') {
          warnMsg += `Overlaps with another booking by ${checkResult.detail || 'another guest'} (or blocked by transit buffer).`;
        } else if (checkResult.reason === 'vessel-blackout') {
          warnMsg += `Vessel blackout: ${checkResult.detail || 'blackout'}.`;
        } else if (checkResult.reason === 'checkout-lock') {
          warnMsg += `Held in checkout lock.`;
        } else {
          warnMsg += `Unknown conflict.`;
        }
        setInternalBookingConflictWarning(warnMsg);
        return;
      }
    }

    setIsSavingInternalBooking(true);
    try {
      const selectedAdv = adventures.find(a => a.id === internalBookingAdventureId || a.slug === internalBookingAdventureId);
      const selectedVessel = vessels.find(v => v.slug === internalBookingVesselSlug);

      const leadMins = selectedAdv ? getAdventureLeadTime(selectedAdv) : 60;
      const guestMins = durationMins;
      const defaultCrewMins = selectedAdv?.crewDurationMinutes || (selectedAdv?.guestDurationMinutes ? selectedAdv.guestDurationMinutes + 120 : 360);
      const defaultGuestMins = selectedAdv?.guestDurationMinutes || 240;
      const crewMins = guestMins + (defaultCrewMins - defaultGuestMins);

      const bookingRecord: any = {
        experienceId: internalBookingAdventureId,
        experienceTitle: selectedAdv?.title || 'Custom Admin Adventure',
        vesselSlug: internalBookingVesselSlug,
        vesselTitle: selectedVessel?.title || 'Custom Admin Vessel',
        captainId: 'none',
        captainTitle: 'None',
        date: internalBookingDate,
        startTime: internalBookingTime,
        endTime: internalBookingEndTime,
        leadTimeMinutes: leadMins,
        crewDurationMinutes: crewMins,
        guestDurationMinutes: guestMins,
        guestName: internalBookingGuestName.trim(),
        guestEmail: internalBookingGuestEmail.trim().toLowerCase(),
        guestPhone: internalBookingGuestPhone.trim(),
        guestCount: Number(internalBookingGuestCount) || 1,
        subtotal: Number(internalBookingSubtotal) || 0,
        salesTax: Number(internalBookingSalesTax) || 0,
        grandTotal: Number(internalBookingGrandTotal) || 0,
        amountPaidToday: internalBookingPaymentMethod !== 'none' ? Number(internalBookingGrandTotal) : 0,
        amountDueLater: internalBookingPaymentMethod === 'none' ? Number(internalBookingGrandTotal) : 0,
        paymentPlan: 'full',
        cancellationInsurance: false,
        marketingOptIn: false,
        status: internalBookingSendNotification ? 'pending waiver' : 'confirmed',
        isInternal: true,
        paymentMethod: internalBookingPaymentMethod,
        externalReconciliationRef: internalBookingReconciliationRef.trim() || undefined,
        pricingOverridden: internalBookingPricingOverridden,
        agentType: internalBookingAgentType,
        agentId: internalBookingAgentId || undefined,
        commissionType: internalBookingCommissionType,
        commissionRate: internalBookingCommissionType === 'percentage' ? Number(internalBookingCommissionRate) : undefined,
        commissionAmount: internalBookingCommissionType !== 'none' ? Number(internalBookingCommissionAmount) : undefined,
        commissionStatus: internalBookingCommissionType !== 'none' ? internalBookingCommissionStatus : 'n/a',
      };

      if (internalBookingAgentType === 'company') {
        const company = allCompanies.find(c => c.id === internalBookingAgentId);
        bookingRecord.agentName = company?.title || company?.name || 'Unknown Company';
        bookingRecord.agentRelationship = 'broker';
      } else if (internalBookingAgentType === 'person') {
        const staffAgent = captains.find(s => s.id === internalBookingAgentId);
        const custAgent = allCustomers.find(c => c.id === internalBookingAgentId);
        bookingRecord.agentName = staffAgent?.title || custAgent?.name || 'Unknown Agent';
        bookingRecord.agentRelationship = staffAgent ? 'staff_internal' : 'reseller';
      }

      await saveAdminInternalBooking(bookingRecord);
      
      setToast({ type: 'success', message: 'Internal booking created successfully.' });
      
      setShowInternalBookingModal(false);
      resetInternalBookingForm();
      fetchDashboardData();
    } catch (err) {
      console.error(err);
      setToast({ type: 'error', message: 'Failed to save internal booking.' });
    } finally {
      setIsSavingInternalBooking(false);
    }
  };

  const resetInternalBookingForm = () => {
    setInternalBookingGuestEmail('');
    setInternalBookingGuestName('');
    setInternalBookingGuestPhone('');
    setInternalBookingGuestCount(1);
    setInternalBookingVesselSlug('');
    setInternalBookingAdventureId('');
    setInternalBookingDate('');
    setInternalBookingTime('09:30');
    setInternalBookingEndTime('13:30');
    setInternalBookingCalendarExpanded(false);
    setInternalBookingCalendarMonth(() => {
      const d = new Date();
      d.setDate(1);
      return d;
    });
    setInternalBookingPricingOverridden(false);
    setInternalBookingSubtotal(0);
    setInternalBookingSalesTax(0);
    setInternalBookingGrandTotal(0);
    setInternalBookingPaymentMethod('none');
    setInternalBookingReconciliationRef('');
    setInternalBookingSendNotification(true);
    setInternalBookingAgentType('none');
    setInternalBookingAgentId('');
    setInternalBookingBookedViaAgent(false);
    setInternalBookingCommissionType('none');
    setInternalBookingCommissionRate(0);
    setInternalBookingCommissionAmount(0);
    setInternalBookingCommissionStatus('n/a');
    setInternalBookingBypassConflicts(false);
    setInternalBookingConflictWarning(null);
    setInternalBookingGuestSearch('');
  };

  const handleSaveBlackout = async () => {
    if (!blackoutTitle.trim() || !blackoutVesselSlug || !blackoutStartDate || !blackoutEndDate) {
      alert('Please fill in Title, Vessel, Start Date, and End Date.');
      return;
    }

    setBlackoutConflictWarning(null);

    // 1. Conflict Check
    if (!blackoutBypassConflicts) {
      const conflicts = await checkBlackoutConflicts(blackoutVesselSlug, blackoutStartDate, blackoutEndDate);
      if (conflicts.length > 0) {
        const conflictList = conflicts.map(c => `• ${c.guestName} (${c.date}) - ${c.experienceTitle}`).join('\n');
        setBlackoutConflictWarning(`There are active booking conflicts in this range:\n${conflictList}`);
        return;
      }
    }

    setIsSavingBlackout(true);
    try {
      await saveAssetBlackout({
        vesselSlug: blackoutVesselSlug,
        title: blackoutTitle.trim(),
        startDate: blackoutStartDate,
        endDate: blackoutEndDate,
        startTime: blackoutStartTime || undefined,
        endTime: blackoutEndTime || undefined,
        notes: blackoutNotes.trim() || undefined
      });
      setToast({ type: 'success', message: 'Asset blackout period saved.' });
      setShowBlackoutModal(false);
      resetBlackoutForm();
      fetchDashboardData();
    } catch (err) {
      console.error(err);
      setToast({ type: 'error', message: 'Failed to save blackout period.' });
    } finally {
      setIsSavingBlackout(false);
    }
  };

  const resetBlackoutForm = () => {
    setBlackoutVesselSlug('');
    setBlackoutTitle('');
    setBlackoutStartDate('');
    setBlackoutEndDate('');
    setBlackoutStartTime('');
    setBlackoutEndTime('');
    setBlackoutNotes('');
    setBlackoutBypassConflicts(false);
    setBlackoutConflictWarning(null);
  };

  const unreadMessagesCount = bookings.filter(b => b.messageStatus === 'unread' && !b.isArchived).length;

  const confirmedCount = timeframeBookings.filter(b => b.status === 'confirmed').length;
  const pendingWaiverCount = timeframeBookings.filter(b => !b.waiverSigned).length;
  
  const totalBookingValue = timeframeBookings
    .reduce((sum, b) => sum + getPaidToday(b) + (b.amountDueLater || 0), 0);
    
  const totalRevenue = timeframeBookings
    .reduce((sum, b) => sum + getPaidToday(b), 0);

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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button 
              onClick={() => setShowInternalBookingModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', border: 'none', background: '#B9783B', padding: '0.5rem 0.85rem', borderRadius: '6px', color: 'white', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
            >
              <Plus size={14} /> Create Internal Booking
            </button>
            <button 
              onClick={() => setShowBlackoutModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', border: '1px solid rgba(185,120,59,0.3)', background: 'rgba(185,120,59,0.1)', padding: '0.5rem 0.85rem', borderRadius: '6px', color: '#D8C7AF', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
            >
              <Calendar size={14} /> Add Blackout Period
            </button>
            <button 
              onClick={fetchBookings}
              style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.02)', padding: '0.5rem 0.85rem', borderRadius: '6px', color: '#D8C7AF', cursor: 'pointer', fontSize: '0.8rem' }}
            >
              <RefreshCw size={14} /> Refresh Data
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
              <option value="pending">Pending (All)</option>
              <option value="pending waiver">Pending Waiver</option>
              <option value="pending_funds_verification">Pending Funds Verification</option>
              <option value="cancelled">Cancelled</option>
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
                  {renderSortableHeader('Booking ID', 'id')}
                  {renderSortableHeader('Booking Date', 'createdAt')}
                  {renderSortableHeader('Guest / Contact', 'guestName')}
                  <th style={{ padding: '0.85rem 1rem' }}>Vessel & Captain</th>
                  {renderSortableHeader('Schedule', 'date')}
                  {renderSortableHeader('Total Value', 'grandTotal')}
                  {renderSortableHeader('Paid Today', 'paidToday')}
                  {renderSortableHeader('Balance Due', 'amountDueLater')}
                  <th style={{ padding: '0.85rem 1rem' }}>Due Date</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Waiver</th>
                  {renderSortableHeader('Status', 'status')}
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
                  <td style={{ padding: '0.75rem 1rem' }}></td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <div style={{ fontSize: '0.65rem', color: '#D8C7AF', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Guests</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{filteredBookings.reduce((sum, b) => sum + (b.guestCount || 1), 0)}</div>
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}></td>
                  <td style={{ padding: '0.75rem 1rem' }}></td>
                  <td style={{ padding: '0.75rem 1rem', color: '#E2A15E', fontWeight: 700, fontSize: '0.85rem' }}>
                    <div style={{ fontSize: '0.65rem', color: '#D8C7AF', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Value</div>
                    <div>{formatCost(filteredBookings.reduce((sum, b) => sum + (b.grandTotal || 0), 0))}</div>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: '#B9783B', fontWeight: 700, fontSize: '0.85rem' }}>
                    <div style={{ fontSize: '0.65rem', color: '#D8C7AF', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Paid</div>
                    <div>{formatCost(filteredBookings.reduce((sum, b) => sum + getPaidToday(b), 0))}</div>
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

                {sortedBookings.map(b => (
                  <tr 
                    key={b.id} 
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer', transition: 'all 0.15s' }}
                    onClick={() => handleSelectBooking(b)}
                    onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.015)'}
                    onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '1rem', fontWeight: 700, color: 'white', fontFamily: 'monospace' }}>{formatBookingId(b.id)}</td>
                    <td style={{ padding: '1rem', color: '#D8C7AF', opacity: 0.9 }}>{b.createdAt ? new Date(b.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}</td>
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
                    <td style={{ padding: '1rem', color: '#E2A15E', fontWeight: 600 }}>{formatCost(b.grandTotal)}</td>
                    <td style={{ padding: '1rem', color: '#B9783B', fontWeight: 600 }}>{formatCost(getPaidToday(b))}</td>
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
                      {b.status === 'cancelled' ? (
                        <span style={{ 
                          fontSize: '0.68rem', 
                          padding: '0.15rem 0.45rem', 
                          borderRadius: '4px', 
                          fontWeight: 700,
                          background: b.cancellationSource === 'company_operational' 
                            ? 'rgba(220, 38, 38, 0.15)' 
                            : b.cancellationSource === 'customer_call'
                              ? 'rgba(249, 115, 22, 0.15)' 
                              : 'rgba(239, 68, 68, 0.15)', 
                          color: b.cancellationSource === 'company_operational' 
                            ? '#ef4444' 
                            : b.cancellationSource === 'customer_call'
                              ? '#fdba74' 
                              : '#f87171',
                          border: b.cancellationSource === 'company_operational' 
                            ? '1px solid rgba(220, 38, 38, 0.3)' 
                            : b.cancellationSource === 'customer_call'
                              ? '1px solid rgba(249, 115, 22, 0.3)' 
                              : 'none'
                        }}>
                          {b.cancellationSource === 'company_operational' 
                            ? 'Cancelled (Operational)' 
                            : b.cancellationSource === 'customer_call'
                              ? 'Cancelled (Guest Called)' 
                              : 'Cancelled (Guest Portal)'}
                        </span>
                      ) : (
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
                      )}
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
              const cellBookings = bookings.filter(b => b.vesselSlug === vessel.slug && b.date === dateStr && b.status !== 'cancelled' && !b.isArchived);
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
                      <strong style={{ color: 'white', display: 'block', fontSize: '1rem' }}>{formatCost(getPaidToday(selectedGanttItem))}</strong>
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
                <span>Paid: <strong style={{ color: '#708C84' }}>{formatCost(getPaidToday(hoveredGanttItem))}</strong></span>
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
                <span style={{ fontSize: '0.74rem', color: '#D8C7AF', opacity: 0.6, fontFamily: 'monospace' }}>Booking ID: {formatBookingId(selectedBooking.id)}</span>
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
                        href={`/guest/portal?id=${formatBookingId(selectedBooking.id)}&token=${selectedBooking.token}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#B9783B', textDecoration: 'underline', fontWeight: 600 }}
                      >
                        Launch Portal ↗
                      </a>
                      <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>
                      <button
                        onClick={() => {
                          const link = `${window.location.origin}/guest/portal?id=${formatBookingId(selectedBooking.id)}&token=${selectedBooking.token}`;
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
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ opacity: 0.6 }}>Amount Paid Today:</span><strong style={{ color: '#708C84' }}>{formatCost(getPaidToday(selectedBooking))}</strong></div>
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

              {/* Reschedule & Cancellation Actions */}
              {selectedBooking.status !== 'cancelled' ? (
                <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <h4 style={{ fontSize: '0.75rem', fontWeight: 700, color: '#B9783B', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Administrative Charter Actions</h4>
                  
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button 
                      type="button" 
                      onClick={() => { setShowAdminReschedule(!showAdminReschedule); setShowAdminCancel(false); }}
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', background: showAdminReschedule ? '#B9783B' : 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '0.5rem', borderRadius: '6px', fontSize: '0.74rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
                    >
                      <Calendar size={14} /> Change Date
                    </button>
                    <button 
                      type="button" 
                      onClick={() => { setShowAdminCancel(!showAdminCancel); setShowAdminReschedule(false); }}
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', background: showAdminCancel ? '#EF4444' : 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '0.5rem', borderRadius: '6px', fontSize: '0.74rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
                    >
                      <AlertCircle size={14} /> Cancel Charter
                    </button>
                  </div>

                  {/* Reschedule Sub-form */}
                  {showAdminReschedule && (
                    <form onSubmit={handleAdminRescheduleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem', padding: '0.75rem', background: '#121416', borderRadius: '6px', border: '1px solid rgba(185, 120, 59, 0.2)', animation: 'fadeIn 0.2s ease-out' }}>
                      {/* Bypass availability check toggle */}
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.7rem', color: '#E2A15E', cursor: 'pointer', paddingBottom: '0.25rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <input 
                          type="checkbox"
                          checked={adminBypassAvailability}
                          onChange={e => {
                            setAdminBypassAvailability(e.target.checked);
                          }}
                        />
                        <span>Bypass availability checks (Force Reschedule)</span>
                      </label>

                      {/* Interactive Month-Grid Calendar */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
                        <label style={{ fontSize: '0.68rem', color: '#D8C7AF', opacity: 0.8, fontWeight: 600 }}>Select New Date</label>
                        <div style={{ padding: '0.5rem', background: '#1E2124', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <button
                              type="button"
                              onClick={() => {
                                const prevMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1);
                                setCalendarMonth(prevMonth);
                              }}
                              style={{ background: 'transparent', border: 'none', color: '#D8C7AF', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '0.2rem' }}
                            >
                              <ChevronLeft size={16} />
                            </button>
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'white' }}>
                              {calendarMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1));
                              }}
                              style={{ background: 'transparent', border: 'none', color: '#D8C7AF', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '0.2rem' }}
                            >
                              <ChevronRight size={16} />
                            </button>
                          </div>

                          {/* Calendar Weekday Names */}
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.2rem', textAlign: 'center', marginBottom: '0.3rem' }}>
                            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(dayName => (
                              <span key={dayName} style={{ fontSize: '0.62rem', color: '#D8C7AF', opacity: 0.5, fontWeight: 600 }}>{dayName}</span>
                            ))}
                          </div>

                          {/* Calendar Days Grid */}
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.2rem' }}>
                            {getDaysInMonth(calendarMonth).map((dayObj, idx) => {
                              if (dayObj.day === null) {
                                return <div key={`empty-${idx}`} />;
                              }
                              const isSelected = adminNewDate === dayObj.dateStr;
                              const isAvailable = adminBypassAvailability ? true : dayObj.isAvailable;
                              return (
                                <button
                                  key={`day-${dayObj.dateStr}`}
                                  type="button"
                                  disabled={!isAvailable}
                                  onClick={() => {
                                    setAdminNewDate(dayObj.dateStr);
                                  }}
                                  style={{
                                    border: 'none',
                                    background: isSelected 
                                      ? '#B9783B' 
                                      : 'transparent',
                                    color: isSelected 
                                      ? 'white' 
                                      : isAvailable 
                                        ? '#D8C7AF' 
                                        : 'rgba(255,255,255,0.15)',
                                    padding: '0.35rem 0',
                                    borderRadius: '4px',
                                    fontSize: '0.7rem',
                                    fontWeight: isSelected ? 700 : 500,
                                    cursor: isAvailable ? 'pointer' : 'not-allowed',
                                    textDecoration: isAvailable ? 'none' : 'line-through',
                                    position: 'relative'
                                  }}
                                  title={isAvailable ? undefined : 'Fully Booked / Unavailable'}
                                >
                                  {dayObj.day}
                                  <span style={{
                                    position: 'absolute',
                                    bottom: '2px',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    width: '3px',
                                    height: '3px',
                                    borderRadius: '50%',
                                    background: isSelected 
                                      ? 'white' 
                                      : isAvailable 
                                        ? '#708C84' 
                                        : '#ef4444'
                                  }} />
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Interactive Time Slots Grid */}
                      {adminNewDate && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                          <label style={{ fontSize: '0.68rem', color: '#D8C7AF', opacity: 0.8, fontWeight: 600 }}>Select Boarding Time</label>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.35rem' }}>
                            {START_TIMES.map(time => {
                              const isSelected = adminNewTime === time;
                              const isTimeAvailable = adminBypassAvailability ? true : isAdminSlotAvailable(adminNewDate, time);
                              
                              return (
                                <button
                                  key={time}
                                  type="button"
                                  disabled={!isTimeAvailable}
                                  onClick={() => setAdminNewTime(time)}
                                  style={{
                                    padding: '0.4rem 0.2rem',
                                    borderRadius: '4px',
                                    border: isSelected 
                                      ? '1px solid #B9783B' 
                                      : !isTimeAvailable 
                                        ? '1px dashed rgba(255,255,255,0.04)' 
                                        : '1px solid rgba(255, 255, 255, 0.1)',
                                    background: isSelected 
                                      ? 'rgba(185, 120, 59, 0.2)' 
                                      : !isTimeAvailable
                                        ? 'rgba(255,255,255,0.02)'
                                        : '#1E2124',
                                    color: isSelected 
                                      ? 'white' 
                                      : isTimeAvailable 
                                        ? '#D8C7AF' 
                                        : 'rgba(255,255,255,0.2)',
                                    fontSize: '0.7rem',
                                    fontWeight: isSelected ? 600 : 400,
                                    cursor: isTimeAvailable ? 'pointer' : 'not-allowed',
                                    textDecoration: isTimeAvailable ? 'none' : 'line-through',
                                    transition: 'all 0.15s ease'
                                  }}
                                  title={isTimeAvailable ? undefined : 'Slot is not available'}
                                >
                                  {time}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Live availability check info */}
                      {adminNewDate && adminNewTime && (() => {
                        const status = getAdminAvailabilityStatus();
                        return (
                          <div style={{ fontSize: '0.7rem', color: status.available ? '#708C84' : '#EF4444', display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.25rem 0' }}>
                            <AlertCircle size={12} />
                            <span>{status.message || 'Checking...'}</span>
                          </div>
                        );
                      })()}

                      <button 
                        type="submit"
                        disabled={isReschedulingAdmin || (!getAdminAvailabilityStatus().available && !adminBypassAvailability)}
                        style={{ background: '#B9783B', color: 'white', border: 'none', padding: '0.5rem', borderRadius: '4px', fontSize: '0.74rem', fontWeight: 600, cursor: (isReschedulingAdmin || (!getAdminAvailabilityStatus().available && !adminBypassAvailability)) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}
                      >
                        {isReschedulingAdmin ? <Loader2 size={12} className="animate-spin" /> : 'Confirm Date Change'}
                      </button>
                    </form>
                  )}

                  {/* Cancellation Sub-form */}
                  {showAdminCancel && (
                    <form onSubmit={handleAdminCancelSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem', padding: '0.75rem', background: '#121416', borderRadius: '6px', border: '1px solid rgba(239, 68, 68, 0.25)', animation: 'fadeIn 0.2s ease-out' }}>
                      <div style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.1)', padding: '0.5rem 0.75rem', borderRadius: '4px', fontSize: '0.7rem' }}>
                        <div style={{ fontWeight: 600, color: '#FCA5A5', marginBottom: '0.15rem' }}>Estimated Policy Refund</div>
                        <div style={{ color: '#F4F1EA', opacity: 0.9 }}>
                          Estimated Refund: <strong style={{ color: '#EF4444' }}>{formatCost(calculateRefundEstimate(selectedBooking))}</strong>
                        </div>
                        <div style={{ color: '#D8C7AF', opacity: 0.7, fontSize: '0.65rem', marginTop: '0.25rem' }}>
                          Based on rules: {selectedBooking.cancellationInsurance ? 'Has cancellation insurance.' : 'No insurance.'}
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <label style={{ fontSize: '0.68rem', color: '#D8C7AF', opacity: 0.8 }}>Cancellation Source</label>
                        <select 
                          value={adminCancelSource}
                          onChange={e => setAdminCancelSource(e.target.value)}
                          style={{ padding: '0.45rem 0.55rem', background: '#1E2124', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', color: 'white', fontSize: '0.75rem', outline: 'none' }}
                        >
                          <option value="customer_call">Customer Request (Called/Emailed concierge)</option>
                          <option value="company_operational">Company / Operational (Weather, vessel issue, captain issue)</option>
                        </select>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <label style={{ fontSize: '0.68rem', color: '#D8C7AF', opacity: 0.8 }}>Refund Override ($)</label>
                        <input 
                          type="number"
                          value={adminRefundOverride}
                          onChange={e => setAdminRefundOverride(e.target.value === '' ? '' : Number(e.target.value))}
                          placeholder={calculateRefundEstimate(selectedBooking).toString()}
                          style={{ padding: '0.45rem 0.55rem', background: '#1E2124', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', color: 'white', fontSize: '0.75rem', outline: 'none' }}
                        />
                      </div>

                      {selectedBooking.stripePaymentIntentId && (adminRefundOverride === '' ? calculateRefundEstimate(selectedBooking) : Number(adminRefundOverride)) > 0 && (
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.7rem', color: '#E2A15E', cursor: 'pointer', margin: '0.15rem 0' }}>
                          <input 
                            type="checkbox"
                            checked={adminAutoProcessRefund}
                            onChange={e => setAdminAutoProcessRefund(e.target.checked)}
                          />
                          <span>Process refund automatically in Stripe</span>
                        </label>
                      )}

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <label style={{ fontSize: '0.68rem', color: '#D8C7AF', opacity: 0.8 }}>Reason for Cancellation</label>
                        <input 
                          type="text"
                          value={adminCancelReason}
                          onChange={e => setAdminCancelReason(e.target.value)}
                          placeholder="e.g. Guest requested change of plans"
                          required
                          style={{ padding: '0.45rem 0.55rem', background: '#1E2124', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', color: 'white', fontSize: '0.75rem', outline: 'none' }}
                        />
                      </div>

                      <button 
                        type="submit"
                        disabled={isCancellingAdmin}
                        style={{ background: '#EF4444', color: 'white', border: 'none', padding: '0.5rem', borderRadius: '4px', fontSize: '0.74rem', fontWeight: 600, cursor: isCancellingAdmin ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}
                      >
                        {isCancellingAdmin ? <Loader2 size={12} className="animate-spin" /> : 'Confirm Cancellation'}
                      </button>
                    </form>
                  )}
                </div>
              ) : (
                <div style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.15)', borderRadius: '8px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <h4 style={{ fontSize: '0.75rem', fontWeight: 700, color: '#EF4444', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <AlertCircle size={14} /> Voyage Cancelled
                  </h4>
                  <div style={{ fontSize: '0.78rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ opacity: 0.6 }}>Cancellation Source:</span>
                      <strong style={{ color: 'white' }}>
                        {selectedBooking.cancellationSource === 'company_operational' 
                          ? 'Company / Operational' 
                          : selectedBooking.cancellationSource === 'customer_call' 
                            ? 'Customer Request (Call/Email)' 
                            : 'Guest (via Portal)'}
                      </strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ opacity: 0.6 }}>Refund status:</span><strong style={{ color: 'white', textTransform: 'uppercase' }}>{selectedBooking.refundStatus || 'N/A'}</strong></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ opacity: 0.6 }}>Refund estimate:</span><strong style={{ color: 'white' }}>{formatCost(selectedBooking.refundEstimate)}</strong></div>
                    {selectedBooking.amountRefunded > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ opacity: 0.6 }}>Actual refunded:</span><strong style={{ color: '#708C84' }}>{formatCost(selectedBooking.amountRefunded)}</strong></div>
                    )}
                    {selectedBooking.changeHistory && selectedBooking.changeHistory.length > 0 && (
                      <div style={{ borderTop: '1px dashed rgba(255,255,255,0.05)', paddingTop: '0.45rem', marginTop: '0.2rem' }}>
                        <span style={{ opacity: 0.6, display: 'block', marginBottom: '0.15rem' }}>Audit Trail Notes:</span>
                        {selectedBooking.changeHistory.map((history: any, idx: number) => {
                          if (history.action === 'cancel') {
                            return (
                              <div key={idx} style={{ fontSize: '0.7rem', color: '#D8C7AF', fontStyle: 'italic', marginBottom: '0.25rem' }}>
                                "{history.cancelReason || 'No reason provided'}" — initiated by {history.initiatedBy === 'admin' ? 'Administrator' : 'Guest'} on {new Date(history.timestamp).toLocaleDateString()}
                              </div>
                            );
                          }
                          return null;
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

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

              {/* Archival / Erasure Controls */}
              <div style={{ background: 'rgba(239, 68, 68, 0.03)', border: '1px solid rgba(239, 68, 68, 0.12)', borderRadius: '8px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
                <h4 style={{ fontSize: '0.75rem', fontWeight: 700, color: '#EF4444', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Archive & Deletion</h4>
                <p style={{ margin: 0, fontSize: '0.7rem', color: '#D8C7AF', opacity: 0.8, lineHeight: '1.4' }}>
                  Soft-archiving hides the trip from lists but keeps reports intact. Hard-deleting permanently erases the booking and cleans CRM refs.
                </p>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {!selectedBooking.isArchived ? (
                    <button
                      type="button"
                      onClick={handleArchiveBooking}
                      disabled={isArchivingBooking}
                      style={{ flex: 1, padding: '0.5rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '6px', fontSize: '0.74rem', fontWeight: 600, cursor: isArchivingBooking ? 'not-allowed' : 'pointer' }}
                    >
                      {isArchivingBooking ? 'Archiving...' : 'Archive Booking'}
                    </button>
                  ) : (
                    <span style={{ flex: 1, padding: '0.5rem', background: 'rgba(255,255,255,0.05)', color: '#708C84', borderRadius: '6px', fontSize: '0.74rem', fontWeight: 700, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      ✓ Archived
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={handleDeleteBooking}
                    disabled={isDeletingBooking}
                    style={{ flex: 1, padding: '0.5rem', background: '#EF4444', color: 'white', border: 'none', borderRadius: '6px', fontSize: '0.74rem', fontWeight: 600, cursor: isDeletingBooking ? 'not-allowed' : 'pointer' }}
                  >
                    {isDeletingBooking ? 'Deleting...' : 'Delete Booking'}
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* CREATE INTERNAL BOOKING MODAL */}
      {showInternalBookingModal && (
        <div 
          style={{ position: 'fixed', inset: 0, zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)', padding: '2rem' }}
          onClick={() => {
            setShowInternalBookingModal(false);
            resetInternalBookingForm();
          }}
        >
          <div 
            style={{ background: '#1E2124', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', width: '100%', maxWidth: '650px', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px rgba(0,0,0,0.5)', animation: 'fadeIn 0.25s ease-out' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <h2 style={{ fontSize: '1.35rem', fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, margin: 0, color: 'white' }}>
                Create Internal Bareboat Booking
              </h2>
              <button 
                onClick={() => {
                  setShowInternalBookingModal(false);
                  resetInternalBookingForm();
                }} 
                style={{ background: 'transparent', border: 'none', color: '#D8C7AF', cursor: 'pointer', padding: '0.25rem' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Guest Search / Selection (CRM Linking) */}
              <div style={{ position: 'relative' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#D8C7AF', marginBottom: '0.35rem' }}>
                  Search CRM Guests (Optional)
                </label>
                <div style={{ display: 'flex', alignItems: 'center', background: '#121416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', paddingLeft: '0.5rem' }}>
                  <Search size={14} color="#B9783B" />
                  <input
                    type="text"
                    value={internalBookingGuestSearch}
                    onChange={e => {
                      setInternalBookingGuestSearch(e.target.value);
                      setShowGuestSuggestions(true);
                    }}
                    onFocus={() => setShowGuestSuggestions(true)}
                    placeholder="Search existing customer by name or email..."
                    style={{ padding: '0.65rem 0.5rem', background: 'transparent', border: 'none', color: 'white', fontSize: '0.825rem', outline: 'none', flex: 1 }}
                  />
                  {internalBookingGuestSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setInternalBookingGuestSearch('');
                        setInternalBookingGuestName('');
                        setInternalBookingGuestEmail('');
                        setInternalBookingGuestPhone('');
                      }}
                      style={{ background: 'transparent', border: 'none', color: '#888', cursor: 'pointer', paddingRight: '0.5rem' }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {showGuestSuggestions && internalBookingGuestSearch.trim().length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#1E2124', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', boxShadow: '0 10px 20px rgba(0,0,0,0.5)', zIndex: 10, maxHeight: '150px', overflowY: 'auto', marginTop: '0.25rem' }}>
                    {filteredCustomerSuggestions.length > 0 ? (
                      filteredCustomerSuggestions.map(cust => (
                        <div
                          key={cust.id}
                          onClick={() => handleSelectSuggestedGuest(cust)}
                          style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', fontSize: '0.78rem' }}
                          onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                          onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <div style={{ color: 'white', fontWeight: 600 }}>{cust.name}</div>
                          <div style={{ color: '#D8C7AF', opacity: 0.6, fontSize: '0.7rem' }}>{cust.email}</div>
                        </div>
                      ))
                    ) : (
                      <div style={{ padding: '0.5rem 0.75rem', color: '#888', fontSize: '0.78rem' }}>No matching CRM guests found.</div>
                    )}
                  </div>
                )}
              </div>

              {/* Guest Details */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#D8C7AF', marginBottom: '0.35rem' }}>Guest Full Name *</label>
                  <input
                    type="text"
                    value={internalBookingGuestName}
                    onChange={e => setInternalBookingGuestName(e.target.value)}
                    placeholder="e.g. Jane Doe"
                    style={{ width: '100%', padding: '0.65rem 0.75rem', background: '#121416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', fontSize: '0.825rem', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#D8C7AF', marginBottom: '0.35rem' }}>Guest Email *</label>
                  <input
                    type="email"
                    value={internalBookingGuestEmail}
                    onChange={e => setInternalBookingGuestEmail(e.target.value)}
                    placeholder="jane@example.com"
                    style={{ width: '100%', padding: '0.65rem 0.75rem', background: '#121416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', fontSize: '0.825rem', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#D8C7AF', marginBottom: '0.35rem' }}>Guest Phone</label>
                  <input
                    type="text"
                    value={internalBookingGuestPhone}
                    onChange={e => setInternalBookingGuestPhone(e.target.value)}
                    placeholder="e.g. (555) 123-4567"
                    style={{ width: '100%', padding: '0.65rem 0.75rem', background: '#121416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', fontSize: '0.825rem', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#D8C7AF', marginBottom: '0.35rem' }}>Guest Count</label>
                  <input
                    type="number"
                    min={1}
                    value={internalBookingGuestCount}
                    onChange={e => setInternalBookingGuestCount(Number(e.target.value))}
                    style={{ width: '100%', padding: '0.65rem 0.75rem', background: '#121416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', fontSize: '0.825rem', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              {/* Vessel & Adventure Selection */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#D8C7AF', marginBottom: '0.35rem' }}>Select Vessel *</label>
                  <select
                    value={internalBookingVesselSlug}
                    onChange={e => setInternalBookingVesselSlug(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem 0.75rem', background: '#121416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', fontSize: '0.825rem', outline: 'none', boxSizing: 'border-box' }}
                  >
                    <option value="">-- Choose Vessel --</option>
                    {vessels.map(v => (
                      <option key={v.slug} value={v.slug}>{v.title}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#D8C7AF', marginBottom: '0.35rem' }}>Select Adventure *</label>
                  <select
                    value={internalBookingAdventureId}
                    onChange={e => handleAdventureChange(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem 0.75rem', background: '#121416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', fontSize: '0.825rem', outline: 'none', boxSizing: 'border-box' }}
                  >
                    <option value="">-- Choose Adventure --</option>
                    {adventures.map(a => (
                      <option key={a.id || a.slug} value={a.id || a.slug}>{a.title} ({formatCost(a.basePrice)})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Interactive Calendar for Date */}
              {!internalBookingCalendarExpanded && internalBookingDate ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#D8C7AF' }}>Charter Date *</span>
                  <div 
                    onClick={() => setInternalBookingCalendarExpanded(true)}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between', 
                      background: '#121416', 
                      border: '1px solid rgba(185, 120, 59, 0.3)', 
                      borderRadius: '8px', 
                      padding: '0.6rem 0.75rem', 
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#B9783B';
                      e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(185, 120, 59, 0.3)';
                      e.currentTarget.style.background = '#121416';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span>📅</span>
                      <span style={{ fontSize: '0.78rem', color: 'white', fontWeight: 600 }}>
                        {new Date(internalBookingDate + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.7rem', color: '#B9783B', fontWeight: 600 }}>Change</span>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#D8C7AF' }}>Charter Date *</span>
                  <div style={{ background: '#121416', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '0.65rem 0.7rem' }}>
                    {/* Calendar Navigation Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <button
                        type="button"
                        onClick={() => {
                          const prevMonth = new Date(internalBookingCalendarMonth.getFullYear(), internalBookingCalendarMonth.getMonth() - 1, 1);
                          const now = new Date();
                          now.setDate(1);
                          now.setHours(0,0,0,0);
                          if (prevMonth.getTime() >= now.getTime()) {
                            setInternalBookingCalendarMonth(prevMonth);
                          }
                        }}
                        style={{ background: 'transparent', border: 'none', color: '#D8C7AF', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '0.2rem' }}
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'white' }}>
                        {internalBookingCalendarMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {internalBookingDate && (
                          <button
                            type="button"
                            onClick={() => setInternalBookingCalendarExpanded(false)}
                            style={{ background: 'transparent', border: 'none', color: '#708C84', cursor: 'pointer', fontSize: '0.68rem', fontWeight: 600, padding: '0.1rem 0.3rem' }}
                          >
                            Close
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setInternalBookingCalendarMonth(new Date(internalBookingCalendarMonth.getFullYear(), internalBookingCalendarMonth.getMonth() + 1, 1));
                          }}
                          style={{ background: 'transparent', border: 'none', color: '#D8C7AF', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '0.2rem' }}
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Calendar Weekday Names */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.2rem', textAlign: 'center', marginBottom: '0.35rem' }}>
                      {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(dayName => (
                        <span key={dayName} style={{ fontSize: '0.68rem', color: '#D8C7AF', opacity: 0.5, fontWeight: 600 }}>{dayName}</span>
                      ))}
                    </div>

                    {/* Calendar Days Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.2rem' }}>
                      {getInternalBookingDaysInMonth(internalBookingCalendarMonth).map((dayObj, idx) => {
                        if (dayObj.day === null) {
                          return <div key={`empty-${idx}`} />;
                        }
                        const isSelected = internalBookingDate === dayObj.dateStr;
                        return (
                          <button
                            key={`day-${dayObj.dateStr}`}
                            type="button"
                            disabled={!dayObj.isAvailable}
                            onClick={() => {
                              setInternalBookingDate(dayObj.dateStr);
                              setInternalBookingCalendarExpanded(false);
                            }}
                            style={{
                              border: 'none',
                              background: isSelected 
                                ? '#B9783B' 
                                : 'transparent',
                              color: isSelected 
                                ? 'white' 
                                : dayObj.isAvailable 
                                  ? '#D8C7AF' 
                                  : 'rgba(255,255,255,0.15)',
                              padding: '0.35rem 0',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: isSelected ? 700 : 500,
                              cursor: dayObj.isAvailable ? 'pointer' : 'not-allowed',
                              textDecoration: dayObj.isAvailable ? 'none' : 'line-through',
                              position: 'relative'
                            }}
                            title={dayObj.isAvailable ? undefined : 'Fully Booked / Unavailable'}
                          >
                            {dayObj.day}
                            <span style={{
                              position: 'absolute',
                              bottom: '2px',
                              left: '50%',
                              transform: 'translateX(-50%)',
                              width: '3px',
                              height: '3px',
                              borderRadius: '50%',
                              background: isSelected 
                                ? 'white' 
                                : dayObj.isAvailable 
                                  ? '#708C84' 
                                  : '#ef4444'
                            }} />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Time Slots (Chips Presentation) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#D8C7AF' }}>Select Departure Time Slot</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {(() => {
                    const selectedAdv = adventures.find(a => a.id === internalBookingAdventureId || a.slug === internalBookingAdventureId);
                    const startTimes = selectedAdv?.startTimes && selectedAdv.startTimes.length > 0 ? selectedAdv.startTimes : START_TIMES;

                    return startTimes.map((time: string) => {
                      const isSelected = internalBookingTime === time;
                      const checkResult = internalBookingDate && internalBookingVesselSlug
                        ? checkInternalBookingSlotAvailability(internalBookingVesselSlug, internalBookingDate, time)
                        : { blocked: false };
                      const isTimeBlocked = checkResult.blocked;

                      let titleText = undefined;
                      if (isTimeBlocked) {
                        if (checkResult.reason === 'booking-overlap') {
                          titleText = `Booked by ${checkResult.detail || 'another guest'} (or blocked by transit buffer)`;
                        } else if (checkResult.reason === 'vessel-blackout') {
                          titleText = `Blocked for maintenance: ${checkResult.detail || 'blackout'}`;
                        } else if (checkResult.reason === 'checkout-lock') {
                          titleText = "Temporarily held in another guest's checkout";
                        } else {
                          titleText = 'Unavailable';
                        }
                      }

                      return (
                        <button
                          key={time}
                          type="button"
                          disabled={isTimeBlocked && !internalBookingBypassConflicts}
                          onClick={() => {
                            setInternalBookingTime(time);
                            if (selectedAdv) {
                              const durationMinutes = selectedAdv.guestDurationMinutes || 240;
                              const [h, m] = time.split(':').map(Number);
                              const totalMinutes = h * 60 + m + durationMinutes;
                              const endH = Math.floor(totalMinutes / 60) % 24;
                              const endM = totalMinutes % 60;
                              const endStr = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
                              setInternalBookingEndTime(endStr);
                            }
                          }}
                          style={{
                            flex: '1 0 70px',
                            minWidth: '70px',
                            padding: '0.5rem 0.6rem',
                            borderRadius: '6px',
                            border: isSelected 
                              ? '1px solid #B9783B' 
                              : isTimeBlocked 
                                ? '1px dashed rgba(255,255,255,0.04)' 
                                : '1px solid rgba(255, 255, 255, 0.1)',
                            background: isSelected 
                              ? 'rgba(185, 120, 59, 0.15)' 
                              : isTimeBlocked 
                                ? 'rgba(255,255,255,0.01)' 
                                : 'rgba(255, 255, 255, 0.02)',
                            color: isSelected 
                              ? '#B9783B' 
                              : isTimeBlocked 
                                ? 'rgba(255,255,255,0.15)' 
                                : '#D8C7AF',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            cursor: (isTimeBlocked && !internalBookingBypassConflicts) ? 'not-allowed' : 'pointer',
                            textDecoration: (isTimeBlocked && !internalBookingBypassConflicts) ? 'line-through' : 'none',
                            transition: 'all 0.2s',
                            textAlign: 'center'
                          }}
                          title={titleText}
                        >
                          {time}
                        </button>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* Start & End Time (Exact Overrides) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#D8C7AF', marginBottom: '0.35rem' }}>Start Time (Exact Override)</label>
                  <input
                    type="time"
                    value={internalBookingTime}
                    onChange={e => {
                      const newStart = e.target.value;
                      setInternalBookingTime(newStart);
                      
                      const selectedAdv = adventures.find(a => a.id === internalBookingAdventureId || a.slug === internalBookingAdventureId);
                      if (selectedAdv && newStart && internalBookingEndTime) {
                        const prevDuration = getDurationMinutes(newStart, internalBookingEndTime) || selectedAdv.guestDurationMinutes || 240;
                        const [h, m] = newStart.split(':').map(Number);
                        const totalMinutes = h * 60 + m + prevDuration;
                        const endH = Math.floor(totalMinutes / 60) % 24;
                        const endM = totalMinutes % 60;
                        setInternalBookingEndTime(`${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`);
                      }
                    }}
                    style={{ width: '100%', padding: '0.65rem 0.75rem', background: '#121416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', fontSize: '0.825rem', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#D8C7AF', marginBottom: '0.35rem' }}>End Time (Exact Override)</label>
                  <input
                    type="time"
                    value={internalBookingEndTime}
                    onChange={e => setInternalBookingEndTime(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem 0.75rem', background: '#121416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', fontSize: '0.825rem', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              {/* Calculated Duration Display */}
              {internalBookingTime && internalBookingEndTime && (
                <div style={{ fontSize: '0.75rem', color: '#D8C7AF', opacity: 0.85, display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(255,255,255,0.02)', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <Clock size={12} color="#B9783B" />
                  <span>
                    Calculated Duration: <strong>{(() => {
                      const mins = getDurationMinutes(internalBookingTime, internalBookingEndTime);
                      const hrs = Math.floor(mins / 60);
                      const remMins = mins % 60;
                      if (hrs === 0) return `${remMins}m`;
                      if (remMins === 0) return `${hrs}h`;
                      return `${hrs}h ${remMins}m`;
                    })()}</strong>
                  </span>
                  {(() => {
                    const selectedAdv = adventures.find(a => a.id === internalBookingAdventureId || a.slug === internalBookingAdventureId);
                    if (selectedAdv) {
                      const defaultMins = selectedAdv.guestDurationMinutes || 240;
                      const currentMins = getDurationMinutes(internalBookingTime, internalBookingEndTime);
                      if (currentMins !== defaultMins) {
                        const defHrs = Math.floor(defaultMins / 60);
                        const defMins = defaultMins % 60;
                        return (
                          <span style={{ color: '#E2A15E', marginLeft: '0.5rem', fontWeight: 600 }}>
                            (Custom Override — Default is {defHrs}h{defMins > 0 ? ` ${defMins}m` : ''})
                          </span>
                        );
                      }
                    }
                    return null;
                  })()}
                </div>
              )}

              {/* Intermediary / Agent Toggle & Select */}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '0.75rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.825rem', color: 'white', cursor: 'pointer', height: '100%' }}>
                    <input
                      type="checkbox"
                      checked={internalBookingBookedViaAgent}
                      onChange={e => {
                        const checked = e.target.checked;
                        setInternalBookingBookedViaAgent(checked);
                        if (!checked) {
                          handleAgentChange('');
                        } else {
                          const list = getAvailableAgents();
                          if (list.length > 0) {
                            handleAgentChange(list[0].id);
                          }
                        }
                      }}
                      style={{ accentColor: '#B9783B', cursor: 'pointer' }}
                    />
                    <span>Booked via Agent / OTA</span>
                  </label>

                  {internalBookingBookedViaAgent && (() => {
                    const list = getAvailableAgents();
                    if (list.length === 0) {
                      return (
                        <div style={{ fontSize: '0.76rem', color: '#E2A15E', alignSelf: 'center', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <AlertCircle size={12} /> No registered agents found.
                        </div>
                      );
                    }
                    return (
                      <select
                        value={internalBookingAgentId}
                        onChange={e => handleAgentChange(e.target.value)}
                        style={{ width: '100%', padding: '0.5rem 0.75rem', background: '#121416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', fontSize: '0.78rem', outline: 'none', boxSizing: 'border-box' }}
                      >
                        <option value="">-- Choose Partner Agent --</option>
                        {list.map(ag => (
                          <option key={ag.id} value={ag.id}>{ag.name}</option>
                        ))}
                      </select>
                    );
                  })()}
                </div>

                {internalBookingAgentId !== '' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginTop: '0.75rem', padding: '0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.04)' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.68rem', color: '#D8C7AF', opacity: 0.8, marginBottom: '0.25rem' }}>Commission Type</label>
                      <select
                        value={internalBookingCommissionType}
                        onChange={e => {
                          const type = e.target.value as any;
                          setInternalBookingCommissionType(type);
                          recalculateCommission(internalBookingSubtotal, type, internalBookingCommissionRate, internalBookingCommissionAmount);
                        }}
                        style={{ width: '100%', padding: '0.45rem', background: '#121416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', fontSize: '0.74rem', outline: 'none' }}
                      >
                        <option value="none">None</option>
                        <option value="percentage">Percentage (%)</option>
                        <option value="flat">Flat Amount ($)</option>
                      </select>
                    </div>
                    {internalBookingCommissionType === 'percentage' && (
                      <div>
                        <label style={{ display: 'block', fontSize: '0.68rem', color: '#D8C7AF', opacity: 0.8, marginBottom: '0.25rem' }}>Commission Rate (%)</label>
                        <input
                          type="number"
                          value={internalBookingCommissionRate}
                          onChange={e => {
                            const rate = Number(e.target.value);
                            setInternalBookingCommissionRate(rate);
                            recalculateCommission(internalBookingSubtotal, 'percentage', rate, internalBookingCommissionAmount);
                          }}
                          style={{ width: '100%', padding: '0.45rem', background: '#121416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', fontSize: '0.74rem', outline: 'none', boxSizing: 'border-box' }}
                        />
                      </div>
                    )}
                    {internalBookingCommissionType !== 'none' && (
                      <div>
                        <label style={{ display: 'block', fontSize: '0.68rem', color: '#D8C7AF', opacity: 0.8, marginBottom: '0.25rem' }}>Commission Amt ($)</label>
                        <input
                          type="number"
                          value={internalBookingCommissionAmount}
                          disabled={internalBookingCommissionType === 'percentage'}
                          onChange={e => setInternalBookingCommissionAmount(Number(e.target.value))}
                          style={{ width: '100%', padding: '0.45rem', background: internalBookingCommissionType === 'percentage' ? '#1E2124' : '#121416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', fontSize: '0.74rem', outline: 'none', boxSizing: 'border-box' }}
                        />
                      </div>
                    )}
                    {internalBookingCommissionType !== 'none' && (
                      <div>
                        <label style={{ display: 'block', fontSize: '0.68rem', color: '#D8C7AF', opacity: 0.8, marginBottom: '0.25rem' }}>Payout Status</label>
                        <select
                          value={internalBookingCommissionStatus}
                          onChange={e => setInternalBookingCommissionStatus(e.target.value as any)}
                          style={{ width: '100%', padding: '0.45rem', background: '#121416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', fontSize: '0.74rem', outline: 'none' }}
                        >
                          <option value="unpaid">Unpaid</option>
                          <option value="paid">Paid</option>
                          <option value="n/a">N/A</option>
                        </select>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Pricing Overrides & Accounting */}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.825rem', color: 'white', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={internalBookingPricingOverridden}
                      onChange={e => setInternalBookingPricingOverridden(e.target.checked)}
                      style={{ accentColor: '#B9783B', cursor: 'pointer' }}
                    />
                    <span>Override default experience pricing</span>
                  </label>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.68rem', color: '#D8C7AF', opacity: 0.8, marginBottom: '0.25rem' }}>Subtotal (USD)</label>
                    <input
                      type="number"
                      value={internalBookingSubtotal}
                      disabled={!internalBookingPricingOverridden}
                      onChange={e => {
                        const sub = Number(e.target.value);
                        const tax = Number((sub * 0.07).toFixed(2));
                        handlePricingChange(sub, tax, Number((sub + tax).toFixed(2)));
                      }}
                      style={{ width: '100%', padding: '0.5rem 0.75rem', background: internalBookingPricingOverridden ? '#121416' : '#1E2124', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: internalBookingPricingOverridden ? 'white' : '#888', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.68rem', color: '#D8C7AF', opacity: 0.8, marginBottom: '0.25rem' }}>Sales Tax (7%)</label>
                    <input
                      type="number"
                      value={internalBookingSalesTax}
                      disabled={!internalBookingPricingOverridden}
                      onChange={e => {
                        const tax = Number(e.target.value);
                        handlePricingChange(internalBookingSubtotal, tax, Number((internalBookingSubtotal + tax).toFixed(2)));
                      }}
                      style={{ width: '100%', padding: '0.5rem 0.75rem', background: internalBookingPricingOverridden ? '#121416' : '#1E2124', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: internalBookingPricingOverridden ? 'white' : '#888', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.68rem', color: '#D8C7AF', opacity: 0.8, marginBottom: '0.25rem' }}>Grand Total</label>
                    <input
                      type="number"
                      value={internalBookingGrandTotal}
                      disabled={!internalBookingPricingOverridden}
                      onChange={e => {
                        const total = Number(e.target.value);
                        handlePricingChange(internalBookingSubtotal, internalBookingSalesTax, total);
                      }}
                      style={{ width: '100%', padding: '0.5rem 0.75rem', background: internalBookingPricingOverridden ? '#121416' : '#1E2124', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: internalBookingPricingOverridden ? 'white' : '#888', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
              </div>

              {/* Payments & External Reconciliation */}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1rem', display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#D8C7AF', marginBottom: '0.35rem' }}>Payment Method</label>
                  <select
                    value={internalBookingPaymentMethod}
                    onChange={e => setInternalBookingPaymentMethod(e.target.value as any)}
                    style={{ width: '100%', padding: '0.65rem 0.75rem', background: '#121416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', fontSize: '0.825rem', outline: 'none', boxSizing: 'border-box' }}
                  >
                    <option value="none">External / Unreconciled</option>
                    <option value="card">Processed Credit Card</option>
                    <option value="eft">Wire / Check / EFT</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#D8C7AF', marginBottom: '0.35rem' }}>External Reconciliation Ref</label>
                  <input
                    type="text"
                    value={internalBookingReconciliationRef}
                    onChange={e => setInternalBookingReconciliationRef(e.target.value)}
                    placeholder="e.g. OTA Confirmation ID, Invoice #"
                    style={{ width: '100%', padding: '0.65rem 0.75rem', background: '#121416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', fontSize: '0.825rem', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              {/* Notification Loop Toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'white', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={internalBookingSendNotification}
                    onChange={e => setInternalBookingSendNotification(e.target.checked)}
                    style={{ accentColor: '#B9783B', cursor: 'pointer' }}
                  />
                  <span>Send booking confirmation & digital waiver request email to guest</span>
                </label>
              </div>

              {/* Conflict Check Warning Loop */}
              {internalBookingConflictWarning && (
                <div style={{ padding: '0.75rem', background: 'rgba(226,161,94,0.08)', border: '1px solid rgba(226,161,94,0.3)', borderRadius: '6px', fontSize: '0.75rem', color: '#E2A15E' }}>
                  <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>Availability Warning:</div>
                  <div style={{ whiteSpace: 'pre-wrap', marginBottom: '0.5rem' }}>{internalBookingConflictWarning}</div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', cursor: 'pointer', fontWeight: 600 }}>
                    <input
                      type="checkbox"
                      checked={internalBookingBypassConflicts}
                      onChange={e => setInternalBookingBypassConflicts(e.target.checked)}
                      style={{ accentColor: '#E2A15E' }}
                    />
                    <span>Ignore conflict (Force bareboat scheduling anyway)</span>
                  </label>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', padding: '1rem 1.5rem', borderTop: '1px solid rgba(255,255,255,0.08)', background: '#191C1E' }}>
              <button 
                type="button" 
                onClick={() => {
                  setShowInternalBookingModal(false);
                  resetInternalBookingForm();
                }} 
                style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#D8C7AF', padding: '0.55rem 1.25rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={handleSaveInternalBooking}
                disabled={isSavingInternalBooking}
                style={{ background: '#B9783B', border: 'none', color: 'white', padding: '0.55rem 1.25rem', borderRadius: '6px', cursor: isSavingInternalBooking ? 'not-allowed' : 'pointer', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              >
                {isSavingInternalBooking ? <Loader2 size={14} className="animate-spin" /> : 'Save Booking'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD BLACKOUT PERIOD MODAL */}
      {showBlackoutModal && (
        <div 
          style={{ position: 'fixed', inset: 0, zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)', padding: '2rem' }}
          onClick={() => {
            setShowBlackoutModal(false);
            resetBlackoutForm();
          }}
        >
          <div 
            style={{ background: '#1E2124', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px rgba(0,0,0,0.5)', animation: 'fadeIn 0.25s ease-out' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <h2 style={{ fontSize: '1.35rem', fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, margin: 0, color: 'white' }}>
                Schedule Vessel Blackout Range
              </h2>
              <button 
                onClick={() => {
                  setShowBlackoutModal(false);
                  resetBlackoutForm();
                }} 
                style={{ background: 'transparent', border: 'none', color: '#D8C7AF', cursor: 'pointer', padding: '0.25rem' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#D8C7AF', marginBottom: '0.35rem' }}>Select Vessel *</label>
                <select
                  value={blackoutVesselSlug}
                  onChange={e => setBlackoutVesselSlug(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 0.75rem', background: '#121416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', fontSize: '0.825rem', outline: 'none', boxSizing: 'border-box' }}
                >
                  <option value="">-- Choose Vessel --</option>
                  {vessels.map(v => (
                    <option key={v.slug} value={v.slug}>{v.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#D8C7AF', marginBottom: '0.35rem' }}>Blackout Title / Event Name *</label>
                <input
                  type="text"
                  value={blackoutTitle}
                  onChange={e => setBlackoutTitle(e.target.value)}
                  placeholder="e.g. Scheduled Engine Overhaul, Haul Out"
                  style={{ width: '100%', padding: '0.65rem 0.75rem', background: '#121416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', fontSize: '0.825rem', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#D8C7AF', marginBottom: '0.35rem' }}>Start Date *</label>
                  <input
                    type="date"
                    value={blackoutStartDate}
                    onChange={e => setBlackoutStartDate(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem 0.75rem', background: '#121416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', fontSize: '0.825rem', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#D8C7AF', marginBottom: '0.35rem' }}>End Date *</label>
                  <input
                    type="date"
                    value={blackoutEndDate}
                    onChange={e => setBlackoutEndDate(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem 0.75rem', background: '#121416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', fontSize: '0.825rem', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#D8C7AF', marginBottom: '0.35rem' }}>Start Time (Optional)</label>
                  <input
                    type="time"
                    value={blackoutStartTime}
                    onChange={e => setBlackoutStartTime(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem 0.75rem', background: '#121416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', fontSize: '0.825rem', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#D8C7AF', marginBottom: '0.35rem' }}>End Time (Optional)</label>
                  <input
                    type="time"
                    value={blackoutEndTime}
                    onChange={e => setBlackoutEndTime(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem 0.75rem', background: '#121416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', fontSize: '0.825rem', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#D8C7AF', marginBottom: '0.35rem' }}>Maintenance / Blackout Notes</label>
                <textarea
                  value={blackoutNotes}
                  onChange={e => setBlackoutNotes(e.target.value)}
                  placeholder="Details about maintenance crew, specific tasks, etc."
                  rows={3}
                  style={{ width: '100%', padding: '0.65rem 0.75rem', background: '#121416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', fontSize: '0.825rem', outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
                />
              </div>

              {/* Conflict Check Warning Loop */}
              {blackoutConflictWarning && (
                <div style={{ padding: '0.75rem', background: 'rgba(226,161,94,0.08)', border: '1px solid rgba(226,161,94,0.3)', borderRadius: '6px', fontSize: '0.75rem', color: '#E2A15E' }}>
                  <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>Active Bookings Warning:</div>
                  <div style={{ whiteSpace: 'pre-wrap', marginBottom: '0.5rem' }}>{blackoutConflictWarning}</div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', cursor: 'pointer', fontWeight: 600 }}>
                    <input
                      type="checkbox"
                      checked={blackoutBypassConflicts}
                      onChange={e => setBlackoutBypassConflicts(e.target.checked)}
                      style={{ accentColor: '#E2A15E' }}
                    />
                    <span>Ignore conflicts (Force blackout scheduling anyway)</span>
                  </label>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', padding: '1rem 1.5rem', borderTop: '1px solid rgba(255,255,255,0.08)', background: '#191C1E' }}>
              <button 
                type="button" 
                onClick={() => {
                  setShowBlackoutModal(false);
                  resetBlackoutForm();
                }} 
                style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#D8C7AF', padding: '0.55rem 1.25rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={handleSaveBlackout}
                disabled={isSavingBlackout}
                style={{ background: '#B9783B', border: 'none', color: 'white', padding: '0.55rem 1.25rem', borderRadius: '6px', cursor: isSavingBlackout ? 'not-allowed' : 'pointer', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              >
                {isSavingBlackout ? <Loader2 size={14} className="animate-spin" /> : 'Schedule Blackout'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Styled slideIn and fadeIn animations */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-5px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      ` }} />
    </div>
  );
}
