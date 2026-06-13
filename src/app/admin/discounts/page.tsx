'use client';

import { useAuth } from '@/components/AuthProvider';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { 
  ArrowLeft, Search, Tag, CheckCircle2, 
  XCircle, Trash2, Edit3, Plus, 
  Loader2, DollarSign, Percent, Calendar, RefreshCw, BarChart2
} from 'lucide-react';
import { 
  getAllDiscountCodes, saveDiscountCode, deleteDiscountCode, DiscountCode,
  getAllBookings, BookingRecord
} from '@/lib/db';

export default function DiscountsDashboard() {
  const { user } = useAuth();
  const router = useRouter();

  // Data states
  const [discounts, setDiscounts] = useState<DiscountCode[]>([]);
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  
  // Modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<DiscountCode | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Form fields
  const [formCode, setFormCode] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDiscountType, setFormDiscountType] = useState<'percent' | 'flat'>('percent');
  const [formValue, setFormValue] = useState<number>(0);
  const [formExpirationDate, setFormExpirationDate] = useState('');
  const [formActive, setFormActive] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [discountData, bookingsData] = await Promise.all([
        getAllDiscountCodes(),
        getAllBookings()
      ]);
      setDiscounts(discountData);
      setBookings(bookingsData);
    } catch (err) {
      console.error('Error fetching discounts and bookings:', err);
      showToast('error', 'Failed to retrieve discount codes and bookings.');
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

  const handleOpenCreateModal = () => {
    setEditingDiscount(null);
    setFormCode('');
    setFormDescription('');
    setFormDiscountType('percent');
    setFormValue(0);
    setFormExpirationDate('');
    setFormActive(true);
    setFormError(null);
    setShowEditModal(true);
  };

  const handleOpenEditModal = (discount: DiscountCode) => {
    setEditingDiscount(discount);
    setFormCode(discount.code);
    setFormDescription(discount.description || '');
    setFormDiscountType(discount.discountType);
    setFormValue(discount.value);
    setFormExpirationDate(discount.expirationDate || '');
    setFormActive(discount.active);
    setFormError(null);
    setShowEditModal(true);
  };

  const handleSaveDiscount = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    
    // Validations
    const cleanedCode = formCode.toUpperCase().trim().replace(/[^A-Z0-9_-]/g, '');
    if (!cleanedCode) {
      setFormError('Please enter a valid alphanumeric code.');
      return;
    }

    if (formValue <= 0) {
      setFormError('Discount value must be greater than zero.');
      return;
    }

    if (formDiscountType === 'percent' && formValue > 100) {
      setFormError('Percentage discount cannot exceed 100%.');
      return;
    }

    // Check unique code on creation
    if (!editingDiscount) {
      const exists = discounts.some(d => d.code === cleanedCode);
      if (exists) {
        setFormError(`Discount code "${cleanedCode}" already exists.`);
        return;
      }
    }

    setIsSaving(true);
    try {
      const payload: DiscountCode = {
        id: editingDiscount?.id || `discount-${cleanedCode}`,
        type: 'discount',
        code: cleanedCode,
        description: formDescription,
        discountType: formDiscountType,
        value: Number(formValue),
        expirationDate: formExpirationDate ? formExpirationDate : null,
        active: formActive,
        createdAt: editingDiscount?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await saveDiscountCode(payload);
      showToast('success', editingDiscount ? 'Discount code updated successfully.' : 'Discount code created successfully.');
      setShowEditModal(false);
      fetchData();
    } catch (err) {
      console.error('Error saving discount:', err);
      setFormError('Failed to save discount code database entry.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteDiscount = async (code: string) => {
    if (!confirm(`Are you sure you want to delete the discount code "${code}"?`)) {
      return;
    }

    try {
      await deleteDiscountCode(code);
      showToast('success', `Discount code "${code}" deleted.`);
      fetchData();
    } catch (err) {
      console.error('Error deleting discount:', err);
      showToast('error', `Failed to delete discount code "${code}".`);
    }
  };

  const handleToggleActive = async (discount: DiscountCode) => {
    try {
      const updated = {
        ...discount,
        active: !discount.active,
        updatedAt: new Date().toISOString()
      };
      await saveDiscountCode(updated);
      showToast('success', `Code "${discount.code}" is now ${updated.active ? 'active' : 'inactive'}.`);
      fetchData();
    } catch (err) {
      console.error('Error toggling active state:', err);
      showToast('error', `Failed to toggle status for code "${discount.code}".`);
    }
  };

  // Processing client filter and search list
  const processedDiscounts = discounts.filter(d => {
    const matchesSearch = 
      d.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = 
      statusFilter === 'all' || 
      (statusFilter === 'active' && d.active) ||
      (statusFilter === 'inactive' && !d.active);

    return matchesSearch && matchesStatus;
  });

  // Helper to calculate statistics for a specific discount code
  const getCodeStats = (code: string) => {
    const codeBookings = bookings.filter(
      b => b.discountCode?.toUpperCase() === code.toUpperCase() && b.status !== 'cancelled'
    );
    const uses = codeBookings.length;
    const totalPurchased = codeBookings.reduce((sum, b) => sum + (b.grandTotal || 0), 0);
    return { uses, totalPurchased };
  };

  // Aggregate stats
  const totalCount = discounts.length;
  const activeCount = discounts.filter(d => d.active).length;
  const inactiveCount = discounts.filter(d => !d.active).length;

  const totalUses = bookings.filter(
    b => b.discountCode && b.status !== 'cancelled'
  ).length;

  const totalValuePurchased = bookings
    .filter(b => b.discountCode && b.status !== 'cancelled')
    .reduce((sum, b) => sum + (b.grandTotal || 0), 0);

  const inputStyle = {
    padding: '0.65rem 0.75rem',
    background: '#121416',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '6px',
    color: '#F4F1EA',
    fontSize: '0.875rem',
    outline: 'none',
  };

  return (
    <div style={{ minHeight: '100vh', background: '#121416', color: '#F4F1EA', fontFamily: "'Inter', sans-serif" }}>
      {/* Top Navbar */}
      <nav style={{ background: '#1E2124', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 600, fontSize: '1.25rem', color: '#B9783B' }}>
          <Tag size={24} /> Discount Codes Manager
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
              Promotional Codes
            </h1>
            <p style={{ color: '#D8C7AF', opacity: 0.8, margin: 0 }}>
              Create and manage customer discounts (percentage or flat rate vouchers), configure expiry bounds, and toggle live status.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button 
              onClick={fetchData}
              style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.02)', padding: '0.55rem 0.85rem', borderRadius: '6px', color: '#D8C7AF', cursor: 'pointer', fontSize: '0.8rem' }}
            >
              <RefreshCw size={14} /> Refresh
            </button>
            <button 
              onClick={handleOpenCreateModal}
              style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', border: 'none', background: '#B9783B', padding: '0.55rem 1.25rem', borderRadius: '6px', color: 'white', fontWeight: 600, cursor: 'pointer', fontSize: '0.8rem', boxShadow: '0 2px 8px rgba(185,120,59,0.2)' }}
            >
              <Plus size={14} /> Create Discount Code
            </button>
          </div>
        </div>

        {/* Aggregate stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ background: '#1E2124', border: '1px solid rgba(255,255,255,0.05)', padding: '1.25rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ background: 'rgba(185,120,59,0.1)', color: '#B9783B', padding: '0.75rem', borderRadius: '8px' }}>
              <Tag size={24} />
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: '#D8C7AF', opacity: 0.6, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Voucher Codes</span>
              <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white' }}>{totalCount} Codes</span>
            </div>
          </div>

          <div style={{ background: '#1E2124', border: '1px solid rgba(255,255,255,0.05)', padding: '1.25rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ background: 'rgba(112, 140, 132, 0.1)', color: '#708C84', padding: '0.75rem', borderRadius: '8px' }}>
              <CheckCircle2 size={24} />
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: '#D8C7AF', opacity: 0.6, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active & Available</span>
              <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white' }}>{activeCount} Codes</span>
            </div>
          </div>

          <div style={{ background: '#1E2124', border: '1px solid rgba(255,255,255,0.05)', padding: '1.25rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '0.75rem', borderRadius: '8px' }}>
              <XCircle size={24} />
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: '#D8C7AF', opacity: 0.6, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Disabled / Inactive</span>
              <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white' }}>{inactiveCount} Codes</span>
            </div>
          </div>

          <div style={{ background: '#1E2124', border: '1px solid rgba(255,255,255,0.05)', padding: '1.25rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ background: 'rgba(185,120,59,0.1)', color: '#B9783B', padding: '0.75rem', borderRadius: '8px' }}>
              <BarChart2 size={24} />
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: '#D8C7AF', opacity: 0.6, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Uses</span>
              <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white' }}>{totalUses} Uses</span>
            </div>
          </div>

          <div style={{ background: '#1E2124', border: '1px solid rgba(255,255,255,0.05)', padding: '1.25rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ background: 'rgba(112, 140, 132, 0.1)', color: '#708C84', padding: '0.75rem', borderRadius: '8px' }}>
              <DollarSign size={24} />
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: '#D8C7AF', opacity: 0.6, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Value Purchased</span>
              <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white' }}>${totalValuePurchased.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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
              placeholder="Search by code or description..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ padding: '0.6rem 0.75rem', background: 'transparent', border: 'none', color: 'white', fontSize: '0.85rem', outline: 'none', flex: 1 }}
            />
          </div>

          {/* Status selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', color: '#D8C7AF', opacity: 0.7 }}>Status Filter:</span>
            <select 
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              style={{ padding: '0.55rem 0.75rem', background: '#121416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', fontSize: '0.8rem', outline: 'none', cursor: 'pointer' }}
            >
              <option value="all">All Codes</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
        </div>

        {/* Data Table */}
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '4rem', flexDirection: 'column', gap: '1rem' }}>
            <Loader2 size={32} className="animate-spin" style={{ color: '#B9783B' }} />
            <span style={{ color: '#D8C7AF' }}>Loading promo vouchers...</span>
          </div>
        ) : processedDiscounts.length === 0 ? (
          <div style={{ background: '#1E2124', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '4rem 2rem', textAlign: 'center' }}>
            <Tag size={40} color="#B9783B" style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
            <h4 style={{ color: 'white', fontSize: '1.15rem', margin: '0 0 0.5rem 0' }}>No Discount Codes Found</h4>
            <p style={{ color: '#D8C7AF', opacity: 0.7, margin: 0, fontSize: '0.85rem' }}>Create a new promo code or clear the search criteria filter.</p>
          </div>
        ) : (
          <div style={{ background: '#1E2124', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#121416', borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#D8C7AF', opacity: 0.8, textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '0.85rem 1rem' }}>Voucher Code</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Description</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>Type</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Discount Value</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>Expiration Date</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>Uses</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Total Purchased</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>Status</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {processedDiscounts.map(d => {
                  const stats = getCodeStats(d.code);
                  return (
                    <tr 
                      key={d.id} 
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'all 0.15s' }}
                      onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.01)'}
                      onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '1rem', fontWeight: 700, color: '#B9783B', fontSize: '0.9rem', fontFamily: 'monospace' }}>
                        {d.code}
                      </td>
                      <td style={{ padding: '1rem', color: '#D8C7AF' }}>
                        {d.description || <span style={{ opacity: 0.3, fontStyle: 'italic' }}>No notes</span>}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center', color: 'white' }}>
                        {d.discountType === 'percent' ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}><Percent size={12} /> Percentage</span>
                        ) : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}><DollarSign size={12} /> Flat Rate</span>
                        )}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 700, color: 'white', fontSize: '0.9rem' }}>
                        {d.discountType === 'percent' ? `${d.value}%` : `$${d.value}`}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center', color: '#D8C7AF', opacity: 0.8 }}>
                        {d.expirationDate ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}><Calendar size={12} /> {d.expirationDate}</span>
                        ) : (
                          <span style={{ opacity: 0.3 }}>Never Expires</span>
                        )}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center', color: 'white', fontWeight: 500 }}>
                        {stats.uses}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 700, color: 'white', fontSize: '0.9rem' }}>
                        ${stats.totalPurchased.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        <button
                          onClick={() => handleToggleActive(d)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '0.68rem', 
                            padding: '0.15rem 0.45rem', 
                            borderRadius: '4px', 
                            fontWeight: 700,
                            backgroundColor: d.active 
                              ? 'rgba(112, 140, 132, 0.12)' 
                              : 'rgba(239, 68, 68, 0.12)', 
                            color: d.active 
                              ? '#708C84' 
                              : '#ef4444'
                          }}
                          title="Click to toggle status"
                        >
                          {d.active ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                          <button 
                            onClick={() => handleOpenEditModal(d)}
                            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '4px', padding: '0.35rem', cursor: 'pointer', color: '#D8C7AF', display: 'inline-flex', alignItems: 'center' }}
                            title="Edit Code Settings"
                          >
                            <Edit3 size={12} />
                          </button>
                          <button 
                            onClick={() => handleDeleteDiscount(d.code)}
                            style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: '4px', padding: '0.35rem', cursor: 'pointer', color: '#ef4444', display: 'inline-flex', alignItems: 'center' }}
                            title="Delete Code"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* CREATE / EDIT CODE MODAL */}
      {showEditModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1.5rem'
        }}>
          <div style={{
            background: '#1E2124',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '500px',
            padding: '2rem',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)',
            position: 'relative',
          }}>
            <h2 style={{ fontSize: '1.5rem', fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.75rem' }}>
              {editingDiscount ? `Edit Promo Code: ${editingDiscount.code}` : 'Create Discount Voucher'}
            </h2>
            
            <form onSubmit={handleSaveDiscount} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>
                Promo Voucher Code
                <input 
                  type="text"
                  placeholder="e.g. SUMMER2026"
                  value={formCode}
                  onChange={e => setFormCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''))}
                  disabled={!!editingDiscount}
                  style={{
                    ...inputStyle,
                    fontFamily: 'monospace',
                    opacity: editingDiscount ? 0.6 : 1,
                    textTransform: 'uppercase'
                  }}
                  required
                />
                <span style={{ fontSize: '0.72rem', color: '#D8C7AF', opacity: 0.6, fontWeight: 'normal' }}>Capital letters, numbers, dashes, and underscores only. Unique identifier.</span>
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>
                Internal Notes / Description
                <input 
                  type="text"
                  placeholder="e.g. 20% off all seasonal charters"
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  style={inputStyle}
                />
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1rem' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>
                  Discount Calculation Type
                  <select
                    value={formDiscountType}
                    onChange={e => {
                      setFormDiscountType(e.target.value as any);
                      setFormValue(0);
                    }}
                    style={{ ...inputStyle, cursor: 'pointer' }}
                  >
                    <option value="percent">Percentage Off (%)</option>
                    <option value="flat">Flat Dollar Amount ($)</option>
                  </select>
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>
                  Value ({formDiscountType === 'percent' ? '%' : '$'})
                  <input 
                    type="number"
                    min={1}
                    max={formDiscountType === 'percent' ? 100 : 100000}
                    step={1}
                    value={formValue || ''}
                    onChange={e => setFormValue(Math.max(0, Number(e.target.value) || 0))}
                    style={inputStyle}
                    required
                  />
                </label>
              </div>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>
                Expiration Date (Optional)
                <input 
                  type="date"
                  value={formExpirationDate}
                  onChange={e => setFormExpirationDate(e.target.value)}
                  style={{ ...inputStyle, cursor: 'pointer' }}
                />
              </label>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.5rem 0', cursor: 'pointer', userSelect: 'none' }}>
                <input 
                  type="checkbox"
                  id="formActiveCheck"
                  checked={formActive}
                  onChange={e => setFormActive(e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#B9783B' }}
                />
                <label htmlFor="formActiveCheck" style={{ fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}>
                  Enable Voucher Immediately (Active)
                </label>
              </div>

              {formError && (
                <div style={{ color: '#EF4444', fontSize: '0.85rem', background: 'rgba(239,68,68,0.08)', padding: '0.75rem', borderRadius: '6px', border: '1px solid rgba(239,68,68,0.2)' }}>
                  ⚠️ {formError}
                </div>
              )}

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1.25rem' }}>
                <button 
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  style={{
                    flex: 1,
                    padding: '0.65rem',
                    background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#D8C7AF',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.85rem'
                  }}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isSaving}
                  style={{
                    flex: 1,
                    padding: '0.65rem',
                    background: '#B9783B',
                    border: 'none',
                    color: 'white',
                    borderRadius: '6px',
                    cursor: isSaving ? 'not-allowed' : 'pointer',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem'
                  }}
                >
                  {isSaving ? <Loader2 size={16} className="animate-spin" /> : 'Save Promo Code'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
