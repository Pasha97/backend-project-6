export const up = (knex) =>
  knex.schema.createTable('tasks', (t) => {
    t.increments('id').primary();
    t.string('name').notNullable();
    t.text('description');
    t.integer('statusId').unsigned().notNullable()
      .references('id').inTable('task_statuses');
    t.integer('creatorId').unsigned().notNullable()
      .references('id').inTable('users');
    t.integer('executorId').unsigned()
      .references('id').inTable('users');
    t.timestamps(true, true);
  });

export const down = (knex) => knex.schema.dropTable('tasks');
