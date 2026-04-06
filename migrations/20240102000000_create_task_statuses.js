export const up = (knex) => knex.schema.createTable('task_statuses', (t) => {
  t.increments('id').primary();
  t.string('name').notNullable();
  t.timestamps(true, true);
});

export const down = (knex) => knex.schema.dropTable('task_statuses');
