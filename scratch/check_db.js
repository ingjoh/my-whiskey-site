const fs = require('fs');
const path = require('path');
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, getDoc } = require('firebase/firestore');

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
  console.log('--- PAGES IN DB ---');
  const pagesSnap = await getDocs(collection(db, 'pages'));
  pagesSnap.forEach(doc => {
    console.log(`Page ID: ${doc.id}`);
    console.log(`Title: ${doc.data().title}`);
    console.log(`Has nodes: ${!!doc.data().nodes}`);
    console.log('----------------');
  });

  console.log('--- SETTINGS IN DB ---');
  const settingsDoc = await getDoc(doc(db, 'settings', 'global'));
  if (settingsDoc.exists()) {
    console.log(JSON.stringify(settingsDoc.data(), null, 2));
  } else {
    console.log('No global settings found');
  }
}

check().catch(console.error);
