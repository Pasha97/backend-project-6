import { Model } from 'objection';

export default class TaskStatus extends Model {
  static get tableName() {
    return 'task_statuses';
  }
}
