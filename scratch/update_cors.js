const fs = require('fs');
const path = require('path');
const os = require('os');

const configPath = path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const accessToken = config.tokens.access_token;

const buckets = [
  'mywhiskey-97620.firebasestorage.app',
  'my-whiskey-prod.firebasestorage.app'
];

const corsConfig = {
  cors: [
    {
      origin: ['*'],
      method: ['GET', 'POST', 'PUT', 'DELETE', 'HEAD'],
      responseHeader: ['Content-Type', 'Authorization', 'x-goog-meta-*'],
      maxAgeSeconds: 3600
    }
  ]
};

async function updateCors() {
  for (const bucket of buckets) {
    const url = `https://storage.googleapis.com/storage/v1/b/${bucket}`;
    console.log(`Updating CORS configuration for bucket ${bucket}...`);
    try {
      const res = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(corsConfig)
      });
      console.log(`  Status: ${res.status}`);
      const data = await res.json();
      if (res.ok) {
        console.log(`  Success! CORS config updated. New config:`, JSON.stringify(data.cors, null, 2));
      } else {
        console.log(`  Error:`, data.error ? data.error.message : JSON.stringify(data));
      }
    } catch (e) {
      console.log(`  Fetch error:`, e.message);
    }
  }
}

updateCors();
