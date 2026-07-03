const fs = require('fs');
const path = require('path');
const os = require('os');

const configPath = path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const accessToken = config.tokens.access_token;

async function getRuleset(projectId, rulesetId) {
  const url = `https://firebaserules.googleapis.com/v1/projects/${projectId}/rulesets/${rulesetId}`;
  console.log(`Getting ruleset ${rulesetId} for project ${projectId}...`);
  try {
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    console.log(`Status: ${res.status}`);
    const data = await res.json();
    if (res.ok) {
      console.log('Success! Ruleset source:');
      if (data.source && data.source.files) {
        data.source.files.forEach(file => {
          console.log(`File: ${file.name}`);
          console.log('------------------');
          console.log(file.content);
          console.log('------------------');
        });
      }
    } else {
      console.log('Error:', data.error ? data.error.message : JSON.stringify(data));
    }
  } catch (e) {
    console.log('Fetch error:', e.message);
  }
}

async function run() {
  await getRuleset('mywhiskey-97620', 'cd292fcc-4300-4cd9-ba92-c371c0b44f14');
}

run();
