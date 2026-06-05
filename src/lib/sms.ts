import Telnyx from 'telnyx';

// Initialize Telnyx client (uses dummy key at build-time to prevent crash if env is missing)
const telnyx = new (Telnyx as any)(process.env.TELNYX_API_KEY || 'KEY_test_dummy');

export interface SmsPayload {
  to: string;
  text: string;
}

/**
 * Sends an SMS using the Telnyx Messaging API.
 * Bypasses real sending in development if TELNYX_API_KEY is not defined.
 */
export async function sendSms(payload: SmsPayload) {
  const fromNumber = process.env.TELNYX_PHONE_NUMBER;

  if (!process.env.TELNYX_API_KEY || !fromNumber) {
    console.log('\n--- [Telnyx Simulation] Outbound SMS ---');
    console.log(`From:    ${fromNumber || 'Simulated Sender'}`);
    console.log(`To:      ${payload.to}`);
    console.log(`Message: ${payload.text}`);
    console.log('----------------------------------------\n');
    return { success: true, id: 'simulated_telnyx_id' };
  }

  try {
    // Format recipient phone number to E.164 if not already done
    let formattedTo = payload.to.trim();
    if (!formattedTo.startsWith('+')) {
      // Clean non-digits and assume US (+1) if it looks like a 10 digit number
      const digits = formattedTo.replace(/\D/g, '');
      if (digits.length === 10) {
        formattedTo = `+1${digits}`;
      } else if (digits.length === 11 && digits.startsWith('1')) {
        formattedTo = `+${digits}`;
      } else {
        formattedTo = `+${digits}`;
      }
    }

    const response = await telnyx.messages.create({
      from: fromNumber,
      to: formattedTo,
      text: payload.text
    });

    console.log(`[Telnyx] SMS successfully sent to ${formattedTo}. ID: ${response?.data?.id}`);
    return { success: true, id: response?.data?.id };
  } catch (error: any) {
    console.error('[Telnyx] SMS dispatch failed:', error);
    return { success: false, error: error.message || error };
  }
}
