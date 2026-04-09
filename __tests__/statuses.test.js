import {
  describe, beforeAll, afterAll, it, expect,
} from '@jest/globals';
import { buildApp } from './helpers/index.js';
import db from '../src/db.js';
import TaskStatus from '../src/models/TaskStatus.js';
import { getTestData, prepareData } from './helpers/index.js';

describe('test statuses CRUD', () => {
  let app;
  const testData = getTestData();

  beforeAll(async () => {
    app = buildApp();
    await app.ready();
    await db.migrate.latest();
    await prepareData();
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

  it('index', async () => {
    const response = await app.inject({ method: 'GET', url: '/statuses' });
    expect(response.statusCode).toBe(200);
  });

  it('new - redirect if not authenticated', async () => {
    const response = await app.inject({ method: 'GET', url: '/statuses/new' });
    expect(response.statusCode).toBe(302);
  });

  it('new - accessible when authenticated', async () => {
    const cookie = await signIn();
    const response = await app.inject({ method: 'GET', url: '/statuses/new', cookies: cookie });
    expect(response.statusCode).toBe(200);
  });

  it('create', async () => {
    const cookie = await signIn();
    const params = testData.statuses.new;
    const response = await app.inject({
      method: 'POST',
      url: '/statuses',
      payload: params,
      cookies: cookie,
    });
    expect(response.statusCode).toBe(302);
    const status = await TaskStatus.query().findOne({ name: params.name });
    expect(status).toBeDefined();
    expect(status.name).toBe(params.name);
  });

  it('create - validation error', async () => {
    const cookie = await signIn();
    const response = await app.inject({
      method: 'POST',
      url: '/statuses',
      payload: { name: '' },
      cookies: cookie,
    });
    expect(response.statusCode).toBe(422);
  });

  it('create - redirect if not authenticated', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/statuses',
      payload: { name: 'Test' },
    });
    expect(response.statusCode).toBe(302);
  });

  it('edit - accessible when authenticated', async () => {
    const cookie = await signIn();
    const status = await TaskStatus.query().findOne({ name: testData.statuses.existing.name });
    const response = await app.inject({
      method: 'GET',
      url: `/statuses/${status.id}/edit`,
      cookies: cookie,
    });
    expect(response.statusCode).toBe(200);
  });

  it('update', async () => {
    const cookie = await signIn();
    const status = await TaskStatus.query().findOne({ name: testData.statuses.existing.name });
    const response = await app.inject({
      method: 'POST',
      url: `/statuses/${status.id}`,
      payload: { _method: 'PATCH', name: 'Обновлённый' },
      cookies: cookie,
    });
    expect(response.statusCode).toBe(302);
    const updated = await TaskStatus.query().findById(status.id);
    expect(updated.name).toBe('Обновлённый');
  });

  it('update - validation error', async () => {
    const cookie = await signIn();
    const [status] = await TaskStatus.query().orderBy('id');
    const response = await app.inject({
      method: 'POST',
      url: `/statuses/${status.id}`,
      payload: { _method: 'PATCH', name: '' },
      cookies: cookie,
    });
    expect(response.statusCode).toBe(422);
  });

  it('delete', async () => {
    const cookie = await signIn();
    const status = await TaskStatus.query().findOne({ name: 'В работе' });
    const response = await app.inject({
      method: 'POST',
      url: `/statuses/${status.id}`,
      payload: { _method: 'DELETE' },
      cookies: cookie,
    });
    expect(response.statusCode).toBe(302);
    const deleted = await TaskStatus.query().findById(status.id);
    expect(deleted).toBeUndefined();
  });

  afterAll(async () => {
    await app.close();
  });
});
