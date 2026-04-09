import i18next from 'i18next';
import Task from '../models/Task.js';
import TaskStatus from '../models/TaskStatus.js';
import User from '../models/User.js';
import Label from '../models/Label.js';
import { requireAuth } from './helpers.js';

const t = i18next.t.bind(i18next);

const validate = (data) => {
  const errors = {};
  if (!data.name || data.name.length < 1) {
    errors.name = ['must NOT have fewer than 1 characters'];
  }
  if (!data.statusId) {
    errors.statusId = ['required'];
  }
  return errors;
};

const normalizeIds = (val) => {
  if (!val) return [];
  const arr = Array.isArray(val) ? val : [val];
  return arr.map(Number).filter(Boolean);
};

const tasksRoutes = async (app) => {
  app
    .get('/tasks', async (request, reply) => {
      const filter = request.query ?? {};

      const [statuses, users, labels] = await Promise.all([
        TaskStatus.query().orderBy('id'),
        User.query().orderBy('id'),
        Label.query().orderBy('id'),
      ]);

      let query = Task.query()
        .withGraphFetched('[status, creator, executor, labels]')
        .orderBy('tasks.id');

      if (filter.statusId) {
        query = query.where('tasks.statusId', filter.statusId);
      }
      if (filter.executorId) {
        query = query.where('tasks.executorId', filter.executorId);
      }
      if (filter.labelId) {
        query = query.whereExists(
          Task.relatedQuery('labels').where('labels.id', filter.labelId),
        );
      }
      if (filter.isCreatorUser && request.currentUser) {
        query = query.where('tasks.creatorId', request.currentUser.id);
      }

      const tasks = await query;
      return reply.view('tasks/index.pug', {
        tasks,
        filter,
        statuses,
        users,
        labels,
        currentUser: request.currentUser,
        flash: request.flash,
      });
    })
    .get('/tasks/new', async (request, reply) => {
      if (!requireAuth(request, reply)) return null;
      const [statuses, users, labels] = await Promise.all([
        TaskStatus.query().orderBy('id'),
        User.query().orderBy('id'),
        Label.query().orderBy('id'),
      ]);
      return reply.view('tasks/new.pug', {
        data: {},
        statuses,
        users,
        labels,
        currentUser: request.currentUser,
        flash: request.flash,
      });
    })
    .post('/tasks', async (request, reply) => {
      if (!requireAuth(request, reply)) return null;
      const data = request.body ?? {};
      const errors = validate(data);

      if (Object.keys(errors).length > 0) {
        const [statuses, users, labels] = await Promise.all([
          TaskStatus.query().orderBy('id'),
          User.query().orderBy('id'),
          Label.query().orderBy('id'),
        ]);
        return reply.status(422).view('tasks/new.pug', {
          errors,
          data,
          statuses,
          users,
          labels,
          currentUser: request.currentUser,
          flash: { type: 'danger', message: t('flash.taskCreateError') },
        });
      }

      const task = await Task.query().insertAndFetch({
        name: data.name,
        description: data.description || null,
        statusId: Number(data.statusId),
        creatorId: request.currentUser.id,
        executorId: data.executorId ? Number(data.executorId) : null,
      });

      const labelIds = normalizeIds(data.labelIds);
      await Promise.all(labelIds.map((id) => task.$relatedQuery('labels').relate(id)));

      request.setFlash('success', t('flash.taskCreated'));
      return reply.redirect('/tasks');
    })
    .get('/tasks/:id', async (request, reply) => {
      const task = await Task.query()
        .findById(request.params.id)
        .withGraphFetched('[status, creator, executor, labels]');
      return reply.view('tasks/show.pug', {
        task,
        currentUser: request.currentUser,
        flash: request.flash,
      });
    })
    .get('/tasks/:id/edit', async (request, reply) => {
      if (!requireAuth(request, reply)) return null;
      const [task, statuses, users, labels] = await Promise.all([
        Task.query().findById(request.params.id).withGraphFetched('labels'),
        TaskStatus.query().orderBy('id'),
        User.query().orderBy('id'),
        Label.query().orderBy('id'),
      ]);
      return reply.view('tasks/edit.pug', {
        task,
        data: task,
        statuses,
        users,
        labels,
        currentUser: request.currentUser,
        flash: request.flash,
      });
    })
    .post('/tasks/:id', async (request, reply) => {
      if (!requireAuth(request, reply)) return null;
      const { _method, ...data } = request.body ?? {};

      if (_method === 'DELETE') {
        const task = await Task.query().findById(request.params.id);
        if (String(task.creatorId) !== String(request.currentUser.id)) {
          request.setFlash('danger', t('flash.accessDenied'));
          return reply.redirect('/tasks');
        }
        await Task.query().deleteById(request.params.id);
        request.setFlash('success', t('flash.taskDeleted'));
        return reply.redirect('/tasks');
      }

      if (_method === 'PATCH') {
        const errors = validate(data);
        if (Object.keys(errors).length > 0) {
          const [task, statuses, users, labels] = await Promise.all([
            Task.query().findById(request.params.id).withGraphFetched('labels'),
            TaskStatus.query().orderBy('id'),
            User.query().orderBy('id'),
            Label.query().orderBy('id'),
          ]);
          return reply.status(422).view('tasks/edit.pug', {
            task,
            errors,
            data,
            statuses,
            users,
            labels,
            currentUser: request.currentUser,
            flash: { type: 'danger', message: t('flash.taskUpdateError') },
          });
        }

        const task = await Task.query().patchAndFetchById(request.params.id, {
          name: data.name,
          description: data.description || null,
          statusId: Number(data.statusId),
          executorId: data.executorId ? Number(data.executorId) : null,
        });

        await task.$relatedQuery('labels').unrelate();
        const labelIds = normalizeIds(data.labelIds);
        await Promise.all(labelIds.map((id) => task.$relatedQuery('labels').relate(id)));

        request.setFlash('success', t('flash.taskUpdated'));
        return reply.redirect('/tasks');
      }

      return reply.status(405).send('Method not allowed');
    });
};

export default tasksRoutes;
