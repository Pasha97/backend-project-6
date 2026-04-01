import { Model } from 'objection';

export default class Label extends Model {
  static get tableName() {
    return 'labels';
  }
}
