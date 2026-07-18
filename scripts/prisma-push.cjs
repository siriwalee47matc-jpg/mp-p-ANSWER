const { spawnSync } = require('node:child_process');
const { resolve } = require('node:path');
const { config } = require('dotenv');

config({ path: resolve(__dirname, '../apps/backend-api/.env') });

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required in apps/backend-api/.env');
}

const prismaCli = require.resolve('prisma/build/index.js');
const result = spawnSync(process.execPath, [prismaCli, 'db', 'push', '--schema', 'prisma/schema.prisma'], {
  cwd: resolve(__dirname, '..'),
  env: process.env,
  stdio: 'inherit',
});

if (result.error) throw result.error;

process.exit(result.status ?? 1);
