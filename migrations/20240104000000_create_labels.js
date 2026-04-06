export const up = async (knex) => {
  await knex.schema.createTable('labels', (t) => {
    t.increments('id').primary();
    t.string('name').notNullable();
    t.timestamps(true, true);
  });

  await knex.schema.createTable('task_labels', (t) => {
    t.increments('id').primary();
    t.integer('taskId').unsigned().notNullable()
      .references('id')
      .inTable('tasks')
      .onDelete('CASCADE');
    t.integer('labelId').unsigned().notNullable()
      .references('id')
      .inTable('labels')
      .onDelete('CASCADE');
  });
};

export const down = async (knex) => {
  await knex.schema.dropTable('task_labels');
  await knex.schema.dropTable('labels');
};
