import { NextRequest, NextResponse } from 'next/server';
import { sendBookingConfirmationReceiptEmail, getBookingReceiptData } from '@/lib/receipt';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const { bookingId } = await params;
    const body = await request.json().catch(() => ({}));
    const { recipientEmail } = body;

    console.log(`[Admin Receipt API] Dispatch request for booking: ${bookingId}, recipient: ${recipientEmail || 'default'}`);

    const result = await sendBookingConfirmationReceiptEmail(bookingId, {
      customRecipient: recipientEmail,
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Booking confirmation receipt successfully sent.',
        dispatchId: result.id,
      });
    } else {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to dispatch email' },
        { status: 500 }
      );
    }
  } catch (err: any) {
    console.error('[Admin Receipt API] Error dispatching receipt:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Server error' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const { bookingId } = await params;
    const data = await getBookingReceiptData(bookingId);

    if (!data) {
      return NextResponse.json(
        { success: false, error: 'Booking not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error('[Admin Receipt API] Error fetching receipt data:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Server error' },
      { status: 500 }
    );
  }
}
