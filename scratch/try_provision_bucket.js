const fs = require('fs');
const path = require('path');
const os = require('os');

const configPath = path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const accessToken = config.tokens.access_token;

async function tryPost(url, label) {
  console.log(`Trying ${label}: POST ${url}...`);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });
    console.log(`  Status: ${res.status}`);
    const text = await res.text();
    try {
      const data = JSON.parse(text);
      console.log('  Response JSON:', JSON.stringify(data, null, 2));
    } catch (e) {
      console.log('  Response Text (not JSON):', text.substring(0, 500));
    }
  } catch (e) {
    console.log('  Fetch error:', e.message);
  }
}

async function run() {
  const projectId = 'my-whiskey-prod';
  
  await tryPost(`https://firebasestorage.googleapis.com/v1alpha/projects/${projectId}/defaultBucket`, 'v1alpha defaultBucket');
  console.log('\n------------------\n');
  await tryPost(`https://firebasestorage.googleapis.com/v1beta/projects/${projectId}/defaultBucket`, 'v1beta defaultBucket');
}

run();
