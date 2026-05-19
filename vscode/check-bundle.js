const fs = require('fs');
const ext = fs.readFileSync('./dist/extension.js', 'utf8');

console.log('Has express require:', ext.includes('require("express")'));
console.log('Has dotenv require:', ext.includes('require("dotenv")'));
console.log('Has __dirname:', ext.includes('__dirname'));
console.log('Has process.cwd:', ext.includes('process.cwd'));
console.log('Has getServerDir:', ext.includes('getServerDir'));
console.log('Has ACTIVATION FAILED:', ext.includes('[CVR] ACTIVATION FAILED'));
console.log('Has [CVR] Extension activating:', ext.includes('[CVR] Extension activating'));
console.log('Has onView:cvr.webview:', ext.includes('onView:cvr.webview'));

// Check for any dynamic requires that might fail
const dynamicRequires = [...ext.matchAll(/require\(([^)]+)\)/g)];
console.log('Dynamic requires count:', dynamicRequires.length);
const uniqueRequires = [...new Set(dynamicRequires.map(m => m[1]))];
console.log('Unique dynamic requires:', uniqueRequires.slice(0, 20));

// Check if there's any top-level code that might throw
console.log('File starts with:', ext.slice(0, 100));
console.log('File ends with:', ext.slice(-100));
