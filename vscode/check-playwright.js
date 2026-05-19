const fs = require('fs');
const ext = fs.readFileSync('F:/AISTUDIO/cvr.name.coder/vscode/dist/extension.js', 'utf8');
console.log('require("playwright-core"):', ext.includes('require("playwright-core")'));
console.log('require("playwright"):', ext.includes('require("playwright")'));
console.log('"playwright-core" count:', [...ext.matchAll(/playwright-core/g)].length);
