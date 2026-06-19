import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email';
import { loadSiteSettings } from '@/lib/db';
import React from 'react';
import MasterEmailWrapper from '@/components/emails/MasterEmailWrapper';

export async function POST(request: Request) {
  try {
    const { name, email, phone, subject, message } = await request.json();

    if (!name || !email || !subject || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const settings = await loadSiteSettings();
    const adminEmail = settings?.contact?.email || 'bookings@motoryachtwhiskey.com';

    // Construct the email body inside MasterEmailWrapper
    const emailElement = React.createElement(MasterEmailWrapper, {
      previewText: `New Contact Inquiry: ${subject}`,
      children: React.createElement('div', { style: { padding: '20px', fontFamily: "'Inter', sans-serif" } }, [
        React.createElement('h2', { key: 'h2', style: { color: '#B9783B', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px', marginTop: 0 } }, 'Contact Form Inquiry'),
        React.createElement('p', { key: 'p-name' }, [
          React.createElement('strong', { key: 's' }, 'Name: '),
          name
        ]),
        React.createElement('p', { key: 'p-email' }, [
          React.createElement('strong', { key: 's' }, 'Email: '),
          email
        ]),
        phone ? React.createElement('p', { key: 'p-phone' }, [
          React.createElement('strong', { key: 's' }, 'Phone: '),
          phone
        ]) : null,
        React.createElement('p', { key: 'p-subj' }, [
          React.createElement('strong', { key: 's' }, 'Subject: '),
          subject
        ]),
        React.createElement('h3', { key: 'h3', style: { marginTop: '25px', color: '#B9783B', marginBottom: '10px' } }, 'Message:'),
        React.createElement('p', { key: 'p-msg', style: { whiteSpace: 'pre-wrap', lineHeight: '1.6', background: 'rgba(255,255,255,0.02)', padding: '15px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)', margin: 0 } }, message)
      ])
    });

    const res = await sendEmail({
      to: adminEmail,
      subject: `[Contact Form] ${subject} - from ${name}`,
      react: emailElement
    });

    if (res.success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: res.error || 'Failed to dispatch email' }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Contact form submission API error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
