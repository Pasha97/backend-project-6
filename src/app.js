import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fastify from 'fastify';
import fastifyView from '@fastify/view';
import fastifyStatic from '@fastify/static';
import fastifyFormbody from '@fastify/formbody';
import fastifyCookie from '@fastify/cookie';
import fastifySession from '@fastify/session';
import pug from 'pug';
import i18next from 'i18next';
import { Model } from 'objection';
import Rollbar from 'rollbar';

import ru from '../locales/ru.js';
import db from './db.js';
import User from './models/User.js';
import usersRoutes from './routes/users.js';
import sessionRoutes from './routes/session.js';
import statusesRoutes from './routes/statuses.js';
import tasksRoutes from './routes/tasks.js';
import labelsRoutes from './routes/labels.js';

const appDir = path.dirname(fileURLToPath(import.meta.url));

// Parse application/x-www-form-urlencoded with bracket notation support:
// "data[firstName]=John" → { data: { firstName: 'John' } }
const parseFormBody = (str) => {
  const result = {};
  Array.from(new URLSearchParams(str).entries()).forEach(([key, value]) => {
    const match = key.match(/^(\w+)\[(\w+)\]$/);
    if (match) {
      if (!result[match[1]]) result[match[1]] = {};
      const existing = result[match[1]][match[2]];
      if (existing === undefined) {
        result[match[1]][match[2]] = value;
      } else {
        result[match[1]][match[2]] = Array.isArray(existing)
          ? [...existing, value]
          : [existing, value];
      }
    } else {
      result[key] = value;
    }
  });
  return result;
};

if (!i18next.isInitialized) {
  i18next.init({
    initImmediate: false,
    lng: 'ru',
    resources: { ru: { translation: ru } },
  });
}

const init = (app) => {
  Model.knex(db);

  if (!app.hasDecorator('objection')) {
    app.decorate('objection', { knex: db });
  }

  app.register(fastifyFormbody, { parser: parseFormBody });
  app.register(fastifyCookie);
  app.register(fastifySession, {
    secret: process.env.SESSION_SECRET ?? 'hexlet-task-manager-secret-key-32ch',
    cookie: { secure: false },
  });

  app.register(fastifyStatic, {
    root: path.join(appDir, '..', 'public'),
    prefix: '/',
  });

  app.register(fastifyView, {
    engine: { pug },
    root: path.join(appDir, '..', 'views'),
    defaultContext: {
      t: i18next.t.bind(i18next),
    },
  });

  app.addHook('preHandler', async (req) => {
    // eslint-disable-next-line no-param-reassign
    req.flash = req.session?.flash ?? {};
    // eslint-disable-next-line no-param-reassign
    if (req.session) req.session.flash = {};

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

    app.setErrorHandler((err, request, reply) => {
      rollbar.error(err, request.raw);
      reply.status(err.statusCode ?? 500).send(err);
    });
  }

  app.register(usersRoutes);
  app.register(sessionRoutes);
  app.register(statusesRoutes);
  app.register(tasksRoutes);
  app.register(labelsRoutes);

  app.get('/', (request, reply) => {
    reply.view('index.pug', {
      currentUser: request.currentUser,
      flash: request.flash,
    });
  });

  return app;
};

const buildApp = (options = {}) => {
  const app = fastify({
    ...options,
    routerOptions: { querystringParser: parseFormBody, ...options.routerOptions },
  });

  // Fastify 4 compat: allow app.listen(port, host) signature used by test helpers
  const origListen = app.listen.bind(app);
  app.listen = (portOrOptions, hostOrCallback, callback) => {
    if (typeof portOrOptions === 'number') {
      return origListen({ port: portOrOptions, host: hostOrCallback ?? '0.0.0.0' });
    }
    return origListen(portOrOptions, hostOrCallback, callback);
  };

  return init(app);
};

export { init };
export default buildApp;
