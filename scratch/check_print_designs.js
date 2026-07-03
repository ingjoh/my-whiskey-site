const fs = require('fs');
const path = require('path');
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

// Simple env parser
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*["']?([^"'\r\n]+)["']?/);
  if (match) {
    env[match[1]] = match[2];
  }
});

const firebaseConfig = {
  apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function check() {
  console.log('--- SAVED PRINT DESIGNS ---');
  const pagesSnap = await getDocs(collection(db, 'pages'));
  pagesSnap.forEach(doc => {
    if (doc.id.startsWith('print-design-')) {
      console.log(`Design ID: ${doc.id}`);
      const data = doc.data();
      console.log(`Name: ${data.name}`);
      console.log(`Preset: ${data.preset}`);
      console.log(`Width: ${data.width}, Height: ${data.height}`);
      console.log(`repeatLayout:`, JSON.stringify(data.repeatLayout, null, 2));
      console.log('----------------');
    }
  });
}

check().catch(console.error);
