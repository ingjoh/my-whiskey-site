const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([^#=]+)=(.*)$/);
    if (match) {
      let value = match[2].trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.substring(1, value.length - 1);
      }
      if (match[1].trim() !== 'FIREBASE_SERVICE_ACCOUNT') {
        value = value.replace(/\\n/g, '\n');
      }
      process.env[match[1].trim()] = value;
    }
  });
}

const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
const serviceAccount = JSON.parse(serviceAccountJson);

if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function check() {
  const docRef = db.collection('pages').doc('booking-BK-618374');
  const snap = await docRef.get();
  if (snap.exists) {
    console.log('Pages/booking-BK-618374:', snap.data());
  } else {
    console.log('Pages/booking-BK-618374 does not exist.');
  }

  const newBookingSnap = await db.collection('bookings').doc('BK-618374').get();
  if (newBookingSnap.exists) {
    console.log('Bookings/BK-618374:', newBookingSnap.data());
  } else {
    console.log('Bookings/BK-618374 does not exist.');
  }
}

check();
