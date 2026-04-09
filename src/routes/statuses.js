import i18next from 'i18next';
import TaskStatus from '../models/TaskStatus.js';
import Task from '../models/Task.js';
import { requireAuth, validateName as validate } from './helpers.js';

const t = i18next.t.bind(i18next);

const statusesRoutes = async (app) => {
  app
    .get('/statuses', async (request, reply) => {
      const statuses = await TaskStatus.query().orderBy('id');
      return reply.view('statuses/index.pug', {
        statuses,
        currentUser: request.currentUser,
        flash: request.flash,
      });
    })
    .get('/statuses/new', (request, reply) => {
      if (!requireAuth(request, reply)) return null;
      return reply.view('statuses/new.pug', {
        data: {},
        currentUser: request.currentUser,
        flash: request.flash,
      });
    })
    .post('/statuses', async (request, reply) => {
      if (!requireAuth(request, reply)) return null;
      const data = request.body ?? {};
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
      request.setFlash('success', t('flash.statusCreated'));
      return reply.redirect('/statuses');
    })
    .get('/statuses/:id/edit', async (request, reply) => {
      if (!requireAuth(request, reply)) return null;
      const status = await TaskStatus.query().findById(request.params.id);
      return reply.view('statuses/edit.pug', {
        status,
        data: status,
        currentUser: request.currentUser,
        flash: request.flash,
      });
    })
    .post('/statuses/:id', async (request, reply) => {
      if (!requireAuth(request, reply)) return null;
      const { _method, ...data } = request.body ?? {};

      if (_method === 'DELETE') {
        const linked = await Task.query().where('statusId', request.params.id).first();
        if (linked) {
          request.setFlash('danger', t('flash.statusDeleteError'));
          return reply.redirect('/statuses');
        }
        await TaskStatus.query().deleteById(request.params.id);
        request.setFlash('success', t('flash.statusDeleted'));
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
        request.setFlash('success', t('flash.statusUpdated'));
        return reply.redirect('/statuses');
      }

      return reply.status(405).send('Method not allowed');
    });
};

export default statusesRoutes;
