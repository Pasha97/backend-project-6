import { URL } from 'url';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import db from '../../src/db.js';

const getFixturePath = (filename) => path.join('..', '..', '__fixtures__', filename);
const readFixture = (filename) => fs.readFileSync(new URL(getFixturePath(filename), import.meta.url), 'utf-8').trim();
const getFixtureData = (filename) => JSON.parse(readFixture(filename));

export const getTestData = () => getFixtureData('testData.json');

export const prepareData = async () => {
  await db('task_statuses').truncate();
  await db('users').truncate();
  const users = getFixtureData('users.json');
  for (const user of users) {
    const { password, ...rest } = user;
    await db('users').insert({ ...rest, passwordDigest: await bcrypt.hash(password, 10) });
  }
  const statuses = getFixtureData('statuses.json');
  for (const status of statuses) {
    await db('task_statuses').insert(status);
  }
};
