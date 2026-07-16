const { spawnSync } = require('node:child_process');
const { resolve } = require('node:path');
const { config } = require('dotenv');

config({ path: resolve(__dirname, '../apps/backend-api/.env'), quiet: true });

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set in the environment or apps/backend-api/.env');
}

const prismaCli = require.resolve('prisma/build/index.js');
const result = spawnSync(process.execPath, [prismaCli, 'validate', '--schema', 'prisma/schema.prisma'], {
  cwd: resolve(__dirname, '..'),
  env: process.env,
  stdio: 'inherit',
});

if (result.error) throw result.error;
process.exit(result.status ?? 1);
