const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../src');
const outputJson = path.join(__dirname, '../graph.json');
const outputHtml = path.join(__dirname, '../graph.html');
const outputReport = path.join(__dirname, '../GRAPH_REPORT.md');

// Helper to recursively list files
function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.next') {
        results = results.concat(walk(filePath));
      }
    } else {
      if (/\.(js|jsx|ts|tsx)$/.test(file)) {
        results.push(filePath);
      }
    }
  });
  return results;
}

console.log('Scanning src directory for dependency mapping...');
const allFiles = walk(srcDir);
const nodes = [];
const edges = [];
const fileMap = {};

// Register all files as nodes
allFiles.forEach((file) => {
  const relativePath = path.relative(path.join(__dirname, '..'), file).replace(/\\/g, '/');
  fileMap[relativePath] = {
    id: relativePath,
    label: path.basename(file),
    type: relativePath.includes('src/app/api') ? 'API Route' :
          relativePath.includes('src/app/admin') ? 'Admin Page' :
          relativePath.includes('src/components') ? 'Component' :
          relativePath.includes('src/lib') ? 'Library' : 'Other',
    imports: [],
  };
});

// Match import statements using regex
const importRegex = /import\s+?(?:(?:[\w\s{},*]+)\s+from\s+)?['"]([^'"]+)['"]/g;

allFiles.forEach((file) => {
  const relativePath = path.relative(path.join(__dirname, '..'), file).replace(/\\/g, '/');
  const content = fs.readFileSync(file, 'utf8');
  let match;

  while ((match = importRegex.exec(content)) !== null) {
    let importPath = match[1];

    // Resolve aliases like @/...
    if (importPath.startsWith('@/')) {
      importPath = importPath.replace('@/', 'src/');
    } else if (importPath.startsWith('.')) {
      // Resolve relative path
      const fileDir = path.dirname(relativePath);
      const resolved = path.normalize(path.join(fileDir, importPath)).replace(/\\/g, '/');
      importPath = resolved;
    }

    // Try multiple extensions to match node
    const candidates = [
      importPath,
      `${importPath}.ts`,
      `${importPath}.tsx`,
      `${importPath}.js`,
      `${importPath}.jsx`,
      `${importPath}/route.ts`,
      `${importPath}/page.tsx`,
      `${importPath}/index.ts`
    ];

    let matchedNodeId = null;
    for (const cand of candidates) {
      if (fileMap[cand]) {
        matchedNodeId = cand;
        break;
      }
    }

    if (matchedNodeId && matchedNodeId !== relativePath) {
      if (!fileMap[relativePath].imports.includes(matchedNodeId)) {
        fileMap[relativePath].imports.push(matchedNodeId);
        edges.push({
          source: relativePath,
          target: matchedNodeId,
        });
      }
    }
  }
});

// Format nodes array
Object.keys(fileMap).forEach((key) => {
  nodes.push(fileMap[key]);
});

// 1. Output graph.json
fs.writeFileSync(outputJson, JSON.stringify({ nodes, edges }, null, 2));
console.log(`Generated JSON graph with ${nodes.length} nodes and ${edges.length} edges.`);

// 2. Output graph.html (Visual interactive explorer using D3.js)
const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>MY Whiskey - Codebase Dependency Graph</title>
  <script src="https://d3js.org/d3.v7.min.js"></script>
  <style>
    body {
      margin: 0;
      background: #0a0a0a;
      color: #ededed;
      font-family: 'Inter', sans-serif;
      overflow: hidden;
    }
    header {
      position: absolute;
      top: 20px;
      left: 20px;
      background: rgba(23, 23, 23, 0.85);
      padding: 15px 25px;
      border-radius: 12px;
      border: 1px solid #27272a;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.5);
      z-index: 10;
    }
    h1 {
      margin: 0 0 5px 0;
      font-size: 1.5rem;
      color: #d97706;
    }
    p {
      margin: 0;
      font-size: 0.85rem;
      color: #a1a1aa;
    }
    .node {
      stroke: #0a0a0a;
      stroke-width: 1.5px;
      cursor: pointer;
    }
    .link {
      stroke: #27272a;
      stroke-opacity: 0.6;
      stroke-width: 1px;
    }
    text {
      font-size: 10px;
      fill: #ededed;
      pointer-events: none;
    }
  </style>
