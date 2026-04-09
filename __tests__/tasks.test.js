import {
  describe, beforeAll, afterAll, beforeEach, it, expect,
} from '@jest/globals';
import { buildApp } from './helpers/index.js';
import db from '../src/db.js';
import Task from '../src/models/Task.js';
import TaskStatus from '../src/models/TaskStatus.js';
import User from '../src/models/User.js';
import { getTestData, prepareData } from './helpers/index.js';

describe('test tasks CRUD', () => {
  let app;
  const testData = getTestData();
  let statusId;
  let creatorId;

  beforeAll(async () => {
    app = buildApp();
    await app.ready();
    await db.migrate.latest();
  });

  beforeEach(async () => {
    await prepareData();
    const status = await TaskStatus.query().findOne({ name: testData.statuses.existing.name });
    statusId = status.id;
    const creator = await User.query().findOne({ email: testData.users.existing.email });
    creatorId = creator.id;
    const other = await User.query().findOne({ email: 'other@example.com' });
    if (!other) {
      const bcrypt = await import('bcryptjs');
      await User.query().insert({
        firstName: 'Other',
        lastName: 'User',
        email: 'other@example.com',
        passwordDigest: await bcrypt.default.hash('otherpass', 10),
      });
    }
  });

  const signIn = async (
    email = testData.users.existing.email,
    password = testData.users.existing.password,
  ) => {
    const response = await app.inject({
      method: 'POST',
      url: '/session',
      payload: { email, password },
    });
    const [cookie] = response.cookies;
    return { [cookie.name]: cookie.value };
  };

  const createTask = async (cookie, overrides = {}) => {
    const data = { name: 'Test task', statusId, ...overrides };
    await app.inject({
      method: 'POST',
      url: '/tasks',
      payload: data,
      cookies: cookie,
    });
    return Task.query().findOne({ name: data.name });
  };

  it('index - public', async () => {
    const response = await app.inject({ method: 'GET', url: '/tasks' });
    expect(response.statusCode).toBe(200);
  });

  it('new - redirect if not authenticated', async () => {
    const response = await app.inject({ method: 'GET', url: '/tasks/new' });
    expect(response.statusCode).toBe(302);
  });

  it('new - accessible when authenticated', async () => {
    const cookie = await signIn();
    const response = await app.inject({ method: 'GET', url: '/tasks/new', cookies: cookie });
    expect(response.statusCode).toBe(200);
  });

  it('create - redirect if not authenticated', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/tasks',
      payload: { name: 'Test', statusId },
    });
    expect(response.statusCode).toBe(302);
  });

  it('create', async () => {
    const cookie = await signIn();
    const params = { ...testData.tasks.new, statusId };
    const response = await app.inject({
      method: 'POST',
      url: '/tasks',
      payload: params,
      cookies: cookie,
    });
    expect(response.statusCode).toBe(302);
    const task = await Task.query().findOne({ name: params.name });
    expect(task).toBeDefined();
    expect(task.name).toBe(params.name);
    expect(task.creatorId).toBe(creatorId);
  });

  it('create - validation error', async () => {
    const cookie = await signIn();
    const response = await app.inject({
      method: 'POST',
      url: '/tasks',
      payload: { name: '' },
      cookies: cookie,
    });
    expect(response.statusCode).toBe(422);
  });

  it('show', async () => {
    const cookie = await signIn();
    const task = await createTask(cookie);
    const response = await app.inject({ method: 'GET', url: `/tasks/${task.id}` });
    expect(response.statusCode).toBe(200);
  });

  it('edit - redirect if not authenticated', async () => {
    const cookie = await signIn();
    const task = await createTask(cookie);
    const response = await app.inject({ method: 'GET', url: `/tasks/${task.id}/edit` });
    expect(response.statusCode).toBe(302);
  });

  it('edit - accessible when authenticated', async () => {
    const cookie = await signIn();
    const task = await createTask(cookie);
    const response = await app.inject({
      method: 'GET',
      url: `/tasks/${task.id}/edit`,
      cookies: cookie,
    });
    expect(response.statusCode).toBe(200);
  });

  it('update', async () => {
    const cookie = await signIn();
    const task = await createTask(cookie);
    const response = await app.inject({
      method: 'POST',
      url: `/tasks/${task.id}`,
      payload: { _method: 'PATCH', name: 'Updated task', statusId },
      cookies: cookie,
    });
    expect(response.statusCode).toBe(302);
    const updated = await Task.query().findById(task.id);
    expect(updated.name).toBe('Updated task');
  });

  it('update - validation error', async () => {
    const cookie = await signIn();
    const task = await createTask(cookie);
    const response = await app.inject({
      method: 'POST',
      url: `/tasks/${task.id}`,
      payload: { _method: 'PATCH', name: '' },
      cookies: cookie,
    });
    expect(response.statusCode).toBe(422);
  });

  it('delete by creator', async () => {
    const cookie = await signIn();
    const task = await createTask(cookie);
    const response = await app.inject({
      method: 'POST',
      url: `/tasks/${task.id}`,
      payload: { _method: 'DELETE' },
      cookies: cookie,
    });
    expect(response.statusCode).toBe(302);
    const deleted = await Task.query().findById(task.id);
    expect(deleted).toBeUndefined();
  });

  it('delete by non-creator is forbidden', async () => {
    const creatorCookie = await signIn();
    const task = await createTask(creatorCookie);

    const otherCookie = await signIn('other@example.com', 'otherpass');
    const response = await app.inject({
      method: 'POST',
      url: `/tasks/${task.id}`,
      payload: { _method: 'DELETE' },
      cookies: otherCookie,
    });
    expect(response.statusCode).toBe(302);
    const stillExists = await Task.query().findById(task.id);
    expect(stillExists).toBeDefined();
  });

  it('cannot delete user linked to a task', async () => {
    const cookie = await signIn();
    await createTask(cookie);

    const user = await User.query().findOne({ email: testData.users.existing.email });
    const response = await app.inject({
      method: 'POST',
      url: `/users/${user.id}`,
      payload: { _method: 'DELETE' },
      cookies: cookie,
    });
    expect(response.statusCode).toBe(302);
    const stillExists = await User.query().findById(user.id);
    expect(stillExists).toBeDefined();
  });

  it('cannot delete status linked to a task', async () => {
    const cookie = await signIn();
    await createTask(cookie);

    const status = await TaskStatus.query().findById(statusId);
    const response = await app.inject({
      method: 'POST',
      url: `/statuses/${status.id}`,
      payload: { _method: 'DELETE' },
      cookies: cookie,
    });
    expect(response.statusCode).toBe(302);
    const stillExists = await TaskStatus.query().findById(status.id);
    expect(stillExists).toBeDefined();
  });

  afterAll(async () => {
    await app.close();
  });
});
