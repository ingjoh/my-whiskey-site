const fs = require('fs');
const path = require('path');

function getFirebaseToken() {
  const configPath = 'C:\\Users\\ingem\\.config\\configstore\\firebase-tools.json';
  if (fs.existsSync(configPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (data.tokens && data.tokens.access_token) {
        console.log(`Found access_token in ${configPath}`);
        return data.tokens.access_token;
      }
    } catch (err) {
      console.error(`Error reading ${configPath}:`, err.message);
    }
  }
  return null;
}

async function updateDocument(projectId, token) {
  const docId = 'content-item-sunset-snacks-cruise-baytowne';
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/pages/${docId}?updateMask.fieldPaths=linkedAssets`;

  const body = {
    fields: {
      linkedAssets: {
        arrayValue: {
          values: [
            { stringValue: 'my-whiskey-yacht' }
          ]
        }
      }
    }
  };

  console.log(`Updating ${projectId}...`);
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }

  const json = await res.json();
  console.log(`✓ Updated ${projectId} successfully!`);
}

async function main() {
  const token = getFirebaseToken();
  if (!token) {
    console.error('✗ No active Firebase CLI access_token found.');
    return;
  }

  try {
    await updateDocument('mywhiskey-97620', token);
  } catch (err) {
    console.error('✗ Failed to update staging:', err.message);
  }

  try {
    await updateDocument('my-whiskey-prod', token);
  } catch (err) {
    console.error('✗ Failed to update production:', err.message);
  }
}

main().catch(console.error);
