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

async function testCreative() {
  const settingsDoc = await getDoc(doc(db, 'settings', 'social_ads'));
  if (!settingsDoc.exists()) {
    console.error('No settings doc found');
    return;
  }
  const adsSettings = settingsDoc.data();
  const metaAdAccountId = adsSettings.metaAdAccountId || '';
  const metaDeveloperToken = adsSettings.metaDeveloperToken || '';
  const fbPageId = adsSettings.fbPageId || '';

  let normalizedAdAccountId = metaAdAccountId.trim();
  if (!normalizedAdAccountId.startsWith('act_')) {
    normalizedAdAccountId = 'act_' + normalizedAdAccountId;
  }

  console.log(`Using Ad Account: ${normalizedAdAccountId}`);
  console.log(`Using Page ID: ${fbPageId}`);

  const creativeName = 'Antigravity Test Creative ' + Date.now();
  const baseLink = 'https://www.motoryachtwhiskey.com/experiences';
  
  const creativeBody = {
    name: creativeName,
    access_token: metaDeveloperToken,
    object_story_spec: {
      page_id: fbPageId,
      link_data: {
        link: `${baseLink}?utm_source=meta&utm_medium=paid_social&utm_campaign=test-campaign`,
        message: 'Luxury Yacht Charters aboard M/Y Whiskey',
        call_to_action: { type: 'BOOK_TRAVEL' }
      }
    }
  };

  const creativeRes = await fetch(`https://graph.facebook.com/v20.0/${normalizedAdAccountId}/adcreatives`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(creativeBody)
  });
  
  const creativeJson = await creativeRes.json();
  console.log('Creative Creation Response Status:', creativeRes.status);
  console.log('Creative Creation Response JSON:', JSON.stringify(creativeJson, null, 2));
}

testCreative().catch(console.error);
