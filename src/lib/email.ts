import { Resend } from 'resend';
import * as React from 'react';

// Initialize Resend client (uses dummy key at build-time to prevent crash if env is missing)
const resend = new Resend(process.env.RESEND_API_KEY || 're_test_dummy');

export interface EmailPayload {
  to: string;
  subject: string;
  react: React.ReactElement;
  bcc?: string | string[];
}

/**
 * Sends an email using the Resend SDK.
 * Bypasses real sending in development if RESEND_API_KEY is not defined.
 */
export async function sendEmail(payload: EmailPayload) {
  if (!process.env.RESEND_API_KEY) {
    console.log('\n--- [Resend Simulation] Outbound Email ---');
    console.log(`To:      ${payload.to}`);
    console.log(`Subject: ${payload.subject}`);
    console.log(`Body:    (React Email Template Component)`);
    console.log('-----------------------------------------\n');
    return { success: true, id: 'simulated_resend_id' };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: 'M/Y Whiskey Concierge <concierge@motoryachtwhiskey.com>',
      to: payload.to,
      subject: payload.subject,
      react: payload.react,
      bcc: payload.bcc
    });

    if (error) {
      console.error('[Resend] Email dispatch failed:', error);
      return { success: false, error };
    }

    console.log(`[Resend] Email successfully sent to ${payload.to}. ID: ${data?.id}`);
    return { success: true, id: data?.id };
  } catch (error: any) {
    console.error('[Resend] Exception thrown during email dispatch:', error);
    return { success: false, error: error.message || error };
  }
}
