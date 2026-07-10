import * as admin from 'firebase-admin';
import { detectProjectId } from './project-env';

export let initError: string | null = null;
export let initType: string = 'unknown';

if (!admin.apps.length) {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  const projectId = detectProjectId();
  const storageBucket = projectId === 'my-whiskey-prod'
    ? 'my-whiskey-prod.firebasestorage.app'
    : 'mywhiskey-97620.firebasestorage.app';

  if (serviceAccountJson) {
    try {
      const serviceAccount = JSON.parse(serviceAccountJson);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: projectId,
        storageBucket: storageBucket,
      });
      initType = 'service_account';
      console.log(`Firebase Admin SDK initialized using FIREBASE_SERVICE_ACCOUNT credentials. Project: ${projectId}`);
    } catch (e: any) {
      initError = e.message || String(e);
      initType = 'fallback_error';
      console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT environment variable:', e);
      admin.initializeApp({
        projectId: projectId,
        storageBucket: storageBucket,
      });
    }
  } else {
    initType = 'project_id_fallback';
    // In local development, if you run `firebase login` or set GOOGLE_APPLICATION_CREDENTIALS,
    // this will automatically pick up authentication, or fallback to default project.
    admin.initializeApp({
      projectId: projectId,
      storageBucket: storageBucket,
    });
    console.log(`Firebase Admin SDK initialized using project ID fallback. Project: ${projectId}`);
  }
}

export const adminDb = admin.firestore();
export const adminAuth = admin.auth();
export { admin };
