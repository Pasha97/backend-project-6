export default {
  development: {
    client: 'better-sqlite3',
    connection: { filename: './database.sqlite3' },
    useNullAsDefault: true,
    migrations: { tableName: 'knex_migrations' },
  },
  test: {
    client: 'better-sqlite3',
    connection: ':memory:',
    useNullAsDefault: true,
    migrations: { tableName: 'knex_migrations' },
  },
  production: {
    client: 'pg',
    connection: {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    },
    migrations: { tableName: 'knex_migrations' },
  },
};
