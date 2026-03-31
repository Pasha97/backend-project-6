import i18next from 'i18next';
import TaskStatus from '../models/TaskStatus.js';

const t = i18next.t.bind(i18next);

const validate = (data) => {
  const errors = {};
  if (!data.name || data.name.length < 1) {
    errors.name = ['must NOT have fewer than 1 characters'];
  }
  return errors;
};

const requireAuth = (request, reply) => {
  if (!request.currentUser) {
    request.session.flash = { type: 'danger', message: t('flash.accessDenied') };
    reply.redirect('/');
    return false;
  }
  return true;
};

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
    if (!requireAuth(request, reply)) return;
    return reply.view('statuses/new.pug', {
      errors: {},
      data: {},
      currentUser: request.currentUser,
      flash: request.flash,
    });
  });

  app.post('/statuses', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
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
    request.session.flash = { type: 'success', message: t('flash.statusCreated') };
    return reply.redirect('/statuses');
  });

  app.get('/statuses/:id/edit', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
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
    if (!requireAuth(request, reply)) return;
    const { _method, data = {} } = request.body ?? {};

    if (_method === 'DELETE') {
      await TaskStatus.query().deleteById(request.params.id);
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
      request.session.flash = { type: 'success', message: t('flash.statusUpdated') };
      return reply.redirect('/statuses');
    }

    return reply.status(405).send('Method not allowed');
  });
};

export default statusesRoutes;
