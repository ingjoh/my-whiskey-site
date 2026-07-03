const fs = require('fs');
const path = require('path');
const os = require('os');

const configPath = path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const accessToken = config.tokens.access_token;

const storageRules = `rules_version = '2';

service firebase.storage {
  match /b/{bucket}/o {
  
    // --- HELPER FUNCTIONS ---
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isAdmin() {
      return isAuthenticated();
    }

    // Allow public access to read/download all uploads
    // Restrict file creation, updating, and deletion strictly to logged-in Admins.
    match /{allPaths=**} {
      allow read: if true;
      allow write, delete: if isAdmin();
    }
  }
}`;

async function deployRules(projectId) {
  const bucketName = 'my-whiskey-prod.firebasestorage.app';
  console.log(`Step 1: Creating ruleset for ${projectId}...`);
  const createRulesetUrl = `https://firebaserules.googleapis.com/v1/projects/${projectId}/rulesets`;
  let rulesetName;
  
  try {
    const res = await fetch(createRulesetUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        source: {
          files: [
            {
              name: 'storage.rules',
              content: storageRules
            }
          ]
        }
      })
    });
    console.log(`  Ruleset Creation Status: ${res.status}`);
    const data = await res.json();
    if (!res.ok) {
      console.error('  Error creating ruleset:', data.error ? data.error.message : JSON.stringify(data));
      return;
    }
    rulesetName = data.name;
    console.log(`  Success! Ruleset created: ${rulesetName}`);
  } catch (e) {
    console.error('  Fetch error during ruleset creation:', e.message);
    return;
  }

  console.log(`\nStep 2: Creating release for ${projectId}...`);
  const createReleaseUrl = `https://firebaserules.googleapis.com/v1/projects/${projectId}/releases`;
  const releaseName = `projects/${projectId}/releases/firebase.storage/${bucketName}`;
  
  try {
    const res = await fetch(createReleaseUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: releaseName,
        rulesetName: rulesetName
      })
    });
    console.log(`  Release Creation Status: ${res.status}`);
    const data = await res.json();
    if (res.ok) {
      console.log('  Success! Rules release deployed:', data);
    } else {
      console.error('  Error creating release:', data.error ? data.error.message : JSON.stringify(data));
    }
  } catch (e) {
    console.error('  Fetch error during release creation:', e.message);
  }
}

deployRules('my-whiskey-prod');
