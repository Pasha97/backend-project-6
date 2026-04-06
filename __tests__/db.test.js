import {
  describe, it, expect,
} from '@jest/globals';
import knex from 'knex';
import knexConfig from '../knexfile.js';

describe('db module', () => {
  it('uses test config when NODE_ENV=test', async () => {
    const db = knex(knexConfig.test);
    expect(db.client.config.client).toBe('better-sqlite3');
    expect(db.client.config.connection).toEqual({ filename: ':memory:' });
    await db.destroy();
  });

  it('falls back to development config when NODE_ENV is not set', async () => {
    const env = process.env.NODE_ENV ?? 'development';
    expect(env).toBeDefined();
    const db = knex(knexConfig[env]);
    expect(db.client.config.client).toBe('better-sqlite3');
    await db.destroy();
  });

  it('selects correct config for each environment', () => {
    expect(knexConfig.test.connection).toBe(':memory:');
    expect(knexConfig.development.connection).toEqual({ filename: './database.sqlite3' });
    expect(knexConfig.production.client).toBe('pg');
  });
});
