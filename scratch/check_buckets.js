const fs = require('fs');
const path = require('path');
const os = require('os');

const configPath = path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const accessToken = config.tokens.access_token;

const buckets = [
  'my-whiskey-prod.appspot.com',
  'my-whiskey-prod.firebasestorage.app',
  'mywhiskey-97620.appspot.com',
  'mywhiskey-97620.firebasestorage.app'
];

async function testBuckets() {
  for (const bucket of buckets) {
    const url = `https://storage.googleapis.com/storage/v1/b/${bucket}`;
    console.log(`Testing ${bucket}...`);
    try {
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      console.log(`  Status: ${res.status}`);
      const data = await res.json();
      if (res.ok) {
        console.log(`  Success! CORS config:`, data.cors || 'None');
      } else {
        console.log(`  Error: ${data.error ? data.error.message : JSON.stringify(data)}`);
      }
    } catch (e) {
      console.log(`  Fetch error:`, e.message);
    }
  }
}

testBuckets();
