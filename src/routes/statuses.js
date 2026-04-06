import i18next from 'i18next';
import TaskStatus from '../models/TaskStatus.js';
import Task from '../models/Task.js';
import { requireAuth, validateName as validate } from './helpers.js';

const t = i18next.t.bind(i18next);

const statusesRoutes = async (app) => {
  app.get('/statuses', async (request, reply) => {
    const statuses = await TaskStatus.query().orderBy('id');
    return reply.view('statuses/index.pug', {
      statuses,
      currentUser: request.currentUser,
      flash: request.flash,
    });
  });

  app.get('/statuses/new', (request, reply) => {
    if (!requireAuth(request, reply)) return null;
    return reply.view('statuses/new.pug', {
      errors: {},
      data: {},
      currentUser: request.currentUser,
      flash: request.flash,
    });
  });

  app.post('/statuses', async (request, reply) => {
    if (!requireAuth(request, reply)) return null;
    const data = request.body?.data ?? {};
    const errors = validate(data);

    if (Object.keys(errors).length > 0) {
      return reply.status(422).view('statuses/new.pug', {
        errors,
        data,
        currentUser: request.currentUser,
        flash: { type: 'danger', message: t('flash.statusCreateError') },
      });
    }

    await TaskStatus.query().insert({ name: data.name });
    // eslint-disable-next-line no-param-reassign
    request.session.flash = { type: 'success', message: t('flash.statusCreated') };
    return reply.redirect('/statuses');
  });

  app.get('/statuses/:id/edit', async (request, reply) => {
    if (!requireAuth(request, reply)) return null;
    const status = await TaskStatus.query().findById(request.params.id);
    return reply.view('statuses/edit.pug', {
      status,
      errors: {},
      data: status,
      currentUser: request.currentUser,
      flash: request.flash,
    });
  });

  app.post('/statuses/:id', async (request, reply) => {
    if (!requireAuth(request, reply)) return null;
    const { _method, data = {} } = request.body ?? {};

    if (_method === 'DELETE') {
      const linked = await Task.query().where('statusId', request.params.id).first();
      if (linked) {
        // eslint-disable-next-line no-param-reassign
        request.session.flash = { type: 'danger', message: t('flash.statusDeleteError') };
        return reply.redirect('/statuses');
      }
      await TaskStatus.query().deleteById(request.params.id);
      // eslint-disable-next-line no-param-reassign
      request.session.flash = { type: 'success', message: t('flash.statusDeleted') };
      return reply.redirect('/statuses');
    }

    if (_method === 'PATCH') {
      const errors = validate(data);
      if (Object.keys(errors).length > 0) {
        const status = await TaskStatus.query().findById(request.params.id);
        return reply.status(422).view('statuses/edit.pug', {
          status,
          errors,
          data,
          currentUser: request.currentUser,
          flash: { type: 'danger', message: t('flash.statusUpdateError') },
        });
      }

      await TaskStatus.query().patchAndFetchById(request.params.id, { name: data.name });
      // eslint-disable-next-line no-param-reassign
      request.session.flash = { type: 'success', message: t('flash.statusUpdated') };
      return reply.redirect('/statuses');
    }

    return reply.status(405).send('Method not allowed');
  });
};

export default statusesRoutes;
