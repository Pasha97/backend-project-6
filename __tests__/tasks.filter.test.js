import {
  describe, beforeAll, afterAll, beforeEach, it, expect,
} from '@jest/globals';
import buildApp from '../src/app.js';
import db from '../src/db.js';
import Task from '../src/models/Task.js';
import TaskStatus from '../src/models/TaskStatus.js';
import User from '../src/models/User.js';
import Label from '../src/models/Label.js';
import { getTestData, prepareData } from './helpers/index.js';

describe('test tasks filter', () => {
  let app;
  const testData = getTestData();
  let statusId;
  let creatorId;
  let executorId;
  let labelId;
  let taskWithLabel;
  let taskWithExecutor;

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

    let executor = await User.query().findOne({ email: 'executor@example.com' });
    if (!executor) {
      const bcrypt = await import('bcryptjs');
      executor = await User.query().insert({
        firstName: 'Executor',
        lastName: 'User',
        email: 'executor@example.com',
        passwordDigest: await bcrypt.default.hash('execpass', 10),
      });
    }
    executorId = executor.id;

    const label = await Label.query().findOne({ name: testData.labels.existing.name });
    labelId = label.id;

    const cookie = await signIn();

    await app.inject({
      method: 'POST',
      url: '/tasks',
      payload: { data: { name: 'Task A', statusId, labelIds: labelId } },
      cookies: cookie,
    });
    taskWithLabel = await Task.query().findOne({ name: 'Task A' });

    await app.inject({
      method: 'POST',
      url: '/tasks',
      payload: { data: { name: 'Task B', statusId, executorId } },
      cookies: cookie,
    });
    taskWithExecutor = await Task.query().findOne({ name: 'Task B' });
  });

  const signIn = async (email = testData.users.existing.email, password = testData.users.existing.password) => {
    const response = await app.inject({
      method: 'POST',
      url: '/session',
      payload: { data: { email, password } },
    });
    const [cookie] = response.cookies;
    return { [cookie.name]: cookie.value };
  };

  it('no filter returns all tasks', async () => {
    const response = await app.inject({ method: 'GET', url: '/tasks' });
    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('Task A');
    expect(response.body).toContain('Task B');
  });

  it('filter by status', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/tasks?filter[statusId]=${statusId}`,
    });
    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('Task A');
    expect(response.body).toContain('Task B');
  });

  it('filter by executor', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/tasks?filter[executorId]=${executorId}`,
    });
    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('Task B');
    expect(response.body).not.toContain('Task A');
  });

  it('filter by label', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/tasks?filter[labelId]=${labelId}`,
    });
    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('Task A');
    expect(response.body).not.toContain('Task B');
  });

  it('filter isCreatorUser - shows only own tasks when logged in', async () => {
    const cookie = await signIn();
    const response = await app.inject({
      method: 'GET',
      url: '/tasks?filter[isCreatorUser]=1',
      cookies: cookie,
    });
    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('Task A');
    expect(response.body).toContain('Task B');
  });

  it('filter isCreatorUser - no effect when not logged in', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/tasks?filter[isCreatorUser]=1',
    });
    expect(response.statusCode).toBe(200);
  });

  afterAll(async () => {
    await app.close();
  });
});
