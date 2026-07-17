const fs = require('node:fs');
const path = require('node:path');

const extensionRoot = path.resolve(__dirname, '..');
const contentPath = path.join(extensionRoot, 'dist', 'assets', 'content.js');
const backgroundPath = path.join(extensionRoot, 'dist', 'assets', 'background.js');
const popupPath = path.join(extensionRoot, 'dist', 'assets', 'popup.js');
const manifestPath = path.join(extensionRoot, 'dist', 'manifest.json');

for (const file of [contentPath, backgroundPath, popupPath, manifestPath]) {
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
if (!background.includes('assets/content.js') || !background.includes('setBadgeText')) {
  throw new Error('Background scan must retry in-page alerts and expose a risk badge');
}
if (!background.includes('whoisInfo')) {
  throw new Error('Background scan history must retain OSINT data');
}

const popup = fs.readFileSync(popupPath, 'utf8');
if (!popup.includes('whoisInfo') || !popup.includes('officialProductSources')) {
  throw new Error('Popup history must restore complete investigation data');
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
if (manifest.version !== '1.0.6') {
  throw new Error(`Expected extension version 1.0.6, received ${manifest.version}`);
}

console.log('Extension build verification passed.');
