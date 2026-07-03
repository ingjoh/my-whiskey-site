const fs = require('fs');
const path = require('path');
const os = require('os');

const configPath = path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const accessToken = config.tokens.access_token;

async function getDefaultBucket(projectId) {
  const url = `https://firebasestorage.googleapis.com/v1alpha/projects/${projectId}/defaultBucket`;
  console.log(`Getting default bucket config for project ${projectId}...`);
  try {
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    console.log(`Status: ${res.status}`);
    const text = await res.text();
    try {
      const data = JSON.parse(text);
      console.log('Response JSON:', JSON.stringify(data, null, 2));
    } catch (e) {
      console.log('Response Text (not JSON):', text.substring(0, 500));
    }
  } catch (e) {
    console.log('Fetch error:', e.message);
  }
}

async function run() {
  await getDefaultBucket('mywhiskey-97620');
  console.log('\n------------------\n');
  await getDefaultBucket('my-whiskey-prod');
}

run();
