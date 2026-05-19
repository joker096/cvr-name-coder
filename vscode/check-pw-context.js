const fs = require('fs');
const ext = fs.readFileSync('F:/AISTUDIO/cvr.name.coder/vscode/dist/extension.js', 'utf8');
const idx = ext.indexOf('require("playwright-core")');
console.log('Found at index:', idx);
if (idx >= 0) {
  console.log('Context:');
  console.log(ext.slice(Math.max(0, idx-300), idx+300).replace(/\n/g, ' '));
}
