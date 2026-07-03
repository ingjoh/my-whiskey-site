const fs = require('fs');
const path = require('path');
const os = require('os');

const configPath = path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const accessToken = config.tokens.access_token;

async function listBuckets(projectId) {
  const url = `https://storage.googleapis.com/storage/v1/b?project=${projectId}`;
  console.log(`Listing buckets for project ${projectId}...`);
  try {
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    console.log(`Status: ${res.status}`);
    const data = await res.json();
    if (res.ok) {
      if (data.items) {
        data.items.forEach(bucket => {
          console.log(`- ${bucket.name} (Location: ${bucket.location})`);
        });
      } else {
        console.log('No buckets found.');
      }
    } else {
      console.log('Error:', data.error ? data.error.message : JSON.stringify(data));
    }
  } catch (e) {
    console.log('Fetch error:', e.message);
  }
}

async function run() {
  await listBuckets('my-whiskey-prod');
  console.log('\n------------------\n');
  await listBuckets('mywhiskey-97620');
}

run();
