const fs = require('fs');
const path = require('path');
const os = require('os');

const paths = [
  path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json'),
  path.join(process.env.APPDATA || '', 'Config', 'configstore', 'firebase-tools.json'),
  path.join(process.env.LOCALAPPDATA || '', 'Config', 'configstore', 'firebase-tools.json'),
  path.join(os.homedir(), 'AppData', 'Local', 'configstore', 'firebase-tools.json'),
  path.join(os.homedir(), 'AppData', 'Roaming', 'configstore', 'firebase-tools.json'),
];

console.log('Checking paths...');
for (const p of paths) {
  const exists = fs.existsSync(p);
  console.log(`Path: ${p} - Exists: ${exists}`);
  if (exists) {
    try {
      const data = JSON.parse(fs.readFileSync(p, 'utf8'));
      console.log('Keys in json:', Object.keys(data));
      if (data.tokens) {
        console.log('Tokens object keys:', Object.keys(data.tokens));
      }
      if (data.user) {
        console.log('User email:', data.user.email);
      }
    } catch (e) {
      console.error('Error reading file:', e.message);
    }
  }
}
