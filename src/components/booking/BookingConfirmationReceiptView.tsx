'use client';

import React, { useState } from 'react';
import { BookingReceiptData } from '@/lib/receipt';
import { 
  Printer, Mail, ExternalLink, CheckCircle, Ship, 
  MapPin, Anchor, UserCheck, ShieldCheck, Clock, Calendar, 
  DollarSign, Loader2, ArrowRight
} from 'lucide-react';

interface BookingConfirmationReceiptViewProps {
  data: BookingReceiptData;
  onClose?: () => void;
  showAdminActions?: boolean;
  autoPrint?: boolean;
}

const formatCurrency = (val: number) => {
  return `$${Number(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export default function BookingConfirmationReceiptView({
  data,
  onClose,
  showAdminActions = true,
  autoPrint = false,
}: BookingConfirmationReceiptViewProps) {
  const [recipientEmail, setRecipientEmail] = useState(data.guest.email || '');
  const [isSending, setIsSending] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  React.useEffect(() => {
    if (autoPrint) {
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [autoPrint]);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const handlePrint = () => {
    const isStandalone = typeof window !== 'undefined' && window.location.pathname.includes('/receipt');
    if (isStandalone) {
      window.print();
    } else {
      const printUrl = `/admin/bookings/${data.bookingId}/receipt?print=true`;
      const printWin = window.open(printUrl, '_blank');
      if (printWin) {
        printWin.focus();
      } else {
        window.print();
      }
    }
  };

  const handleSendEmail = async () => {
    if (!recipientEmail || !recipientEmail.includes('@')) {
      showToast('error', 'Please provide a valid recipient email address.');
      return;
    }

    setIsSending(true);
    try {
      const res = await fetch(`/api/admin/bookings/${data.bookingId}/receipt/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientEmail: recipientEmail.trim() })
      });

      const json = await res.json();
      if (res.ok && json.success) {
        showToast('success', `Receipt sent successfully to ${recipientEmail.trim()}`);
      } else {
        showToast('error', json.error || 'Failed to dispatch email receipt.');
      }
    } catch (err: any) {
      console.error('Error sending receipt:', err);
      showToast('error', 'An unexpected error occurred while sending.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="receipt-container" style={{ width: '100%', maxWidth: '850px', margin: '0 auto', color: '#F4F1EA', fontFamily: "var(--font-sans, 'Inter', sans-serif)" }}>
      {/* Toast Notification */}
      {toast && (
        <div className="no-print" style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 9999,
          backgroundColor: toast.type === 'success' ? '#708C84' : '#EF4444',
          color: '#FFFFFF',
          padding: '12px 20px',
          borderRadius: '6px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
          fontWeight: 600,
          fontSize: '0.875rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          {toast.type === 'success' ? '✓' : '⚠️'} {toast.message}
        </div>
      )}

      {/* Admin Action Toolbar (Hidden in print mode) */}
      {showAdminActions && (
        <div className="no-print" style={{
          backgroundColor: '#1E2124',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '8px',
          padding: '14px 18px',
          marginBottom: '20px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#D8C7AF' }}>
              Admin Actions:
            </span>
            <button
              onClick={handlePrint}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                backgroundColor: '#B9783B',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '4px',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}
              onMouseOver={e => e.currentTarget.style.backgroundColor = '#995f2d'}
              onMouseOut={e => e.currentTarget.style.backgroundColor = '#B9783B'}
            >
              <Printer size={15} /> Print / Save PDF
            </button>
            <a
              href={`/admin/bookings/${data.bookingId}/receipt`}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                backgroundColor: 'rgba(255,255,255,0.06)',
                color: '#D8C7AF',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '4px',
                fontSize: '0.82rem',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              <ExternalLink size={14} /> Full Page View
            </a>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <input
              type="email"
              value={recipientEmail}
              onChange={e => setRecipientEmail(e.target.value)}
              placeholder="recipient@example.com"
              style={{
                padding: '7px 12px',
                backgroundColor: '#121416',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '4px',
                color: '#FFFFFF',
                fontSize: '0.82rem',
                minWidth: '220px',
              }}
            />
            <button
              onClick={handleSendEmail}
              disabled={isSending}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                backgroundColor: '#1E3A4C',
                color: '#FFFFFF',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '4px',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: isSending ? 'not-allowed' : 'pointer',
                opacity: isSending ? 0.7 : 1,
              }}
            >
              {isSending ? <Loader2 size={15} className="animate-spin" /> : <Mail size={15} />}
              {isSending ? 'Sending...' : 'Email Receipt'}
            </button>
            {onClose && (
              <button
                onClick={onClose}
                style={{
                  padding: '8px 12px',
                  backgroundColor: 'transparent',
                  color: '#D8C7AF',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '4px',
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            )}
          </div>
        </div>
      )}

      {/* MAIN DOCUMENT (Paper representation) */}
      <div className="printable-receipt" style={{
        backgroundColor: '#1E2124',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '12px',
        padding: '36px',
        boxShadow: '0 12px 40px rgba(0,0,0,0.4)',
      }}>

        {/* Header Branding */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          paddingBottom: '24px',
          marginBottom: '28px',
        }}>
          <div>
            {(data.branding?.logoUrl || "https://firebasestorage.googleapis.com/v0/b/mywhiskey-97620.firebasestorage.app/o/settings%2F1778774194015_MY_Whiskey_Rectangular_Logo.jpg?alt=media&token=2c019952-c295-4381-afe5-cd63de4570ee") && (
              <div style={{ marginBottom: '14px' }}>
                <img
                  src={data.branding?.logoUrl || "https://firebasestorage.googleapis.com/v0/b/mywhiskey-97620.firebasestorage.app/o/settings%2F1778774194015_MY_Whiskey_Rectangular_Logo.jpg?alt=media&token=2c019952-c295-4381-afe5-cd63de4570ee"}
                  alt="M/Y Whiskey"
                  className="receipt-header-logo"
                  style={{
                    height: '46px',
                    width: 'auto',
                    objectFit: 'contain',
                    display: 'block',
                    borderRadius: '4px',
                  }}
                />
              </div>
            )}
            <div style={{ fontSize: '1.45rem', fontWeight: 700, letterSpacing: '0.1em', color: '#FFFFFF', fontFamily: "var(--font-heading, 'Cormorant Garamond', serif)" }}>
              M/Y WHISKEY
            </div>
            <div style={{ fontSize: '0.78rem', letterSpacing: '0.2em', color: '#B9783B', fontWeight: 600, textTransform: 'uppercase', marginTop: '2px' }}>
              Private Yacht Charters • Emerald Coast, Florida
            </div>
            <div style={{ fontSize: '0.8rem', color: '#D8C7AF', opacity: 0.8, marginTop: '6px', lineHeight: 1.4 }}>
              Baytowne Marina & Destin Harbor<br />
              (850) 360-3590 • concierge@motoryachtwhiskey.com
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{
              display: 'inline-block',
              padding: '6px 14px',
              borderRadius: '4px',
              backgroundColor: data.paymentStatus === 'fully_paid' ? 'rgba(112, 140, 132, 0.2)' : 'rgba(185, 120, 59, 0.2)',
              border: `1px solid ${data.paymentStatus === 'fully_paid' ? '#708C84' : '#B9783B'}`,
              color: data.paymentStatus === 'fully_paid' ? '#708C84' : '#B9783B',
              fontSize: '0.78rem',
              fontWeight: 700,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              marginBottom: '6px',
            }}>
              {data.paymentStatus === 'fully_paid' ? '✓ Confirmed & Paid in Full' : '✓ Deposit Confirmed (Balance Due)'}
            </div>
            <div style={{ fontSize: '0.82rem', color: '#D8C7AF', fontFamily: 'monospace' }}>
              Ref: <strong style={{ color: '#FFFFFF' }}>{data.formattedBookingId}</strong>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#D8C7AF', opacity: 0.6, marginTop: '2px' }}>
              Issued: {new Date(data.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
          </div>
        </div>

        {/* Voyage & Guest Summary Bar */}
        <div className="receipt-summary-bar" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '16px',
          backgroundColor: '#121416',
          borderRadius: '8px',
          padding: '18px 20px',
          marginBottom: '28px',
          border: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div>
            <div style={{ fontSize: '0.72rem', color: '#D8C7AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Charter Experience</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#FFFFFF', marginTop: '2px' }}>{data.experienceTitle}</div>
            <div style={{ fontSize: '0.78rem', color: '#B9783B' }}>{data.duration} Private Charter</div>
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: '#D8C7AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Voyage Date</div>
            <div style={{ fontSize: '0.92rem', fontWeight: 600, color: '#FFFFFF', marginTop: '2px' }}>{data.formattedDate}</div>
            <div style={{ fontSize: '0.78rem', color: '#D8C7AF' }}>Boarding at {data.startTime}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: '#D8C7AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Charterer / Host</div>
            <div style={{ fontSize: '0.92rem', fontWeight: 600, color: '#FFFFFF', marginTop: '2px' }}>{data.guest.name}</div>
            <div style={{ fontSize: '0.78rem', color: '#D8C7AF' }}>{data.guest.guestCount} {data.guest.guestCount === 1 ? 'Passenger' : 'Passengers'}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: '#D8C7AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Guest Contact</div>
            <div style={{ fontSize: '0.82rem', color: '#FFFFFF', marginTop: '2px' }}>{data.guest.email}</div>
            <div style={{ fontSize: '0.78rem', color: '#D8C7AF' }}>{data.guest.phone}</div>
          </div>
        </div>

        {/* ITEMIZED PAYMENT RECEIPT LEDGER */}
        <div className="receipt-ledger" style={{
          backgroundColor: '#121416',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '8px',
          padding: '24px',
          marginBottom: '28px',
        }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.12em', color: '#B9783B', textTransform: 'uppercase', marginBottom: '4px' }}>
            Payment Receipt Ledger
          </div>
          <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#FFFFFF', fontFamily: "var(--font-heading, 'Cormorant Garamond', serif)", marginBottom: '16px' }}>
            Itemized Statement of Charges
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.15)', color: '#D8C7AF', textAlign: 'left' }}>
                <th style={{ padding: '8px 4px', fontWeight: 600 }}>Description</th>
                <th style={{ padding: '8px 4px', fontWeight: 600, textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <td style={{ padding: '12px 4px' }}>
                  <div style={{ fontWeight: 600, color: '#FFFFFF' }}>{data.experienceTitle}</div>
                  <div style={{ fontSize: '0.75rem', color: '#D8C7AF', opacity: 0.8 }}>Private Bareboat Yacht Charter ({data.duration})</div>
                </td>
                <td style={{ padding: '12px 4px', textAlign: 'right', fontWeight: 600, color: '#FFFFFF' }}>
                  {formatCurrency(data.financials.subtotal)}
                </td>
              </tr>

              {data.financials.cancellationInsurance && (
                <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                  <td style={{ padding: '12px 4px' }}>
                    <div style={{ fontWeight: 600, color: '#FFFFFF' }}>Weather & Cancellation Protection</div>
                    <div style={{ fontSize: '0.75rem', color: '#D8C7AF', opacity: 0.8 }}>Flexible reschedule and refund coverage</div>
                  </td>
                  <td style={{ padding: '12px 4px', textAlign: 'right', fontWeight: 600, color: '#FFFFFF' }}>
                    {formatCurrency(data.financials.insuranceAmount)}
                  </td>
                </tr>
              )}

              <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <td style={{ padding: '12px 4px' }}>
                  <div style={{ fontWeight: 600, color: '#FFFFFF' }}>Port, Fuel & Florida Statutory Taxes</div>
                  <div style={{ fontSize: '0.75rem', color: '#D8C7AF', opacity: 0.8 }}>State & county sales taxes and municipal dockage fees</div>
                </td>
                <td style={{ padding: '12px 4px', textAlign: 'right', fontWeight: 600, color: '#FFFFFF' }}>
                  {formatCurrency(data.financials.salesTax)}
                </td>
              </tr>

              <tr style={{ borderBottom: '2px solid rgba(255, 255, 255, 0.2)' }}>
                <td style={{ padding: '14px 4px', fontWeight: 700, fontSize: '0.95rem', color: '#FFFFFF' }}>
                  CHARTER GRAND TOTAL
                </td>
                <td style={{ padding: '14px 4px', textAlign: 'right', fontWeight: 700, fontSize: '1.05rem', color: '#FFFFFF' }}>
                  {formatCurrency(data.financials.grandTotal)}
                </td>
              </tr>

              {/* Amount Paid */}
              <tr style={{ backgroundColor: 'rgba(112, 140, 132, 0.12)' }}>
                <td style={{ padding: '12px 8px', fontWeight: 700, color: '#708C84' }}>
                  ✓ AMOUNT PAID ({data.financials.paymentMethod})
                </td>
                <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 700, color: '#708C84', fontSize: '1rem' }}>
                  {formatCurrency(data.financials.amountPaidToday)}
                </td>
              </tr>

              {/* Balance Due if any */}
              {data.financials.amountDueLater > 0 && (
                <tr style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)' }}>
                  <td style={{ padding: '12px 8px', fontWeight: 700, color: '#EF4444' }}>
                    REMAINING BALANCE DUE
                    {data.financials.balanceDueDate && (
                      <span style={{ fontSize: '0.75rem', fontWeight: 400, color: '#D8C7AF', marginLeft: '8px' }}>
                        (Due by {data.financials.balanceDueDate})
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 700, color: '#EF4444', fontSize: '1rem' }}>
                    {formatCurrency(data.financials.amountDueLater)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: '0.75rem', color: '#D8C7AF', opacity: 0.7, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <span>Stripe Reference: <code style={{ color: '#FFFFFF' }}>{data.financials.stripePaymentIntentId || 'STRIPE_DIRECT'}</code></span>
            <span>Recorded: {new Date(data.financials.paidAt || data.createdAt).toLocaleString()}</span>
          </div>
        </div>

        {/* 3 CARD VIEWS: VESSEL, LOCATION, CAPTAIN */}
        <div className="receipt-cards-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '28px' }}>

          {/* CARD 1: THE VESSEL */}
          <div className="receipt-card" style={{
            backgroundColor: '#192D3B',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '8px',
            padding: '18px',
            display: 'flex',
            flexDirection: 'column',
          }}>
            {data.vessel.imageUrl && (
              <div className="receipt-card-image-box" style={{
                width: '100%',
                aspectRatio: '1 / 1',
                borderRadius: '6px',
                overflow: 'hidden',
                marginBottom: '14px',
                backgroundColor: 'rgba(0,0,0,0.3)',
              }}>
                <img
                  src={data.vessel.imageUrl}
                  alt={data.vessel.title}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block',
                  }}
                />
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Ship size={18} color="#B9783B" />
              <span style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.12em', color: '#B9783B', textTransform: 'uppercase' }}>
                The Vessel
              </span>
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#FFFFFF', fontFamily: "var(--font-heading, 'Cormorant Garamond', serif)" }}>
              {data.vessel.title}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#D8C7AF', marginBottom: '8px' }}>
              {data.vessel.model} • {data.vessel.length}
            </div>
            {data.vessel.tagline && (
              <div style={{ fontSize: '0.78rem', fontStyle: 'italic', color: '#B9783B', fontWeight: 600, marginBottom: '6px' }}>
                "{data.vessel.tagline}"
              </div>
            )}
            <div style={{ fontSize: '0.75rem', color: '#F4F1EA', opacity: 0.9, lineHeight: 1.45, marginBottom: '12px', flex: 1 }}>
              {data.vessel.description}
            </div>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '10px' }}>
              <div style={{ fontSize: '0.72rem', color: '#D8C7AF', fontWeight: 600, marginBottom: '4px' }}>Key Amenities:</div>
              <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '0.72rem', color: '#D8C7AF', lineHeight: 1.5 }}>
                {data.vessel.features.slice(0, 4).map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* CARD 2: START LOCATION */}
          <div className="receipt-card" style={{
            backgroundColor: '#192D3B',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '8px',
            padding: '18px',
            display: 'flex',
            flexDirection: 'column',
          }}>
            {data.location.imageUrl && (
              <div className="receipt-card-image-box" style={{
                width: '100%',
                aspectRatio: '1 / 1',
                borderRadius: '6px',
                overflow: 'hidden',
                marginBottom: '14px',
                backgroundColor: 'rgba(0,0,0,0.3)',
              }}>
                <img
                  src={data.location.imageUrl}
                  alt={data.location.title}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block',
                  }}
                />
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <MapPin size={18} color="#B9783B" />
              <span style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.12em', color: '#B9783B', textTransform: 'uppercase' }}>
                Departure Port
              </span>
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#FFFFFF', fontFamily: "var(--font-heading, 'Cormorant Garamond', serif)" }}>
              {data.location.title}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#B9783B', fontWeight: 600, marginBottom: '8px' }}>
              {data.location.marina}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#D8C7AF', lineHeight: 1.4, marginBottom: '10px' }}>
              {data.location.address}
              {data.location.slip && (
                <div style={{ color: '#FFFFFF', fontWeight: 600, marginTop: '2px' }}>
                  Dock Assignment: {data.location.slip}
                </div>
              )}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#D8C7AF', opacity: 0.85, lineHeight: 1.4, flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', padding: '8px 10px', borderRadius: '4px', marginBottom: '10px' }}>
              <strong>Arrival Rule:</strong> {data.location.arrivalInstructions}
            </div>
            <a
              href={data.location.mapUrl}
              target="_blank"
              rel="noreferrer"
              style={{ fontSize: '0.75rem', fontWeight: 600, color: '#B9783B', textDecoration: 'none' }}
              className="no-print"
            >
              📍 Open Google Maps Directions →
            </a>
          </div>

          {/* CARD 3: THE CAPTAIN */}
          <div className="receipt-card" style={{
            backgroundColor: '#192D3B',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '8px',
            padding: '18px',
            display: 'flex',
            flexDirection: 'column',
          }}>
            {data.captain.avatarUrl && (
              <div className="receipt-card-image-box" style={{
                width: '100%',
                aspectRatio: '1 / 1',
                borderRadius: '6px',
                overflow: 'hidden',
                marginBottom: '14px',
                backgroundColor: 'rgba(0,0,0,0.3)',
              }}>
                <img
                  src={data.captain.avatarUrl}
                  alt={data.captain.name}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    objectPosition: 'top center',
                    display: 'block',
                  }}
                />
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <UserCheck size={18} color="#B9783B" />
              <span style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.12em', color: '#B9783B', textTransform: 'uppercase' }}>
                Trip Leadership
              </span>
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#FFFFFF', fontFamily: "var(--font-heading, 'Cormorant Garamond', serif)" }}>
              {data.captain.name}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#B9783B', fontWeight: 600, marginBottom: '6px' }}>
              {data.captain.title}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#D8C7AF', lineHeight: 1.4, marginBottom: '10px' }}>
              {data.captain.credentials}
            </div>
            {data.captain.bio && (
              <div style={{ fontSize: '0.72rem', fontStyle: 'italic', color: '#D8C7AF', opacity: 0.85, lineHeight: 1.4, flex: 1, marginBottom: '10px' }}>
                "{data.captain.bio}"
              </div>
            )}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '8px', fontSize: '0.75rem', color: '#D8C7AF' }}>
              Dockside Assistance: <strong style={{ color: '#FFFFFF' }}>{data.captain.phone}</strong>
            </div>
          </div>

        </div>

        {/* PRE-BOARDING & GUEST ACTIONS */}
        <div className="no-print" style={{
          backgroundColor: '#1E3A4C',
          border: '1px solid #B9783B',
          borderRadius: '8px',
          padding: '24px',
          textAlign: 'center',
          marginBottom: '20px',
        }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.12em', color: '#B9783B', textTransform: 'uppercase', marginBottom: '4px' }}>
            Required Action Prior to Boarding
          </div>
          <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#FFFFFF', fontFamily: "var(--font-heading, 'Cormorant Garamond', serif)", marginBottom: '8px' }}>
            Digital Passenger Release Waivers
          </div>
          <div style={{ fontSize: '0.85rem', color: '#F4F1EA', maxWidth: '580px', margin: '0 auto 16px auto', lineHeight: 1.5 }}>
            Coast Guard regulations require all charter participants to execute our bareboat waiver prior to departure. You can also invite other party members directly from your portal.
          </div>
          <a
            href={data.portalUrl}
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '12px 28px',
              backgroundColor: '#B9783B',
              color: '#FFFFFF',
              borderRadius: '4px',
              fontSize: '0.875rem',
              fontWeight: 700,
              textDecoration: 'none',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}
          >
            Access Guest Portal & Sign Waivers <ArrowRight size={16} />
          </a>
        </div>

        {/* Footer */}
        <div style={{
          textAlign: 'center',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          paddingTop: '20px',
          fontSize: '0.75rem',
          color: '#D8C7AF',
          opacity: 0.7,
          lineHeight: 1.5,
        }}>
          M/Y Whiskey Private Charters • Destin Harbor Slip 15 & Baytowne Marina, Miramar Beach, FL<br />
          Need assistance? Call concierge at (850) 360-3590 or email concierge@motoryachtwhiskey.com
        </div>

      </div>

      {/* PRINT-OPTIMIZED STYLES */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: letter portrait;
            margin: 12mm;
          }
          html, body {
            background: #FFFFFF !important;
            color: #111111 !important;
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
          }
          .no-print, .no-print * {
            display: none !important;
          }
          .receipt-modal-backdrop, .receipt-modal-content, .receipt-container {
            position: static !important;
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            max-height: none !important;
            overflow: visible !important;
            background: transparent !important;
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .printable-receipt {
            background: #FFFFFF !important;
            color: #111111 !important;
            border: 1px solid #D1D5DB !important;
            box-shadow: none !important;
            padding: 20px !important;
            margin: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            overflow: visible !important;
          }
          .printable-receipt * {
            color: #111111 !important;
            text-shadow: none !important;
          }
          .receipt-header-logo {
            height: 44px !important;
            max-height: 44px !important;
            width: auto !important;
            display: block !important;
            border-radius: 4px !important;
            margin-bottom: 10px !important;
          }
          .receipt-summary-bar {
            background-color: #F8F9FA !important;
            border: 1px solid #D1D5DB !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            margin-bottom: 16px !important;
          }
          .receipt-ledger {
            background-color: #F8F9FA !important;
            border: 1px solid #D1D5DB !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            page-break-after: always !important;
            break-after: page !important;
            margin-bottom: 0 !important;
          }
          .receipt-ledger table tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .receipt-ledger td, .receipt-ledger th {
            border-color: #E5E7EB !important;
          }
          .receipt-cards-grid {
            display: grid !important;
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 12px !important;
            page-break-before: always !important;
            break-before: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            margin-top: 0 !important;
          }
          .receipt-card {
            background-color: #F8F9FA !important;
            border: 1px solid #D1D5DB !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .receipt-card .receipt-card-image-box {
            width: 100% !important;
            aspect-ratio: 1 / 1 !important;
            height: auto !important;
            max-height: none !important;
          }
          .receipt-card img {
            width: 100% !important;
            height: 100% !important;
            aspect-ratio: 1 / 1 !important;
            max-height: none !important;
            object-fit: cover !important;
          }
        }
      ` }} />
    </div>
  );
}
