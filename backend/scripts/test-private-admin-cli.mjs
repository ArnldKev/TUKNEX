import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseConnection } from './create-admin.mjs';

test('private CLI displays the target without revealing connection credentials', () => {
  const url='postgresql://operator:synthetic-test-password@db.example.test/neondb?sslmode=require&channel_binding=require';
  const parsed=parseConnection('DATABASE_URL="'+url+'"\nADMIN_SETUP_TOKEN=obsolete');
  assert.equal(parsed.connectionString,url);
  assert.equal(parsed.target,'db.example.test/neondb');
  assert.ok(!parsed.target.includes('operator')&&!parsed.target.includes('synthetic-test-password'));
});

test('private CLI rejects missing or non-PostgreSQL connections without echoing their contents', () => {
  for(const value of ['', 'DATABASE_URL=not-a-url', 'DATABASE_URL=https://private.example.test/db', 'DATABASE_URL=postgresql://localhost/db'])
    assert.throws(()=>parseConnection(value),/^Error: DATABASE_URL no es una conexión PostgreSQL válida\.$/);
});

test('private CLI has no password argument or piped credential mode', () => {
  const script=fileURLToPath(new URL('./create-admin.mjs',import.meta.url));
  const help=spawnSync(process.execPath,[script,'--help'],{encoding:'utf8',windowsHide:true});
  assert.equal(help.status,0);
  assert.match(help.stdout,/--connection-file/);
  const credentials=spawnSync(process.execPath,[script,'--password','synthetic-not-real'],{encoding:'utf8',windowsHide:true});
  assert.equal(credentials.status,1);
  assert.ok(!credentials.stderr.includes('synthetic-not-real'));
  const piped=spawnSync(process.execPath,[script,'--connection-file','.env.admin.local'],{encoding:'utf8',input:'synthetic-not-real\n',windowsHide:true});
  assert.equal(piped.status,1);
  assert.match(piped.stderr,/terminal interactiva/);
  assert.ok(!piped.stderr.includes('synthetic-not-real'));
});
