import path from 'node:path';
import { fileURLToPath } from 'node:url';
import buildFastify from 'fastify';
import fp from 'fastify-plugin';
import fastifyView from '@fastify/view';
import fastifyStatic from '@fastify/static';
import fastifyFormbody from '@fastify/formbody';
import fastifyCookie from '@fastify/cookie';
import fastifySession from '@fastify/session';
import pug from 'pug';
import i18next from 'i18next';
import { Model } from 'objection';
import Rollbar from 'rollbar';
import qs from 'qs';

import ru from './locales/ru.js';
import db from './db.js';
import User from './models/User.js';
import usersRoutes from './routes/users.js';
import sessionRoutes from './routes/session.js';
import statusesRoutes from './routes/statuses.js';
import tasksRoutes from './routes/tasks.js';
import labelsRoutes from './routes/labels.js';

const appDir = path.dirname(fileURLToPath(import.meta.url));

if (!i18next.isInitialized) {
  i18next.init({
    initImmediate: false,
    lng: 'ru',
    resources: { ru: { translation: ru } },
  });
}

// eslint-disable-next-line no-unused-vars
export const app = async (fastify, _opts) => {
  Model.knex(db);

  if (!fastify.hasDecorator('objection')) {
    fastify.decorate('objection', { knex: db });
  }

  fastify.register(fastifyFormbody, { parser: qs.parse });
  fastify.register(fastifyCookie);
  fastify.register(fastifySession, {
    secret: process.env.SESSION_SECRET ?? 'hexlet-task-manager-secret-key-32ch',
    cookie: { secure: false },
  });

  fastify.register(fastifyStatic, {
    root: path.join(appDir, '..', 'public'),
    prefix: '/',
  });

  fastify.register(fastifyView, {
    engine: { pug },
    root: path.join(appDir, 'views'),
    defaultContext: {
      t: i18next.t.bind(i18next),
    },
  });

  fastify.addHook('preHandler', async (req) => {
    // eslint-disable-next-line no-param-reassign
    req.flash = req.session?.flash ?? {};
    // eslint-disable-next-line no-param-reassign
    if (req.session) req.session.flash = {};
    // eslint-disable-next-line no-param-reassign
    req.setFlash = (type, message) => { req.session.flash = { type, message }; };

    const userId = req.session?.userId;
    // eslint-disable-next-line no-param-reassign
    req.currentUser = userId ? await User.query().findById(userId) : null;
  });

  if (process.env.ROLLBAR_ACCESS_TOKEN) {
    const rollbar = new Rollbar({
      accessToken: process.env.ROLLBAR_ACCESS_TOKEN,
      environment: process.env.ROLLBAR_ENVIRONMENT ?? 'production',
      captureUncaught: true,
      captureUnhandledRejections: true,
    });

    fastify.setErrorHandler((err, request, reply) => {
      rollbar.error(err, request.raw);
      reply.status(err.statusCode ?? 500).send(err);
    });
  }

  fastify.register(usersRoutes);
  fastify.register(sessionRoutes);
  fastify.register(statusesRoutes);
  fastify.register(tasksRoutes);
  fastify.register(labelsRoutes);

  fastify.get('/', (request, reply) => {
    reply.view('index.pug', {
      currentUser: request.currentUser,
      flash: request.flash,
    });
  });

  return fastify;
};

export const plugin = fp(app);

const init = async (_externalInstance, opts = {}) => {
  const fastify = buildFastify({ logger: true, ...opts });
  await app(fastify, opts);
  return fastify;
};

export default init;