import * as admin from 'firebase-admin';
import { detectProjectId } from './project-env';

if (!admin.apps.length) {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  const projectId = detectProjectId();

  if (serviceAccountJson) {
    try {
      const serviceAccount = JSON.parse(serviceAccountJson);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: projectId,
      });
      console.log(`Firebase Admin SDK initialized using FIREBASE_SERVICE_ACCOUNT credentials. Project: ${projectId}`);
    } catch (e: any) {
      console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT environment variable:', e);
      admin.initializeApp({
        projectId: projectId,
      });
    }
  } else {
    // In local development, if you run `firebase login` or set GOOGLE_APPLICATION_CREDENTIALS,
    // this will automatically pick up authentication, or fallback to default project.
    admin.initializeApp({
      projectId: projectId,
    });
    console.log(`Firebase Admin SDK initialized using project ID fallback. Project: ${projectId}`);
  }
}

export const adminDb = admin.firestore();
export const adminAuth = admin.auth();
export { admin };
