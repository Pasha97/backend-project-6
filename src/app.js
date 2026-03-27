import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Fastify from 'fastify';
import fastifyView from '@fastify/view';
import fastifyStatic from '@fastify/static';
import pug from 'pug';
import i18next from 'i18next';
import ru from '../locales/ru.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

i18next.init({
  initImmediate: false,
  lng: 'ru',
  resources: {
    ru: { translation: ru },
  },
});

const buildApp = (options = {}) => {
  const app = Fastify(options);

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

  app.get('/', (_request, reply) => {
    reply.view('index.pug');
  });

  return app;
};

export default buildApp;
