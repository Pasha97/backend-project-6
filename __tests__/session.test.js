import {
  describe, beforeAll, afterAll, it, expect,
} from '@jest/globals';
import { buildApp, getTestData, prepareData } from './helpers/index.js';
import db from '../src/db.js';

describe('test session', () => {
  let app;
  const testData = getTestData();

  beforeAll(async () => {
    app = buildApp();
    await app.ready();
    await db.migrate.latest();
    await prepareData();
  });

  it('new', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/session/new',
    });
    expect(response.statusCode).toBe(200);
  });

  it('sign in with correct credentials', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/session',
      payload: testData.users.existing,
    });
    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toBe('/');
  });

  it('sign in with wrong password', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/session',
      payload: { email: testData.users.existing.email, password: 'wrongpassword' },
    });
    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('Неправильный емейл или пароль');
  });

  it('sign out', async () => {
    const signIn = await app.inject({
      method: 'POST',
      url: '/session',
      payload: testData.users.existing,
    });
    const [sessionCookie] = signIn.cookies;
    const cookie = { [sessionCookie.name]: sessionCookie.value };

    const response = await app.inject({
      method: 'POST',
      url: '/session',
      payload: { _method: 'DELETE' },
      cookies: cookie,
    });
    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toBe('/');
  });

  it('sign in with non-existent email', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/session',
      payload: { email: 'nobody@example.com', password: 'whatever' },
    });
    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('Неправильный емейл или пароль');
  });

  afterAll(async () => {
    await app.close();
  });
});