</head>
<body>
  <header>
    <h1>MY Whiskey Codebase Graph</h1>
    <p>Nodes: ${nodes.length} | Edges: ${edges.length}</p>
    <p>Scroll to zoom, drag nodes to reposition.</p>
  </header>
  <svg width="100vw" height="100vh"></svg>
  <script>
    const data = ${JSON.stringify({ nodes, edges })};
    const svg = d3.select("svg"),
          width = window.innerWidth,
          height = window.innerHeight;

    const g = svg.append("g");

    svg.call(d3.zoom().on("zoom", (event) => {
      g.attr("transform", event.transform);
    }));

    const colorMap = {
      'API Route': '#d97706',
      'Admin Page': '#3b82f6',
      'Component': '#10b981',
      'Library': '#8b5cf6',
      'Other': '#6b7280'
    };

    const simulation = d3.forceSimulation(data.nodes)
        .force("link", d3.forceLink(data.edges).id(d => d.id).distance(120))
        .force("charge", d3.forceManyBody().strength(-200))
        .force("center", d3.forceCenter(width / 2, height / 2));

    const link = g.append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(data.edges)
      .enter().append("line")
      .attr("class", "link");

    const node = g.append("g")
      .attr("class", "nodes")
      .selectAll("g")
      .data(data.nodes)
      .enter().append("g");

    node.append("circle")
        .attr("r", 8)
        .attr("fill", d => colorMap[d.type] || '#6b7280')
        .attr("class", "node")
        .call(d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended));

    node.append("text")
        .attr("dx", 12)
        .attr("dy", ".35em")
        .text(d => d.label);

    simulation.on("tick", () => {
      link
          .attr("x1", d => d.source.x)
          .attr("y1", d => d.source.y)
          .attr("x2", d => d.target.x)
          .attr("y2", d => d.target.y);

      node
          .attr("transform", d => \`translate(\${d.x},\${d.y})\`);
    });

    function dragstarted(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event, d) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event, d) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }
  </script>
</body>
</html>`;

fs.writeFileSync(outputHtml, htmlContent);
console.log('Generated visual HTML graph.');

// 3. Output GRAPH_REPORT.md
const counts = {
  'API Route': 0,
  'Admin Page': 0,
  'Component': 0,
  'Library': 0,
  'Other': 0
};
nodes.forEach(n => {
  counts[n.type] = (counts[n.type] || 0) + 1;
});

const reportContent = `# Codebase Dependency Graph Report

This report summarizes the structure and dependencies of the **MY Whiskey** repository codebase, generated automatically during CI builds.

---

## 1. Summary Statistics
*   **Total Files Scanned**: ${nodes.length}
*   **Total Direct Dependency Linkages**: ${edges.length}

### Module Breakdown
*   **API Route Endpoints** (Serverless backend): ${counts['API Route']}
*   **Crew Admin Dashboards**: ${counts['Admin Page']}
*   **Reusable React Components**: ${counts['Component']}
*   **Shared Data & Integration Libraries**: ${counts['Library']}
*   **Other Files**: ${counts['Other']}

---

## 2. Dynamic Component & Route Map

Below are critical entry points and their direct import counts:

### API Endpoints
${nodes.filter(n => n.type === 'API Route').map(n => `*   **${n.id}** (${n.imports.length} imports)`).join('\n')}

### Admin Views
${nodes.filter(n => n.type === 'Admin Page').map(n => `*   **${n.id}** (${n.imports.length} imports)`).join('\n')}
`;

fs.writeFileSync(outputReport, reportContent);
console.log('Generated markdown structural report.');
