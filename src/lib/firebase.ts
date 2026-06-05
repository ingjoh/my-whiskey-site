import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Singleton pattern to prevent duplicate initializations during Next.js hot-reloading in dev.
const globalForFirebase = globalThis as unknown as {
  app?: any;
  db?: any;
  auth?: any;
  storage?: any;
};

const app = globalForFirebase.app || (getApps().length > 0 ? getApp() : initializeApp(firebaseConfig));
if (process.env.NODE_ENV !== 'production') {
  globalForFirebase.app = app;
}

console.log('Firebase config loaded on server/client:', {
  hasApiKey: !!firebaseConfig.apiKey,
  projectId: firebaseConfig.projectId,
  authDomain: firebaseConfig.authDomain,
  isServer: typeof window === 'undefined',
  hasGlobalDb: !!globalForFirebase.db
});

export const auth = globalForFirebase.auth || getAuth(app);
if (process.env.NODE_ENV !== 'production') {
  globalForFirebase.auth = auth;
}

// For Server Component environments (Node.js server-side), Firestore's gRPC stream
// can fail due to environment/network constraints. Forcing long-polling fixes this.
export const db = globalForFirebase.db || (typeof window === 'undefined'
  ? initializeFirestore(app, { experimentalForceLongPolling: true, ignoreUndefinedProperties: true })
  : getFirestore(app));
if (process.env.NODE_ENV !== 'production') {
  globalForFirebase.db = db;
}

export const storage = globalForFirebase.storage || getStorage(app);
if (process.env.NODE_ENV !== 'production') {
  globalForFirebase.storage = storage;
}
