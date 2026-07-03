const fs = require('fs');
const path = require('path');
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, getDoc, setDoc } = require('firebase/firestore');

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

async function migrate() {
  // 1. Fetch pages to map slugs to titles
  const pagesSnap = await getDocs(collection(db, 'pages'));
  const pageMap = {};
  pagesSnap.forEach(d => {
    const data = d.data();
    if (!d.id.startsWith('template-')) {
      pageMap[`/${d.id}`] = data.title || (d.id.charAt(0).toUpperCase() + d.id.slice(1).replace(/-/g, ' '));
    }
  });
  pageMap['/'] = 'Home';

  console.log('Page Slug -> Title mapping:');
  console.log(pageMap);

  // 2. Fetch global settings
  const settingsRef = doc(db, 'settings', 'global');
  const settingsDoc = await getDoc(settingsRef);
  if (!settingsDoc.exists()) {
    console.log('No settings found to migrate');
    return;
  }

  const data = settingsDoc.data();
  const links = data.navigation?.links || [];
  if (links.length === 0) {
    console.log('No navigation links found to migrate');
    return;
  }

  let migrated = false;
  const migratedLinks = links.map(link => {
    let newLabel = link.label;
    if (link.label === 'New Link' && pageMap[link.url]) {
      newLabel = pageMap[link.url];
      migrated = true;
    }

    let children = link.children;
    if (children && children.length > 0) {
      children = children.map(child => {
        let newChildLabel = child.label;
        if ((child.label === 'Sub Link' || child.label === 'New Link') && pageMap[child.url]) {
          newChildLabel = pageMap[child.url];
          migrated = true;
        }
        return { ...child, label: newChildLabel };
      });
    }

    return { ...link, label: newLabel, children };
  });

  if (migrated) {
    console.log('Migrating links in DB...');
    data.navigation.links = migratedLinks;
    
    // Safely remove any undefined properties
    const safeData = JSON.parse(JSON.stringify(data));
    
    await setDoc(settingsRef, safeData, { merge: true });
    console.log('Migration complete!');
    console.log(JSON.stringify(migratedLinks, null, 2));
  } else {
    console.log('No links needed migration');
  }
}

migrate().catch(console.error);
