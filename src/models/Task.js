import { Model } from 'objection';
import User from './User.js';
import TaskStatus from './TaskStatus.js';

export default class Task extends Model {
  static get tableName() {
    return 'tasks';
  }

  static get relationMappings() {
    return {
      status: {
        relation: Model.BelongsToOneRelation,
        modelClass: TaskStatus,
        join: { from: 'tasks.statusId', to: 'task_statuses.id' },
      },
      creator: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: { from: 'tasks.creatorId', to: 'users.id' },
      },
      executor: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: { from: 'tasks.executorId', to: 'users.id' },
      },
    };
  }
}
