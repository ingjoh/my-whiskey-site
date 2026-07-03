const fs = require('fs');
const path = require('path');
const os = require('os');

const configPath = path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const accessToken = config.tokens.access_token;

async function checkFirebaseBuckets(projectId) {
  const url = `https://firebasestorage.googleapis.com/v1beta/projects/${projectId}/buckets`;
  console.log(`Checking Firebase-linked buckets for project ${projectId}...`);
  try {
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    console.log(`Status: ${res.status}`);
    const data = await res.json();
    if (res.ok) {
      console.log('Success! Buckets response:', JSON.stringify(data, null, 2));
    } else {
      console.log('Error:', data.error ? data.error.message : JSON.stringify(data));
    }
  } catch (e) {
    console.log('Fetch error:', e.message);
  }
}

async function run() {
  await checkFirebaseBuckets('my-whiskey-prod');
  console.log('\n------------------\n');
  await checkFirebaseBuckets('mywhiskey-97620');
}

run();
