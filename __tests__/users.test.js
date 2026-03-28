import {
  describe, beforeAll, afterAll, it, expect,
} from '@jest/globals';
import buildApp from '../src/app.js';
import db from '../src/db.js';
import User from '../src/models/User.js';
import { getTestData, prepareData } from './helpers/index.js';

describe('test users CRUD', () => {
  let app;
  const testData = getTestData();

  beforeAll(async () => {
    app = buildApp();
    await app.ready();
    await db.migrate.latest();
    await prepareData();
  });

  it('index', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/users',
    });
    expect(response.statusCode).toBe(200);
  });

  it('new', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/users/new',
    });
    expect(response.statusCode).toBe(200);
  });

  it('create', async () => {
    const params = testData.users.new;
    const response = await app.inject({
      method: 'POST',
      url: '/users',
      payload: { data: params },
    });
    expect(response.statusCode).toBe(302);
    const user = await User.query().findOne({ email: params.email });
    expect(user).toBeDefined();
    expect(user.firstName).toBe(params.firstName);
    expect(user.lastName).toBe(params.lastName);
    expect(user.email).toBe(params.email);
  });

  it('create - validation error', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/users',
      payload: { data: { firstName: '', lastName: '', email: 'notanemail', password: 'x' } },
    });
    expect(response.statusCode).toBe(422);
  });

  it('edit - own profile', async () => {
    const { existing } = testData.users;
    const signIn = await app.inject({
      method: 'POST',
      url: '/session',
      payload: { data: existing },
    });
    const [sessionCookie] = signIn.cookies;
    const cookie = { [sessionCookie.name]: sessionCookie.value };

    const user = await User.query().findOne({ email: existing.email });
    const response = await app.inject({
      method: 'GET',
      url: `/users/${user.id}/edit`,
      cookies: cookie,
    });
    expect(response.statusCode).toBe(200);
  });

  it('edit - access denied for another user', async () => {
    const user = await User.query().findOne({ email: testData.users.existing.email });
    const response = await app.inject({
      method: 'GET',
      url: `/users/${user.id}/edit`,
    });
    expect(response.statusCode).toBe(302);
  });

  it('update', async () => {
    const { existing } = testData.users;
    const signIn = await app.inject({
      method: 'POST',
      url: '/session',
      payload: { data: existing },
    });
    const [sessionCookie] = signIn.cookies;
    const cookie = { [sessionCookie.name]: sessionCookie.value };

    const user = await User.query().findOne({ email: existing.email });
    const response = await app.inject({
      method: 'POST',
      url: `/users/${user.id}`,
      payload: {
        _method: 'PATCH',
        data: { firstName: 'Updated', lastName: 'Name', email: existing.email },
      },
      cookies: cookie,
    });
    expect(response.statusCode).toBe(302);
    const updated = await User.query().findById(user.id);
    expect(updated.firstName).toBe('Updated');
  });

  it('delete', async () => {
    const { existing } = testData.users;
    const signIn = await app.inject({
      method: 'POST',
      url: '/session',
      payload: { data: existing },
    });
    const [sessionCookie] = signIn.cookies;
    const cookie = { [sessionCookie.name]: sessionCookie.value };

    const user = await User.query().findOne({ email: existing.email });
    const response = await app.inject({
      method: 'POST',
      url: `/users/${user.id}`,
      payload: { _method: 'DELETE' },
      cookies: cookie,
    });
    expect(response.statusCode).toBe(302);
    const deleted = await User.query().findById(user.id);
    expect(deleted).toBeUndefined();
  });

  afterAll(async () => {
    await app.close();
  });
});
