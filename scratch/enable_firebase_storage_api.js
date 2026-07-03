const fs = require('fs');
const path = require('path');
const os = require('os');

const configPath = path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const accessToken = config.tokens.access_token;

async function enableService(projectId, serviceName) {
  const url = `https://serviceusage.googleapis.com/v1/projects/${projectId}/services/${serviceName}:enable`;
  console.log(`Enabling service ${serviceName} in project ${projectId}...`);
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
      console.log('Success! Operation details:', data);
      return data;
    } else {
      console.log('Error enabling service:', data.error ? data.error.message : JSON.stringify(data));
    }
  } catch (e) {
    console.log('Fetch error:', e.message);
  }
  return null;
}

enableService('my-whiskey-prod', 'firebasestorage.googleapis.com');
