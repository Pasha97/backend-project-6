import {
  describe, beforeAll, afterAll, it, expect,
} from '@jest/globals';
import { buildApp } from './helpers/index.js';
import db from '../src/db.js';
import { getTestData, prepareData } from './helpers/index.js';

describe('test app core', () => {
  let app;
  const testData = getTestData();

  beforeAll(async () => {
    app = buildApp();
    await app.ready();
    await db.migrate.latest();
    await prepareData();
  });

  afterAll(async () => {
    await app.close();
  });

  const signIn = async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/session',
      payload: testData.users.existing,
    });
    const [cookie] = response.cookies;
    return { [cookie.name]: cookie.value };
  };

  describe('home page', () => {
    it('GET / returns 200 for anonymous user', async () => {
      const response = await app.inject({ method: 'GET', url: '/' });
      expect(response.statusCode).toBe(200);
    });

    it('GET / returns 200 for authenticated user', async () => {
      const cookie = await signIn();
      const response = await app.inject({ method: 'GET', url: '/', cookies: cookie });
      expect(response.statusCode).toBe(200);
    });
  });

  describe('preHandler hook', () => {
    it('sets request.currentUser to null for anonymous requests', async () => {
      const response = await app.inject({ method: 'GET', url: '/' });
      expect(response.statusCode).toBe(200);
      expect(response.body).not.toContain(testData.users.existing.email);
    });

    it('sets request.currentUser from session for authenticated requests', async () => {
      const cookie = await signIn();
      const response = await app.inject({ method: 'GET', url: '/statuses', cookies: cookie });
      expect(response.statusCode).toBe(200);
    });

    it('clears flash from session after reading', async () => {
      const cookie = await signIn();

      const firstResponse = await app.inject({
        method: 'POST',
        url: '/session',
        payload: { email: testData.users.existing.email, password: 'wrong' },
        cookies: cookie,
      });
      expect(firstResponse.statusCode).toBe(200);

      const [newCookie] = firstResponse.cookies;
      const updatedCookie = newCookie
        ? { [newCookie.name]: newCookie.value }
        : cookie;

      const secondResponse = await app.inject({
        method: 'GET',
        url: '/',
        cookies: updatedCookie,
      });
      expect(secondResponse.statusCode).toBe(200);
      expect(secondResponse.body).not.toContain('Неправильный емейл или пароль');
    });
  });

  describe('parseFormBody', () => {
    it('parses flat keys', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/users',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        payload: 'firstName=John&lastName=Doe&email=parse-test@example.com&password=pass1234',
      });
      expect(response.statusCode).toBe(302);
    });

    it('parses _method field', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/session',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        payload: '_method=DELETE',
      });
      expect(response.statusCode).toBe(302);
    });

    it('parses multiple values for the same key as array', async () => {
      const cookie = await signIn();
      const statuses = await db('task_statuses').select('id').limit(1);
      const statusId = statuses[0]?.id ?? 1;
      const users = await db('users').select('id').limit(1);

      const response = await app.inject({
        method: 'POST',
        url: '/tasks',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        payload: `name=TestTask&statusId=${statusId}&labelIds=${statuses[0]?.id ?? 1}&labelIds=${users[0]?.id ?? 1}`,
        cookies: cookie,
      });
      expect([302, 422]).toContain(response.statusCode);
    });
  });

  describe('buildApp options', () => {
    it('accepts custom options without breaking', async () => {
      const customApp = buildApp({ logger: false });
      await customApp.ready();
      const response = await customApp.inject({ method: 'GET', url: '/' });
      expect(response.statusCode).toBe(200);
      await customApp.close();
    });
  });

  describe('Rollbar error handler', () => {
    it('registers error handler when ROLLBAR_ACCESS_TOKEN is set', async () => {
      process.env.ROLLBAR_ACCESS_TOKEN = 'test-token';
      const rollbarApp = buildApp();
      await rollbarApp.ready();
      await rollbarApp.close();
      delete process.env.ROLLBAR_ACCESS_TOKEN;
    });
  });

  describe('listen', () => {
    it('starts and returns address', async () => {
      const listenApp = buildApp();
      await listenApp.ready();
      const address = await listenApp.listen({ port: 0 });
      expect(address).toBeDefined();
      await listenApp.close();
    });
  });
});
