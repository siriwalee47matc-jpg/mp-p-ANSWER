const { execFileSync } = require('child_process');
const fs = require('fs');
const { createRequire } = require('module');
const path = require('path');

const root = path.resolve(__dirname, '..');
const dashboardRequire = createRequire(path.join(root, 'apps', 'dashboard-web', 'package.json'));
const { ZipArchive } = dashboardRequire('archiver');
const extensionDirectory = path.join(root, 'apps', 'browser-extension');
const distDirectory = path.join(extensionDirectory, 'dist');
const installGuide = path.join(extensionDirectory, 'INSTALLATION.txt');
const outputDirectory = path.join(root, 'apps', 'dashboard-web', 'public', 'downloads');
const outputFile = path.join(outputDirectory, 'sentinel-ads-extension.zip');

const command = 'npm run build --workspace=apps/browser-extension';
const npmExecutable = process.platform === 'win32' ? process.env.ComSpec || 'cmd.exe' : 'npm';
const npmArguments = process.platform === 'win32' ? ['/d', '/s', '/c', command] : ['run', 'build', '--workspace=apps/browser-extension'];

execFileSync(npmExecutable, npmArguments, {
  cwd: root,
  stdio: 'inherit',
});

fs.copyFileSync(installGuide, path.join(distDirectory, 'INSTALLATION.txt'));
fs.mkdirSync(outputDirectory, { recursive: true });

const output = fs.createWriteStream(outputFile);
const archive = new ZipArchive({ zlib: { level: 9 } });

archive.on('warning', (error) => {
  if (error.code !== 'ENOENT') throw error;
});
archive.on('error', (error) => {
  throw error;
});
archive.pipe(output);
archive.directory(distDirectory, false);
archive.finalize();

output.on('close', () => {
  console.log(`Extension package created: ${path.relative(root, outputFile)} (${archive.pointer()} bytes)`);
});
