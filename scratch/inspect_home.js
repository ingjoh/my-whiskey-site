const fs = require('fs');
const path = require('path');
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc } = require('firebase/firestore');

// Simple env parser
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*["']?([^"'\r\n]+)["']?/);
  if (match) {
    env[match[1]] = match[2];
  }
});

const firebaseConfig = {
  apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function inspectHome() {
  console.log('Inspecting "home" page document...');
  const homeDoc = await getDoc(doc(db, 'pages', 'home'));
  if (homeDoc.exists()) {
    const data = homeDoc.data();
    console.log('Page Title:', data.title);
    if (data.nodes) {
      console.log('\n--- HOMEPAGE NODES IN ORDER ---');
      const root = data.nodes['root'];
      if (root) {
        console.log(`Root node: type=${root.type}, children=${JSON.stringify(root.children)}`);
        
        // Print recursively or step through children
        function printNode(id, indent = 0) {
          const node = data.nodes[id];
          if (!node) {
            console.log(' '.repeat(indent) + `[Missing node: ${id}]`);
            return;
          }
          console.log(' '.repeat(indent) + `- Node [${id}]: type=${node.type}`);
          if (node.props) {
            console.log(' '.repeat(indent + 2) + `headline="${node.props.headline || ''}"`);
            console.log(' '.repeat(indent + 2) + `eyebrow="${node.props.eyebrow || ''}"`);
            console.log(' '.repeat(indent + 2) + `contentType="${node.props.contentType || ''}"`);
          }
          if (node.children && node.children.length > 0) {
            node.children.forEach(childId => printNode(childId, indent + 2));
          }
        }
        
        root.children.forEach(childId => printNode(childId));
      } else {
        console.log('No root node found in nodes object.');
      }
    } else {
      console.log('No nodes field in the page document.');
    }
  } else {
    console.log('Page document "home" not found.');
  }
}

inspectHome().catch(console.error);
