const fs = require('fs');
const path = require('path');

const filePath = path.join(
  __dirname,
  '..',
  'node_modules',
  '.pnpm',
  'react-phone-input-pro@1.0.11',
  'node_modules',
  'react-phone-input-pro',
  'dist',
  'styles',
  'index.module.css',
);

if (!fs.existsSync(filePath)) {
  console.log('react-phone-input-pro CSS not found, skipping patch.');
  process.exit(0);
}

let content = fs.readFileSync(filePath, 'utf8');
content = content
  .replace(/\s*input::-webkit-input-placeholder\s*\{[^}]*\}/g, '')
  .replace(/\s*input::-moz-placeholder\s*\{[^}]*\}/g, '')
  .replace(/\s*input:-ms-input-placeholder\s*\{[^}]*\}/g, '')
  .replace(/\s*input::placeholder\s*\{[^}]*\}/g, '');
fs.writeFileSync(filePath, content);
console.log('Patched react-phone-input-pro CSS successfully.');
