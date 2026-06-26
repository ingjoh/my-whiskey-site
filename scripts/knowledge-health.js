const fs = require('fs');
const path = require('path');

const knowledgeDir = path.join(__dirname, '../knowledge');
const registryFile = path.join(knowledgeDir, 'index.yaml');

// Helper to parse 2-level simple index.yaml
function parseIndexYaml(content) {
  const registry = {};
  const lines = content.split('\n');
  let currentConcept = null;
  let currentProp = null;

  for (let line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const indent = line.length - line.trimStart().length;

    if (indent === 0) {
      const conceptName = trimmed.replace(':', '').trim();
      registry[conceptName] = {};
      currentConcept = registry[conceptName];
      currentProp = null;
    } else if (currentConcept) {
      if (trimmed.startsWith('-')) {
        if (currentProp && Array.isArray(currentConcept[currentProp])) {
          const val = trimmed.substring(1).trim().replace(/['"]/g, '');
          currentConcept[currentProp].push(val);
        }
      } else {
        const colonIndex = trimmed.indexOf(':');
        if (colonIndex !== -1) {
          const key = trimmed.substring(0, colonIndex).trim();
          const val = trimmed.substring(colonIndex + 1).trim().replace(/^['"]|['"]$/g, '');
          if (val === '' || val === '[]') {
            currentConcept[key] = [];
            currentProp = key;
          } else {
            if (val.startsWith('[') && val.endsWith(']')) {
              currentConcept[key] = val.substring(1, val.length - 1).split(',').map(s => s.trim().replace(/['"]/g, '')).filter(Boolean);
            } else {
              currentConcept[key] = val;
            }
            currentProp = key;
          }
        }
      }
    }
  }
  return registry;
}

// Helper to parse YAML frontmatter from markdown
function parseFrontmatter(content) {
  const match = content.match(/^---([\s\S]+?)---/);
  if (!match) return null;

  const yamlText = match[1];
  const obj = {};
  const lines = yamlText.split('\n');

  for (let line of lines) {
    line = line.trim();
    if (!line || line.startsWith('#')) continue;

    const colonIndex = line.indexOf(':');
    if (colonIndex !== -1) {
      const key = line.substring(0, colonIndex).trim();
      let val = line.substring(colonIndex + 1).trim().replace(/^['"]|['"]$/g, '');
      if (val.startsWith('[') && val.endsWith(']')) {
        obj[key] = val.substring(1, val.length - 1).split(',').map(s => s.trim().replace(/['"]/g, '')).filter(Boolean);
      } else {
        obj[key] = val;
      }
    }
  }
  return obj;
}

// Recursively find all markdown files in a directory (excluding reserved files)
function getMarkdownFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getMarkdownFiles(filePath));
    } else if (file.endsWith('.md')) {
      const name = file;
      if (name !== 'log.md' && name !== 'index.md' && name !== 'README.md') {
        results.push(filePath);
      }
    }
  });
  return results;
}

console.log('==================================================');
console.log('KNOWLEDGE CATALOG HEALTH AUDIT');
console.log('==================================================\n');

// 1. Load Registry
if (!fs.existsSync(registryFile)) {
  console.error('Error: index.yaml registry file not found!');
  process.exit(1);
}
const registryContent = fs.readFileSync(registryFile, 'utf8');
const registry = parseIndexYaml(registryContent);
const registeredKeys = Object.keys(registry);

// 2. Scan Knowledge Folder Recursively
if (!fs.existsSync(knowledgeDir)) {
  console.error('Error: knowledge directory not found!');
  process.exit(1);
}
const mdFiles = getMarkdownFiles(knowledgeDir);
const conceptFilesMap = {};

let totalConcepts = 0;
const maturityCounts = {};
const statusCounts = {};
const typeCounts = {};
const missingMaturity = [];
const missingExamples = [];
const brokenLinks = [];

mdFiles.forEach((filePath) => {
  totalConcepts++;
  const name = path.basename(filePath, '.md');
  const content = fs.readFileSync(filePath, 'utf8');

  const meta = parseFrontmatter(content);
  conceptFilesMap[name] = { meta: meta || {}, path: filePath };

  if (meta) {
    // Audit type
    const type = meta.type || 'missing';
    typeCounts[type] = (typeCounts[type] || 0) + 1;

    // Audit maturity
    const mat = meta.maturity || 'missing';
    maturityCounts[mat] = (maturityCounts[mat] || 0) + 1;
    if (mat === 'missing') {
      missingMaturity.push(name);
    }

    // Audit status
    const stat = meta.status || 'missing';
    statusCounts[stat] = (statusCounts[stat] || 0) + 1;

    // Audit examples presence (only mandatory for Concept types)
    if (meta.type === 'Concept' && !content.includes('## Examples') && !content.includes('### Good Practice')) {
      missingExamples.push(name);
    }

    // Audit broken links in body
    const linkRegex = /\[.+?\]\(file:\/\/\/.+?\/knowledge\/(.+?\.md)\)/g;
    let linkMatch;
    while ((linkMatch = linkRegex.exec(content)) !== null) {
      const relPath = linkMatch[1];
      const fullLinkPath = path.normalize(path.join(knowledgeDir, relPath));
      if (!fs.existsSync(fullLinkPath)) {
        brokenLinks.push({ from: name, target: relPath });
      }
    }
  } else {
    missingMaturity.push(name);
    if (filePath.includes('/concepts/')) {
      missingExamples.push(name);
    }
  }
});

// 3. Registry & Orphan checks
const unregisteredFiles = [];
const orphanedRegistryEntries = [];
const missingDependencies = [];

mdFiles.forEach(filePath => {
  const name = path.basename(filePath, '.md');
  if (!registry[name]) {
    unregisteredFiles.push(name);
  }
});

registeredKeys.forEach(key => {
  const metaObj = conceptFilesMap[key];
  if (!metaObj) {
    orphanedRegistryEntries.push(key);
  } else {
    // Check dependencies link health
    const deps = registry[key].depends_on || [];
    deps.forEach(dep => {
      if (!registry[dep] && !conceptFilesMap[dep]) {
        missingDependencies.push({ from: key, missing: dep });
      }
    });
  }
});

// 4. Print Dashboard
console.log(`Total Concepts Scanned: ${totalConcepts}`);

console.log('\nType Distribution:');
Object.keys(typeCounts).forEach(t => {
  console.log(`  - ${t}: ${typeCounts[t]}`);
});

console.log('\nMaturity Distribution:');
Object.keys(maturityCounts).forEach(m => {
  console.log(`  - ${m}: ${maturityCounts[m]}`);
});

console.log('\nStatus Distribution:');
Object.keys(statusCounts).forEach(s => {
  console.log(`  - ${s}: ${statusCounts[s]}`);
});

console.log('\n--------------------------------------------------');
console.log('AUDIT FINDINGS:');
console.log('--------------------------------------------------');

let hasFailures = false;

// Print Orphans
if (unregisteredFiles.length > 0) {
  console.error(`❌ Unregistered files (exist in knowledge/ but not in index.yaml):`);
  unregisteredFiles.forEach(f => console.error(`  - ${f}.md`));
  hasFailures = true;
} else {
  console.log(`✓ 0 unregistered concept files detected.`);
}

if (orphanedRegistryEntries.length > 0) {
  console.error(`❌ Orphaned registry entries (defined in index.yaml but missing file):`);
  orphanedRegistryEntries.forEach(e => console.error(`  - ${e}`));
  hasFailures = true;
} else {
  console.log(`✓ 0 orphaned registry definitions detected.`);
}

// Print Missing Dependencies
if (missingDependencies.length > 0) {
  console.error(`❌ Broken Registry dependencies (depends_on concepts that don't exist):`);
  missingDependencies.forEach(d => console.error(`  - ${d.from} -> depends on missing "${d.missing}"`));
  hasFailures = true;
} else {
  console.log(`✓ 0 broken registry dependencies detected.`);
}

// Print Broken Links
if (brokenLinks.length > 0) {
  console.error(`❌ Broken file links inside concept markdown bodies:`);
  brokenLinks.forEach(l => console.error(`  - ${l.from}.md contains broken link to: "${l.target}"`));
  hasFailures = true;
} else {
  console.log(`✓ 0 broken cross-linking references detected.`);
}

// Warn on missing maturity/examples (soft warnings for MVP stage)
if (missingMaturity.length > 0) {
  console.warn(`⚠️  Concepts missing "maturity" metadata:`);
  missingMaturity.forEach(m => console.warn(`  - ${m}`));
}

if (missingExamples.length > 0) {
  console.warn(`⚠️  Concepts missing "## Examples" documentation:`);
  missingExamples.forEach(e => console.warn(`  - ${e}`));
}

console.log('\n==================================================');
if (hasFailures) {
  console.error('AUDIT RESULT: FAILED');
  process.exit(1);
} else {
  console.log('AUDIT RESULT: PASSED (Health Status: 100%)');
  process.exit(0);
}
