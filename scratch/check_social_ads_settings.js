const fs = require('fs');
const path = require('path');
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc } = require('firebase/firestore');

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
  console.log('--- SOCIAL ADS SETTINGS IN DB ---');
  const settingsDoc = await getDoc(doc(db, 'settings', 'social_ads'));
  if (settingsDoc.exists()) {
    const data = settingsDoc.data();
    // Print everything except secret tokens in plain text completely, or show prefix/suffix
    console.log(JSON.stringify({
      ...data,
      fbPageToken: data.fbPageToken ? `${data.fbPageToken.substring(0, 10)}...${data.fbPageToken.substring(data.fbPageToken.length - 10)}` : null,
      metaDeveloperToken: data.metaDeveloperToken ? `${data.metaDeveloperToken.substring(0, 10)}...${data.metaDeveloperToken.substring(data.metaDeveloperToken.length - 10)}` : null,
      googleClientSecret: data.googleClientSecret ? 'REDACTED' : null,
      googleRefreshToken: data.googleRefreshToken ? 'REDACTED' : null,
    }, null, 2));
  } else {
    console.log('No social_ads settings found');
  }
}

check().catch(console.error);
