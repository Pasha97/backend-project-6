import i18next from 'i18next';
import Label from '../models/Label.js';
import db from '../db.js';
import { requireAuth, validateName as validate } from './helpers.js';

const t = i18next.t.bind(i18next);

const labelsRoutes = async (app) => {
  app.get('/labels', async (request, reply) => {
    const labels = await Label.query().orderBy('id');
    return reply.view('labels/index.pug', {
      labels,
      currentUser: request.currentUser,
      flash: request.flash,
    });
  });

  app.get('/labels/new', (request, reply) => {
    if (!requireAuth(request, reply)) return null;
    return reply.view('labels/new.pug', {
      errors: {},
      data: {},
      currentUser: request.currentUser,
      flash: request.flash,
    });
  });

  app.post('/labels', async (request, reply) => {
    if (!requireAuth(request, reply)) return null;
    const data = request.body?.data ?? {};
    const errors = validate(data);

    if (Object.keys(errors).length > 0) {
      return reply.status(422).view('labels/new.pug', {
        errors,
        data,
        currentUser: request.currentUser,
        flash: { type: 'danger', message: t('flash.labelCreateError') },
      });
    }

    await Label.query().insert({ name: data.name });
    // eslint-disable-next-line no-param-reassign
    request.session.flash = { type: 'success', message: t('flash.labelCreated') };
    return reply.redirect('/labels');
  });

  app.get('/labels/:id/edit', async (request, reply) => {
    if (!requireAuth(request, reply)) return null;
    const label = await Label.query().findById(request.params.id);
    return reply.view('labels/edit.pug', {
      label,
      errors: {},
      data: label,
      currentUser: request.currentUser,
      flash: request.flash,
    });
  });

  app.post('/labels/:id', async (request, reply) => {
    if (!requireAuth(request, reply)) return null;
    const { _method, data = {} } = request.body ?? {};

    if (_method === 'DELETE') {
      const linked = await db('task_labels').where('labelId', request.params.id).first();
      if (linked) {
        // eslint-disable-next-line no-param-reassign
        request.session.flash = { type: 'danger', message: t('flash.labelDeleteError') };
        return reply.redirect('/labels');
      }
      await Label.query().deleteById(request.params.id);
      // eslint-disable-next-line no-param-reassign
      request.session.flash = { type: 'success', message: t('flash.labelDeleted') };
      return reply.redirect('/labels');
    }

    if (_method === 'PATCH') {
      const errors = validate(data);
      if (Object.keys(errors).length > 0) {
        const label = await Label.query().findById(request.params.id);
        return reply.status(422).view('labels/edit.pug', {
          label,
          errors,
          data,
          currentUser: request.currentUser,
          flash: { type: 'danger', message: t('flash.labelUpdateError') },
        });
      }

      await Label.query().patchAndFetchById(request.params.id, { name: data.name });
      // eslint-disable-next-line no-param-reassign
      request.session.flash = { type: 'success', message: t('flash.labelUpdated') };
      return reply.redirect('/labels');
    }

    return reply.status(405).send('Method not allowed');
  });
};

export default labelsRoutes;
