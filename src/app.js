import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Fastify from 'fastify';
import fastifyView from '@fastify/view';
import fastifyStatic from '@fastify/static';
import fastifyFormbody from '@fastify/formbody';
import fastifyCookie from '@fastify/cookie';
import fastifySession from '@fastify/session';
import pug from 'pug';
import i18next from 'i18next';
import { Model } from 'objection';

import ru from '../locales/ru.js';
import db from './db.js';
import User from './models/User.js';
import usersRoutes from './routes/users.js';
import sessionRoutes from './routes/session.js';
import statusesRoutes from './routes/statuses.js';
import tasksRoutes from './routes/tasks.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Parse application/x-www-form-urlencoded with bracket notation support:
// "data[firstName]=John" → { data: { firstName: 'John' } }
const parseFormBody = (str) => {
  const result = {};
  for (const [key, value] of new URLSearchParams(str).entries()) {
    const match = key.match(/^(\w+)\[(\w+)\]$/);
    if (match) {
      if (!result[match[1]]) result[match[1]] = {};
      result[match[1]][match[2]] = value;
    } else {
      result[key] = value;
    }
  }
  return result;
};


if (!i18next.isInitialized) {
  i18next.init({
    initImmediate: false,
    lng: 'ru',
    resources: { ru: { translation: ru } },
  });
}

const buildApp = (options = {}) => {
  const app = Fastify(options);

  Model.knex(db);

  app.register(fastifyFormbody, { parser: parseFormBody });
  app.register(fastifyCookie);
  app.register(fastifySession, {
    secret: process.env.SESSION_SECRET ?? 'hexlet-task-manager-secret-key-32ch',
    cookie: { secure: false },
  });

  app.register(fastifyStatic, {
    root: path.join(__dirname, '..', 'public'),
    prefix: '/',
  });

  app.register(fastifyView, {
    engine: { pug },
    root: path.join(__dirname, '..', 'views'),
    defaultContext: {
      t: i18next.t.bind(i18next),
    },
  });

  // Restore flash and current user on every request
  app.addHook('preHandler', async (request) => {
    request.flash = request.session?.flash ?? {};
    if (request.session) request.session.flash = {};

    const userId = request.session?.userId;
    request.currentUser = userId ? await User.query().findById(userId) : null;
  });

  app.register(usersRoutes);
  app.register(sessionRoutes);
  app.register(statusesRoutes);
  app.register(tasksRoutes);

  app.get('/', (request, reply) => {
    reply.view('index.pug', {
      currentUser: request.currentUser,
      flash: request.flash,
    });
  });

  return app;
};

export default buildApp;
