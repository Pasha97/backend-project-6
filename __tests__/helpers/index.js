import { URL } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import fastify from 'fastify';
import appPlugin from '../../src/app.js';
import db from '../../src/db.js';

export const buildApp = (options = {}) => {
  const instance = fastify(options);
  instance.register(appPlugin);
  return instance;
};

const getFixturePath = (filename) => path.join('..', '..', '__fixtures__', filename);
const readFixture = (filename) => fs.readFileSync(new URL(getFixturePath(filename), import.meta.url), 'utf-8').trim();
const getFixtureData = (filename) => JSON.parse(readFixture(filename));

export const getTestData = () => getFixtureData('testData.json');

export const prepareData = async () => {
  await db('task_labels').truncate();
  await db('tasks').truncate();
  await db('task_statuses').truncate();
  await db('labels').truncate();
  await db('users').truncate();
  const users = getFixtureData('users.json');

  await Promise.all(users.map(async ({ password, ...rest }) => {
    await db('users').insert({ ...rest, passwordDigest: await bcrypt.hash(password, 10) });
  }));
  const statuses = getFixtureData('statuses.json');
  await Promise.all(statuses.map((status) => db('task_statuses').insert(status)));
  const labels = getFixtureData('labels.json');
  await Promise.all(labels.map((label) => db('labels').insert(label)));
};
