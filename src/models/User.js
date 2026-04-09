import { Model } from 'objection';

export default class User extends Model {
  static get tableName() {
    return 'users';
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['firstName', 'lastName', 'email', 'passwordDigest'],
      properties: {
        id: { type: 'integer' },
        firstName: { type: 'string', minLength: 1 },
        lastName: { type: 'string', minLength: 1 },
        email: { type: 'string' },
        passwordDigest: { type: 'string' },
      },
    };
  }

  get fullName() {
    return `${this.firstName} ${this.lastName}`;
  }
}
