const fs = require('fs');
const path = require('path');
const os = require('os');

const configPath = path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const accessToken = config.tokens.access_token;

async function tryCreateWithBody(body, label) {
  const url = `https://firebasestorage.googleapis.com/v1alpha/projects/my-whiskey-prod/defaultBucket`;
  console.log(`Trying ${label} creation...`);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
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
  // Try lowercase
  await tryCreateWithBody({ location: 'us-central1' }, 'lowercase us-central1');
  console.log('\n------------------\n');
  // Try uppercase
  await tryCreateWithBody({ location: 'US-CENTRAL1' }, 'uppercase US-CENTRAL1');
}

run();
