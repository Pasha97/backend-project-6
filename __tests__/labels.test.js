import {
  describe, beforeAll, afterAll, it, expect,
} from '@jest/globals';
import { buildApp, getTestData, prepareData } from './helpers/index.js';
import db from '../src/db.js';
import Label from '../src/models/Label.js';
import TaskStatus from '../src/models/TaskStatus.js';

describe('test labels CRUD', () => {
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
    const response = await app.inject({ method: 'GET', url: '/labels' });
    expect(response.statusCode).toBe(200);
  });

  it('new - redirect if not authenticated', async () => {
    const response = await app.inject({ method: 'GET', url: '/labels/new' });
    expect(response.statusCode).toBe(302);
  });

  it('new - accessible when authenticated', async () => {
    const cookie = await signIn();
    const response = await app.inject({ method: 'GET', url: '/labels/new', cookies: cookie });
    expect(response.statusCode).toBe(200);
  });

  it('create', async () => {
    const cookie = await signIn();
    const params = testData.labels.new;
    const response = await app.inject({
      method: 'POST',
      url: '/labels',
      payload: params,
      cookies: cookie,
    });
    expect(response.statusCode).toBe(302);
    const label = await Label.query().findOne({ name: params.name });
    expect(label).toBeDefined();
    expect(label.name).toBe(params.name);
  });

  it('create - validation error', async () => {
    const cookie = await signIn();
    const response = await app.inject({
      method: 'POST',
      url: '/labels',
      payload: { name: '' },
      cookies: cookie,
    });
    expect(response.statusCode).toBe(422);
  });

  it('create - redirect if not authenticated', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/labels',
      payload: { name: 'Test' },
    });
    expect(response.statusCode).toBe(302);
  });

  it('edit - accessible when authenticated', async () => {
    const cookie = await signIn();
    const label = await Label.query().findOne({ name: testData.labels.existing.name });
    const response = await app.inject({
      method: 'GET',
      url: `/labels/${label.id}/edit`,
      cookies: cookie,
    });
    expect(response.statusCode).toBe(200);
  });

  it('update', async () => {
    const cookie = await signIn();
    const label = await Label.query().findOne({ name: testData.labels.existing.name });
    const response = await app.inject({
      method: 'POST',
      url: `/labels/${label.id}`,
      payload: { _method: 'PATCH', name: 'updated label' },
      cookies: cookie,
    });
    expect(response.statusCode).toBe(302);
    const updated = await Label.query().findById(label.id);
    expect(updated.name).toBe('updated label');
  });

  it('update - validation error', async () => {
    const cookie = await signIn();
    const [label] = await Label.query().orderBy('id');
    const response = await app.inject({
      method: 'POST',
      url: `/labels/${label.id}`,
      payload: { _method: 'PATCH', name: '' },
      cookies: cookie,
    });
    expect(response.statusCode).toBe(422);
  });

  it('delete', async () => {
    const cookie = await signIn();
    const label = await Label.query().findOne({ name: testData.labels.new.name });
    const response = await app.inject({
      method: 'POST',
      url: `/labels/${label.id}`,
      payload: { _method: 'DELETE' },
      cookies: cookie,
    });
    expect(response.statusCode).toBe(302);
    const deleted = await Label.query().findById(label.id);
    expect(deleted).toBeUndefined();
  });

  it('cannot delete label linked to a task', async () => {
    const cookie = await signIn();

    await app.inject({
      method: 'POST',
      url: '/labels',
      payload: { name: 'linked-label' },
      cookies: cookie,
    });
    const label = await Label.query().findOne({ name: 'linked-label' });
    const status = await TaskStatus.query().findOne({ name: testData.statuses.existing.name });

    await app.inject({
      method: 'POST',
      url: '/tasks',
      payload: { name: 'Task with label', statusId: status.id, labelIds: label.id },
      cookies: cookie,
    });

    const response = await app.inject({
      method: 'POST',
      url: `/labels/${label.id}`,
      payload: { _method: 'DELETE' },
      cookies: cookie,
    });
    expect(response.statusCode).toBe(302);
    const stillExists = await Label.query().findById(label.id);
    expect(stillExists).toBeDefined();
  });

  afterAll(async () => {
    await app.close();
  });
});
