import React from 'react';
import { getBookingReceiptData } from '@/lib/receipt';
import BookingConfirmationReceiptView from '@/components/booking/BookingConfirmationReceiptView';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface ReceiptPageProps {
  params: Promise<{ bookingId: string }>;
  searchParams: Promise<{ print?: string }>;
}

export default async function BookingReceiptPage({ params, searchParams }: ReceiptPageProps) {
  const { bookingId } = await params;
  const resolvedSearchParams = await searchParams;
  const shouldAutoPrint = resolvedSearchParams?.print === 'true';

  const receiptData = await getBookingReceiptData(bookingId);

  if (!receiptData) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#121416',
        color: '#F4F1EA',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        textAlign: 'center',
      }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '12px' }}>Booking Receipt Not Found</h2>
        <p style={{ color: '#D8C7AF', marginBottom: '24px' }}>
          Could not locate booking record with identifier "{bookingId}".
        </p>
        <Link
          href="/admin/bookings"
          style={{
            padding: '10px 20px',
            backgroundColor: '#B9783B',
            color: '#FFFFFF',
            borderRadius: '4px',
            textDecoration: 'none',
            fontWeight: 600,
          }}
        >
          Return to Manage Bookings
        </Link>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#121416', padding: '30px 16px' }}>
      <div className="no-print" style={{ maxWidth: '850px', margin: '0 auto 16px auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link
          href="/admin/bookings"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            color: '#D8C7AF',
            fontSize: '0.85rem',
            textDecoration: 'none',
            fontWeight: 600,
          }}
        >
          <ArrowLeft size={16} /> Back to Manage Bookings
        </Link>
      </div>

      <BookingConfirmationReceiptView
        data={receiptData}
        showAdminActions={true}
        autoPrint={shouldAutoPrint}
      />
    </div>
  );
}
