import bcrypt from 'bcryptjs';
import i18next from 'i18next';
import User from '../models/User.js';
import Task from '../models/Task.js';

const t = i18next.t.bind(i18next);

const validate = (data, isUpdate = false) => {
  const errors = {};
  if (!data.firstName || data.firstName.length < 1) {
    errors.firstName = ['must NOT have fewer than 1 characters'];
  }
  if (!data.lastName || data.lastName.length < 1) {
    errors.lastName = ['must NOT have fewer than 1 characters'];
  }
  if (!data.email?.includes('@')) {
    errors.email = ['Invalid email'];
  }
  if (!isUpdate && (!data.password || data.password.length < 3)) {
    errors.password = ['must NOT have fewer than 3 characters'];
  }
  if (isUpdate && data.password && data.password.length < 3) {
    errors.password = ['must NOT have fewer than 3 characters'];
  }
  return errors;
};

const usersRoutes = async (app) => {
  app
    .get('/users', async (request, reply) => {
      const users = await User.query().orderBy('id');
      return reply.view('users/index.pug', {
        users,
        currentUser: request.currentUser,
        flash: request.flash,
      });
    })
    .get('/users/new', (request, reply) => {
      reply.view('users/new.pug', {
        data: {},
        currentUser: request.currentUser,
        flash: request.flash,
      });
    })
    .post('/users', async (request, reply) => {
      const rawBody = request.body ?? {};
      const data = rawBody.data ?? rawBody;
      const errors = validate(data);

      if (Object.keys(errors).length > 0) {
        return reply.status(422).view('users/new.pug', {
          errors,
          data,
          currentUser: request.currentUser,
          flash: { type: 'danger', message: t('flash.createError') },
        });
      }

      try {
        const passwordDigest = await bcrypt.hash(data.password, 10);
        await User.query().insert({
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          passwordDigest,
        });
        request.setFlash('success', t('flash.userCreated'));
        return reply.redirect('/');
      } catch {
        return reply.status(422).view('users/new.pug', {
          errors: { email: ['Email already taken'] },
          data,
          currentUser: request.currentUser,
          flash: { type: 'danger', message: t('flash.createError') },
        });
      }
    })
    .get('/users/:id/edit', (request, reply) => {
      const { currentUser } = request;
      if (!currentUser || String(currentUser.id) !== request.params.id) {
        request.setFlash('danger', t('flash.accessDenied'));
        return reply.redirect('/users');
      }
      return reply.view('users/edit.pug', {
        user: currentUser,
        data: currentUser,
        currentUser,
        flash: request.flash,
      });
    })
    .post('/users/:id', async (request, reply) => {
      const { _method, ...data } = request.body ?? {};
      const { currentUser } = request;

      if (!currentUser || String(currentUser.id) !== request.params.id) {
        request.setFlash('danger', t('flash.accessDenied'));
        return reply.redirect('/users');
      }

      if (_method === 'DELETE') {
        const linked = await Task.query()
          .where('creatorId', request.params.id)
          .orWhere('executorId', request.params.id)
          .first();
        if (linked) {
          request.setFlash('danger', t('flash.userDeleteError'));
          return reply.redirect('/users');
        }
        await User.query().deleteById(request.params.id);
        // eslint-disable-next-line no-param-reassign
        delete request.session.userId;
        request.setFlash('success', t('flash.userDeleted'));
        return reply.redirect('/users');
      }

      if (_method === 'PATCH') {
        const errors = validate(data, true);
        if (Object.keys(errors).length > 0) {
          return reply.status(422).view('users/edit.pug', {
            user: currentUser,
            errors,
            data,
            currentUser,
            flash: { type: 'danger', message: t('flash.updateError') },
          });
        }

        const updates = {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
        };
        if (data.password) {
          updates.passwordDigest = await bcrypt.hash(data.password, 10);
        }

        try {
          await User.query().patchAndFetchById(request.params.id, updates);
          request.setFlash('success', t('flash.userUpdated'));
          return reply.redirect('/users');
        } catch {
          return reply.status(422).view('users/edit.pug', {
            user: currentUser,
            errors: { email: ['Email already taken'] },
            data,
            currentUser,
            flash: { type: 'danger', message: t('flash.updateError') },
          });
        }
      }

      return reply.status(405).send('Method not allowed');
    });
};

export default usersRoutes;
