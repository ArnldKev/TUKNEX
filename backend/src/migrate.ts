import 'reflect-metadata';
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { BACKEND_ROOT } from './config/paths';
config({ path: resolve(BACKEND_ROOT, '.env'), quiet: true });
import { Database } from './database/database';
void (async () => {
  const db = new Database();
  try {
    await db.onModuleInit();
    console.log('Migraciones aplicadas.');
  } finally {
    await db.onModuleDestroy();
  }
})().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
