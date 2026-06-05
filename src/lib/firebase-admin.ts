import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (serviceAccountJson) {
    try {
      const serviceAccount = JSON.parse(serviceAccountJson);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log('Firebase Admin SDK initialized using FIREBASE_SERVICE_ACCOUNT credentials.');
    } catch (e: any) {
      console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT environment variable:', e);
      admin.initializeApp({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'mywhiskey-97620',
      });
    }
  } else {
    // In local development, if you run `firebase login` or set GOOGLE_APPLICATION_CREDENTIALS,
    // this will automatically pick up authentication, or fallback to default project.
    admin.initializeApp({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'mywhiskey-97620',
    });
    console.log('Firebase Admin SDK initialized using project ID fallback.');
  }
}

export const adminDb = admin.firestore();
export const adminAuth = admin.auth();
export { admin };
