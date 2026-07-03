const fs = require('fs');
const path = require('path');
const os = require('os');

const configPath = path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const accessToken = config.tokens.access_token;

async function createBucket(projectId, bucketName) {
  const url = `https://storage.googleapis.com/storage/v1/b?project=${projectId}`;
  console.log(`Attempting to create bucket ${bucketName} in project ${projectId}...`);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: bucketName,
        location: 'us-east1', // matching staging location
        storageClass: 'STANDARD'
      })
    });
    console.log(`Status: ${res.status}`);
    const data = await res.json();
    if (res.ok) {
      console.log('Success! Created bucket details:', data);
    } else {
      console.log('Error creating bucket:', data.error ? data.error.message : JSON.stringify(data));
    }
  } catch (e) {
    console.log('Fetch error:', e.message);
  }
}

createBucket('my-whiskey-prod', 'my-whiskey-prod.firebasestorage.app');
