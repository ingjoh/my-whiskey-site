import { adminDb } from './firebase-admin';
import { sendEmail } from './email';
import { sendSms } from './sms';
import * as React from 'react';
import MasterEmailWrapper from '@/components/emails/MasterEmailWrapper';

// Simple Markdown parser for template rendering
export function parseMarkdownToHtml(md: string): string {
  let html = md
    .replace(/\r\n/g, '\n')
    .replace(/\n\n/g, '</p><p style="margin: 0 0 15px 0; line-height: 1.6; font-size: 14px; color: #D8C7AF;">')
    .replace(/\n/g, '<br />')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/### ([^\n]+)/g, '<h3 style="font-size: 16px; font-weight: 700; color: #FFFFFF; font-family: Georgia, serif; margin: 20px 0 10px 0;">$1</h3>')
    .replace(/## ([^\n]+)/g, '<h2 style="font-size: 18px; font-weight: 700; color: #FFFFFF; font-family: Georgia, serif; margin: 25px 0 10px 0;">$1</h2>');
  
  return `<p style="margin: 0 0 15px 0; line-height: 1.6; font-size: 14px; color: #D8C7AF;">${html}</p>`;
}

// Simple merge tag compiler
function compileMergeTags(templateStr: string, data: Record<string, any>): string {
  let result = templateStr;
  for (const key in data) {
    const value = data[key] === undefined || data[key] === null ? '' : String(data[key]);
    // Replace all occurrences of {{key}}
    result = result.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g'), value);
  }
  return result;
}

/**
 * Enrolls a booking into a specific notification flow, creating pending queue records.
 */
export async function enrollBookingInFlow(bookingId: string, flowId: string) {
  try {
    const bookingDoc = await adminDb.collection('pages').doc(`booking-${bookingId}`).get();
    if (!bookingDoc.exists) {
      throw new Error(`Booking ${bookingId} not found`);
    }
    const booking = bookingDoc.data() || {};
    const tripDate = new Date(booking.date + 'T00:00:00');

    // Load flow steps
    const flowDoc = await adminDb.collection('notification_flows').doc(flowId).get();
    if (!flowDoc.exists) {
      console.warn(`[Flow Manager] Flow ${flowId} does not exist.`);
      return false;
    }
    const flow = flowDoc.data() || {};
    const steps = flow.steps || [];

    const now = new Date();

    for (const step of steps) {
      let scheduledTime = new Date(now);

      if (step.offsetType === 'delay_after_trigger') {
        if (step.offsetUnit === 'days') {
          scheduledTime.setDate(now.getDate() + step.offsetValue);
        } else if (step.offsetUnit === 'hours') {
          scheduledTime.setHours(now.getHours() + step.offsetValue);
        } else if (step.offsetUnit === 'minutes') {
          scheduledTime.setMinutes(now.getMinutes() + step.offsetValue);
        }
      } else if (step.offsetType === 'before_trip') {
        scheduledTime = new Date(tripDate);
        if (step.offsetUnit === 'days') {
          scheduledTime.setDate(tripDate.getDate() - step.offsetValue);
        } else if (step.offsetUnit === 'hours') {
          scheduledTime.setHours(tripDate.getHours() - step.offsetValue);
        }
      }

      // Generate unique item ID
      const queueId = `msg-${bookingId}-${step.id}`;
      const queueRef = adminDb.collection('scheduled_notifications').doc(queueId);

      await queueRef.set({
        id: queueId,
        bookingId,
        flowId,
        stepId: step.id,
        templateId: step.templateId,
        scheduledTime: scheduledTime.toISOString(),
        status: 'pending',
        attempts: 0,
        createdAt: new Date().toISOString()
      });
    }

    console.log(`[Flow Manager] Enrolled booking ${bookingId} in flow ${flowId}.`);
    return true;
  } catch (error) {
    console.error(`[Flow Manager] Enrollment failed for booking ${bookingId}:`, error);
    return false;
  }
}

/**
 * Cancels pending reminders matching a template criteria (e.g. cancels waiver reminders once signed).
 */
export async function cancelPendingReminders(bookingId: string, templateTypeWord: string) {
  try {
    const queueSnap = await adminDb.collection('scheduled_notifications')
      .where('bookingId', '==', bookingId)
      .where('status', '==', 'pending')
      .get();

    let count = 0;
    for (const doc of queueSnap.docs) {
      const item = doc.data();
      if (item.templateId.includes(templateTypeWord)) {
        await doc.ref.set({
          status: 'cancelled',
          updatedAt: new Date().toISOString()
        }, { merge: true });
        count++;
      }
    }
    console.log(`[Queue Manager] Cancelled ${count} pending "${templateTypeWord}" reminders for booking ${bookingId}.`);
    return true;
  } catch (error) {
    console.error('[Queue Manager] Error cancelling reminders:', error);
    return false;
  }
}

/**
 * Recalculates scheduling times for all trip-relative reminders when booking date changes.
 */
export async function rescheduleBookingReminders(bookingId: string) {
  try {
    const bookingDoc = await adminDb.collection('pages').doc(`booking-${bookingId}`).get();
    if (!bookingDoc.exists) return false;
    const booking = bookingDoc.data() || {};
    const tripDate = new Date(booking.date + 'T00:00:00');

    const queueSnap = await adminDb.collection('scheduled_notifications')
      .where('bookingId', '==', bookingId)
      .where('status', '==', 'pending')
      .get();

    let count = 0;
    for (const doc of queueSnap.docs) {
      const item = doc.data();
      
      // Look up offset specifications in the original flow
      const flowDoc = await adminDb.collection('notification_flows').doc(item.flowId).get();
      if (flowDoc.exists) {
        const flow = flowDoc.data() || {};
        const step = (flow.steps || []).find((s: any) => s.id === item.stepId);
        
        if (step && step.offsetType === 'before_trip') {
          const newScheduledTime = new Date(tripDate);
          if (step.offsetUnit === 'days') {
            newScheduledTime.setDate(tripDate.getDate() - step.offsetValue);
          } else if (step.offsetUnit === 'hours') {
            newScheduledTime.setHours(tripDate.getHours() - step.offsetValue);
          }

          await doc.ref.set({
            scheduledTime: newScheduledTime.toISOString(),
            updatedAt: new Date().toISOString()
          }, { merge: true });
          count++;
        }
      }
    }
    console.log(`[Queue Manager] Rescheduled ${count} date-relative reminders for booking ${bookingId}.`);
    return true;
  } catch (error) {
    console.error('[Queue Manager] Error rescheduling reminders:', error);
    return false;
  }
}

/**
 * Renders and transmits a queued notification, resolving dynamic branding and variables.
 */
export async function sendScheduledNotification(notificationId: string): Promise<boolean> {
  try {
    const queueRef = adminDb.collection('scheduled_notifications').doc(notificationId);
    const queueSnap = await queueRef.get();
    if (!queueSnap.exists) return false;
    const item = queueSnap.data() || {};

    if (item.status !== 'pending') {
      console.log(`[Queue Manager] Skipping message ${notificationId}: Status is "${item.status}"`);
      return false;
    }

    // Load booking
    const bookingDoc = await adminDb.collection('pages').doc(`booking-${item.bookingId}`).get();
    if (!bookingDoc.exists) {
      await queueRef.set({ status: 'failed', error: 'Booking document deleted', updatedAt: new Date().toISOString() }, { merge: true });
      return false;
    }
    const booking = bookingDoc.data() || {};

    // Load template
    const templateDoc = await adminDb.collection('notification_templates').doc(item.templateId).get();
    if (!templateDoc.exists) {
      await queueRef.set({ status: 'failed', error: 'Template deleted', updatedAt: new Date().toISOString() }, { merge: true });
      return false;
    }
    const template = templateDoc.data() || {};

    // Check conditions (e.g. waiverSigned == false)
    const flowDoc = await adminDb.collection('notification_flows').doc(item.flowId).get();
    if (flowDoc.exists) {
      const flow = flowDoc.data() || {};
      const step = (flow.steps || []).find((s: any) => s.id === item.stepId);
      if (step && step.condition) {
        if (step.condition === 'waiverSigned == false' && booking.waiverSigned === true) {
          console.log(`[Queue Manager] Condition met: Waiver is already signed. Cancelling step ${item.stepId}`);
          await queueRef.set({ status: 'cancelled', updatedAt: new Date().toISOString() }, { merge: true });
          return true;
        }
      }
    }

    // Load site branding settings
    const settingsDoc = await adminDb.collection('settings').doc('global').get();
    const settings = settingsDoc.exists ? settingsDoc.data() || {} : {};
    const branding = settings.theme || {};

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://motoryachtwhiskey.com';
    const portalUrl = `${siteUrl}/guest/portal?id=${booking.id}&token=${booking.token || ''}`;

    // Populate data payload
    const mergeData = {
      bookingId: booking.id,
      guestName: booking.guestName,
      guestEmail: booking.guestEmail,
      guestPhone: booking.guestPhone,
      experienceTitle: booking.experienceTitle,
      vesselTitle: booking.vesselTitle,
      date: booking.date,
      startTime: booking.startTime,
      grandTotal: `$${Number(booking.grandTotal || 0).toLocaleString()}`,
      amountPaidToday: `$${Number(booking.amountPaidToday || 0).toLocaleString()}`,
      amountDueLater: `$${Number(booking.amountDueLater || 0).toLocaleString()}`,
      captainTitle: booking.captainTitle || 'Independent Bareboat Master',
      startLocationName: booking.startLocation === 'destin-harbor' ? 'Destin Harbor Slip 15' : 'Fort Walton Yacht Basin',
      portalUrl
    };

    // Render message content
    const compiledBody = compileMergeTags(template.body, mergeData);

    if (template.channel === 'email') {
      const compiledSubject = compileMergeTags(template.subject || 'M/Y Whiskey Voyage Update', mergeData);
      const htmlBody = parseMarkdownToHtml(compiledBody);

      // Render master email template
      const emailElement = React.createElement(MasterEmailWrapper, {
        previewText: compiledSubject,
        logoUrl: branding.logoUrl,
        primaryColor: branding.primaryColor || '#B9783B',
        backgroundColor: branding.backgroundColor || '#121416',
        surfaceColor: branding.surfaceColor || '#1E2124',
        foregroundColor: branding.foregroundColor || '#F4F1EA',
        mutedColor: branding.mutedColor || '#D8C7AF',
        children: React.createElement('div', { dangerouslySetInnerHTML: { __html: htmlBody } })
      });

      const res = await sendEmail({
        to: booking.guestEmail,
        subject: compiledSubject,
        react: emailElement
      });

      if (res.success) {
        await queueRef.set({ status: 'sent', sentAt: new Date().toISOString(), attempts: item.attempts + 1, updatedAt: new Date().toISOString() }, { merge: true });
        return true;
      } else {
        await queueRef.set({ status: 'failed', error: String(res.error), attempts: item.attempts + 1, updatedAt: new Date().toISOString() }, { merge: true });
        return false;
      }
    } else if (template.channel === 'sms') {
      const res = await sendSms({
        to: booking.guestPhone,
        text: compiledBody
      });

      if (res.success) {
        await queueRef.set({ status: 'sent', sentAt: new Date().toISOString(), attempts: item.attempts + 1, updatedAt: new Date().toISOString() }, { merge: true });
        return true;
      } else {
        await queueRef.set({ status: 'failed', error: String(res.error), attempts: item.attempts + 1, updatedAt: new Date().toISOString() }, { merge: true });
        return false;
      }
    }

    return false;
  } catch (error: any) {
    console.error(`[Queue Manager] Failure processing message ${notificationId}:`, error);
    await adminDb.collection('scheduled_notifications').doc(notificationId).set({
      status: 'failed',
      error: error.message || String(error),
      updatedAt: new Date().toISOString()
    }, { merge: true });
    return false;
  }
}
