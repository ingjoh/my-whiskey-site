import { adminDb } from './firebase-admin';
import { sendSms } from './sms';

export interface AdminNotificationInput {
  title: string;
  message: string;
  type: 'booking' | 'waiver' | 'tip' | 'testimonial' | 'payment';
  link: string;
}

export async function triggerAdminNotification(input: AdminNotificationInput) {
  try {
    const ntfId = `ntf_${Math.floor(100000 + Math.random() * 900000)}`;
    const ntfRef = adminDb.collection('notifications').doc(ntfId);
    
    const notification = {
      id: ntfId,
      ...input,
      read: false,
      createdAt: new Date().toISOString()
    };
    
    await ntfRef.set(notification);
    console.log(`[Notification] Admin alert created: ${input.title} - ${input.message}`);

    // Send SMS alert to operator if configured
    const operatorPhone = process.env.OPERATOR_PHONE_NUMBER;
    if (operatorPhone) {
      await sendSms({
        to: operatorPhone,
        text: `M/Y Whiskey Alert: ${input.title} - ${input.message}`
      });
    }
    
    return ntfId;
  } catch (error) {
    console.error('Failed to trigger admin notification:', error);
    return null;
  }
}
