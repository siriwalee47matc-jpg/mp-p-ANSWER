const fs = require('node:fs');
const path = require('node:path');

const extensionRoot = path.resolve(__dirname, '..');
const contentPath = path.join(extensionRoot, 'dist', 'assets', 'content.js');
const backgroundPath = path.join(extensionRoot, 'dist', 'assets', 'background.js');
const manifestPath = path.join(extensionRoot, 'dist', 'manifest.json');

for (const file of [contentPath, backgroundPath, manifestPath]) {
  if (!fs.existsSync(file)) throw new Error(`Missing extension build output: ${file}`);
}

const content = fs.readFileSync(contentPath, 'utf8');
if (/^\s*import\s/m.test(content)) {
  throw new Error('Chrome content script must not contain ES module imports');
}

const background = fs.readFileSync(backgroundPath, 'utf8');
if (!background.includes('/risk/logs')) {
  throw new Error('Background auto-scan must use the public atomic risk-analysis endpoint');
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
if (manifest.version !== '1.0.5') {
  throw new Error(`Expected extension version 1.0.5, received ${manifest.version}`);
}

console.log('Extension build verification passed.');
