const fs = require('fs');
const path = require('path');
const os = require('os');

const configPath = path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json');
if (!fs.existsSync(configPath)) {
  console.error('firebase-tools.json not found!');
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const tokens = config.tokens;

if (!tokens) {
  console.error('No tokens found in firebase-tools.json!');
  process.exit(1);
}

console.log('Access token expires at:', tokens.expires_at || new Date(Date.now() + tokens.expires_in * 1000).toISOString());
console.log('Current time:', new Date().toISOString());

const accessToken = tokens.access_token;
if (!accessToken) {
  console.error('No access token found!');
  process.exit(1);
}

// Test GCS API request using fetch
const bucketName = 'my-whiskey-prod.firebasestorage.app';
const url = `https://storage.googleapis.com/storage/v1/b/${bucketName}`;

console.log(`Testing GET metadata for bucket ${bucketName}...`);
fetch(url, {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
})
.then(res => {
  console.log('Status:', res.status);
  return res.json();
})
.then(data => {
  if (data.error) {
    console.error('Error from GCS:', data.error);
  } else {
    console.log('Success! Bucket properties:', {
      id: data.id,
      name: data.name,
      location: data.location,
      cors: data.cors
    });
  }
})
.catch(err => {
  console.error('Fetch error:', err);
});
