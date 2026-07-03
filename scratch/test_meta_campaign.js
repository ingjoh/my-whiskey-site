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

async function testCampaign() {
  const settingsDoc = await getDoc(doc(db, 'settings', 'social_ads'));
  if (!settingsDoc.exists()) {
    console.error('No settings doc found');
    return;
  }
  const adsSettings = settingsDoc.data();
  const metaAdAccountId = adsSettings.metaAdAccountId || '';
  const metaDeveloperToken = adsSettings.metaDeveloperToken || '';

  let normalizedAdAccountId = metaAdAccountId.trim();
  if (!normalizedAdAccountId.startsWith('act_')) {
    normalizedAdAccountId = 'act_' + normalizedAdAccountId;
  }

  console.log(`Using Ad Account: ${normalizedAdAccountId}`);
  
  // Try to create a dummy campaign
  const campaignRes = await fetch(`https://graph.facebook.com/v20.0/${normalizedAdAccountId}/campaigns`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Antigravity Test Campaign ' + Date.now(),
      objective: 'OUTCOME_TRAFFIC',
      status: 'PAUSED',
      special_ad_categories: ['NONE'],
      is_adset_budget_sharing_enabled: false,
      access_token: metaDeveloperToken
    })
  });
  
  const campaignJson = await campaignRes.json();
  console.log('Campaign Creation Response Status:', campaignRes.status);
  console.log('Campaign Creation Response JSON:', JSON.stringify(campaignJson, null, 2));
}

testCampaign().catch(console.error);
