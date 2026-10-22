import { BACKEND_ROOT } from '../config/paths';
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PGlite } from '@electric-sql/pglite';
import { Pool } from 'pg';
import { readFile, readdir, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
export interface Sql {
  query(sql: string, params?: unknown[]): Promise<{ rows: Record<string, any>[] }>;
}
@Injectable()
export class Database implements OnModuleInit, OnModuleDestroy {
  private embedded?: PGlite;
  private pool?: Pool;
  mode = process.env.BILLING_MODE === 'local-demo' ? ('local-demo' as const) : ('production' as const);
  async onModuleInit() {
    if (this.mode === 'production') {
      if (!process.env.DATABASE_URL) throw new Error('Configura DATABASE_URL o ejecuta npm run setup para conectar PostgreSQL.');
      this.pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 10, connectionTimeoutMillis: 10000 });
    } else {
      const dir = resolve(BACKEND_ROOT, process.env.DATA_DIR || '.local-data/billing');
      await mkdir(dir, { recursive: true });
      this.embedded = new PGlite(dir);
      await this.embedded.waitReady;
    }
    await this.query(
      'CREATE TABLE IF NOT EXISTS schema_migrations (id text PRIMARY KEY,created_at timestamptz NOT NULL DEFAULT now())',
    );
    for (const name of (await readdir(resolve(BACKEND_ROOT, 'migrations')))
      .filter((n) => n.endsWith('.sql'))
      .sort()) {
      await this.transaction(async (tx) => {
        const found = await tx.query('SELECT id FROM schema_migrations WHERE id=$1', [name]);
        if (!found.rows.length) {
          const sql = await readFile(resolve(BACKEND_ROOT, 'migrations', name), 'utf8');
          if (this.embedded) await (tx as Sql & { exec: (s: string) => Promise<unknown> }).exec(sql);
          else await tx.query(sql);
          await tx.query('INSERT INTO schema_migrations(id) VALUES($1)', [name]);
        }
      });
    }
  }
  async query(sql: string, params: unknown[] = []): Promise<{ rows: Record<string, any>[] }> {
    if (this.embedded) return this.embedded.query(sql, params);
    if (!this.pool) throw new Error('Base de datos no iniciada.');
    return this.pool.query(sql, params);
  }
  async transaction<T>(fn: (tx: Sql) => Promise<T>): Promise<T> {
    if (this.embedded) return this.embedded.transaction((tx) => fn(tx as unknown as Sql));
    if (!this.pool) throw new Error('Base de datos no iniciada.');
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const value = await fn(client);
      await client.query('COMMIT');
      return value;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  async onModuleDestroy() {
    await this.embedded?.close();
    await this.pool?.end();
  }
}
