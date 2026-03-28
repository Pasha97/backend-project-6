export const up = (knex) =>
  knex.schema.createTable('users', (t) => {
    t.increments('id').primary();
    t.string('firstName').notNullable();
    t.string('lastName').notNullable();
    t.string('email').notNullable().unique();
    t.string('passwordDigest').notNullable();
    t.timestamps(true, true);
  });

export const down = (knex) => knex.schema.dropTable('users');
