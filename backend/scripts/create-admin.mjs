import 'reflect-metadata';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { createInterface } from 'node:readline/promises';
import { Writable } from 'node:stream';
import { parse } from 'dotenv';
import pg from 'pg';

const require = createRequire(import.meta.url);
const help = 'Uso: npm run admin:create -- --connection-file .env.admin.local\nEl archivo privado debe contener DATABASE_URL. Se solicitan nombre, correo y contraseña en la terminal; no se aceptan contraseñas como argumentos.';

export function parseConnection(text) {
  const connectionString = parse(text).DATABASE_URL?.trim();
  let url;
  try { url = new URL(connectionString); } catch { throw new Error('DATABASE_URL no es una conexión PostgreSQL válida.'); }
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname || !url.username || !url.pathname.slice(1))
    throw new Error('DATABASE_URL no es una conexión PostgreSQL válida.');
  return { connectionString, target: url.hostname + url.pathname };
}

export async function run(args = process.argv.slice(2)) {
  if (args.length === 1 && args[0] === '--help') { console.log(help); return; }
  if (args.length !== 2 || args[0] !== '--connection-file' || !args[1]) throw new Error(help);
  if (!process.stdin.isTTY || !process.stdout.isTTY) throw new Error('Ejecuta este comando en una terminal interactiva de VS Code. No se aceptan credenciales por tuberías.');
  const envPath = resolve(args[1]);
  let text;
  try { text = await readFile(envPath, 'utf8'); } catch { throw new Error('No se pudo leer el archivo privado indicado con --connection-file.'); }
  const { connectionString, target } = parseConnection(text);
  let muted = false, pool;
  const output = new Writable({ write(chunk, encoding, done) { if (!muted) process.stdout.write(chunk, encoding); done(); } });
  output.columns = process.stdout.columns || 80;
  const rl = createInterface({ input: process.stdin, output, terminal: true, historySize: 0 });
  rl.on('SIGINT', () => rl.close());
  async function secret(label) {
    process.stdout.write(label);
    muted = true;
    try { return await rl.question(''); } finally { muted = false; process.stdout.write('\n'); }
  }
  try {
    console.log('Crear administrador privado de TUKNEX. Destino: ' + target);
    if ((await rl.question('Escribe CREAR para confirmar esta base: ')).trim() !== 'CREAR') { console.log('Cancelado. No se modificó ninguna cuenta.'); return; }
    const name = await rl.question('Nombre completo: ');
    const email = await rl.question('Correo: ');
    const password = await secret('Contraseña (mínimo 12 caracteres; no se muestra): ');
    const confirm = await secret('Repite la contraseña: ');
    if (password !== confirm) throw new Error('Las contraseñas no coinciden.');
    const { provisionAdmin } = require('../dist/auth/private-admin.js');
    pool = new pg.Pool({ connectionString, max: 1, connectionTimeoutMillis: 15000 });
    const db = { async transaction(fn) {
      const client = await pool.connect();
      try { await client.query('BEGIN'); const value = await fn(client); await client.query('COMMIT'); return value; }
      catch (error) { await client.query('ROLLBACK'); throw error; }
      finally { client.release(); }
    } };
    await provisionAdmin(db, { name, email, password });
    console.log('Administrador creado. Ya puede iniciar sesión con su correo y contraseña. No se ha abierto una sesión ni se han modificado cuentas existentes.');
  } finally { muted = false; rl.close(); output.end(); await pool?.end(); }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  run().catch(error => {
    const safe = error.message === help || /^(DATABASE_URL|No se pudo leer|Ejecuta este comando|Las contraseñas|Ese correo)/.test(error.message);
    console.error(safe ? error.message : error.getStatus?.() === 400
      ? 'Revisa el nombre, correo y contraseña (mínimo 12 caracteres).'
      : error.code === '42P01' ? 'Faltan las tablas. Inicia primero el backend para aplicar sus migraciones.'
      : 'No se pudo crear la cuenta. Comprueba la conexión PostgreSQL y los permisos del usuario de la base.');
    process.exitCode = 1;
  });
}
