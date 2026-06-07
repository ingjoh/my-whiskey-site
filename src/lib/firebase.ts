import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { detectProjectId } from './project-env';

// Your web app's Firebase configuration
const stagingConfig = {
  apiKey: "AIzaSyC81AvHn8JS5k4C1vYp2l8o1-5219QL1qw",
  authDomain: "mywhiskey-97620.firebaseapp.com",
  projectId: "mywhiskey-97620",
  storageBucket: "mywhiskey-97620.firebasestorage.app",
  messagingSenderId: "80580144561",
  appId: "1:80580144561:web:dd04247b830dad39fa6190",
};

const prodConfig = {
  apiKey: "AIzaSyDYdfDnkM8YFgdM9sEx1ZAFzpuDlP02kMU",
  authDomain: "my-whiskey-prod.firebaseapp.com",
  projectId: "my-whiskey-prod",
  storageBucket: "my-whiskey-prod.firebasestorage.app",
  messagingSenderId: "784231801845",
  appId: "1:784231801845:web:ee3c862516db88934e76bc",
};

const getFirebaseConfig = () => {
  const projectId = detectProjectId();
  if (projectId === 'my-whiskey-prod') {
    return prodConfig;
  }
  return stagingConfig;
};

export const firebaseConfig = getFirebaseConfig();

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
