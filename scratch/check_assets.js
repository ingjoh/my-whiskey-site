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
  console.log('Checking "assets" collection...');
  try {
    const assetsSnap = await getDocs(collection(db, 'assets'));
    console.log(`Successfully read "assets" collection! Document count: ${assetsSnap.size}`);
    assetsSnap.forEach(doc => {
      console.log(`- Asset: ${doc.id} (${doc.data().name || 'unnamed'})`);
    });
  } catch (err) {
    console.error('Error reading "assets" collection:', err.message);
  }

  console.log('\nChecking "templates" collection...');
  try {
    const templatesSnap = await getDocs(collection(db, 'templates'));
    console.log(`Successfully read "templates" collection! Document count: ${templatesSnap.size}`);
  } catch (err) {
    console.error('Error reading "templates" collection:', err.message);
  }
}

check().catch(console.error);
