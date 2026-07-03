const fs = require('fs');
const path = require('path');
const os = require('os');

const configPath = path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const accessToken = config.tokens.access_token;

async function checkConfig(projectId) {
  const url = `https://firebase.googleapis.com/v1beta1/projects/${projectId}/adminSdkConfig`;
  console.log(`Fetching Admin SDK config for ${projectId}...`);
  try {
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    console.log(`Status: ${res.status}`);
    const data = await res.json();
    if (res.ok) {
      console.log('Success! Config:', data);
    } else {
      console.log('Error:', data.error ? data.error.message : JSON.stringify(data));
    }
  } catch (e) {
    console.log('Fetch error:', e.message);
  }
}

async function run() {
  await checkConfig('my-whiskey-prod');
  console.log('\n------------------\n');
  await checkConfig('mywhiskey-97620');
}

run();
