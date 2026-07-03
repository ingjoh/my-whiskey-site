const fs = require('fs');
const path = require('path');
const os = require('os');

const configPath = path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const accessToken = config.tokens.access_token;

async function checkRules(projectId) {
  const url = `https://firebaserules.googleapis.com/v1/projects/${projectId}/releases`;
  console.log(`Checking security rules releases for project ${projectId}...`);
  try {
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    console.log(`Status: ${res.status}`);
    const data = await res.json();
    if (res.ok) {
      console.log('Success! Releases:', JSON.stringify(data, null, 2));
    } else {
      console.log('Error:', data.error ? data.error.message : JSON.stringify(data));
    }
  } catch (e) {
    console.log('Fetch error:', e.message);
  }
}

async function run() {
  await checkRules('mywhiskey-97620');
}

run();
