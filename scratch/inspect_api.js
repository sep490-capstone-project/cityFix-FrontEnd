const fs = require('fs');
const json = JSON.parse(fs.readFileSync('scratch/openapi.json', 'utf8'));
const paths = Object.keys(json.paths);

console.log('--- ALL TAGS ---');
const tags = new Set();
for (const p of paths) {
  for (const m of Object.keys(json.paths[p])) {
    const op = json.paths[p][m];
    (op.tags || []).forEach(t => tags.add(t));
  }
}
console.log(Array.from(tags).join(', '));

console.log('\n--- ALL ENDPOINTS ---');
paths.forEach(p => {
  for (const m of Object.keys(json.paths[p])) {
    const op = json.paths[p][m];
    const tagsStr = (op.tags || []).join(', ');
    const summary = op.summary || op.description || '';
    console.log(`[${m.toUpperCase()}] ${p} | tags: [${tagsStr}] | ${summary}`);
  }
});
