const fs = require('fs');
const path = require('path');
const os = require('os');

const configPath = path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const accessToken = config.tokens.access_token;

async function createDefaultBucket(projectId) {
  const url = `https://firebase.googleapis.com/v1beta1/projects/${projectId}/defaultBucket:create`;
  console.log(`Provisioning default Firebase Storage bucket for project ${projectId}...`);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    console.log(`Status: ${res.status}`);
    const data = await res.json();
    if (res.ok) {
      console.log('Success! Default bucket created:', data);
    } else {
      console.log('Error provisioning default bucket:', data.error ? data.error.message : JSON.stringify(data));
    }
  } catch (e) {
    console.log('Fetch error:', e.message);
  }
}

createDefaultBucket('my-whiskey-prod');
