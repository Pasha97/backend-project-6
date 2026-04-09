import bcrypt from 'bcryptjs';
import i18next from 'i18next';
import User from '../models/User.js';

const t = i18next.t.bind(i18next);

const sessionRoutes = async (app) => {
  app
    .get('/session/new', (request, reply) => {
      reply.view('session/new.pug', {
        data: {},
        currentUser: request.currentUser,
        flash: request.flash,
      });
    })
    .post('/session', async (request, reply) => {
      const rawBody = request.body ?? {};
      const { _method } = rawBody;
      const data = rawBody.data ?? rawBody;

      if (_method === 'DELETE') {
        // eslint-disable-next-line no-param-reassign
        delete request.session.userId;
        request.setFlash('success', t('flash.signedOut'));
        return reply.redirect('/');
      }

      const user = await User.query().findOne({ email: data.email });
      const passwordMatch = user
        ? await bcrypt.compare(data.password ?? '', user.passwordDigest)
        : false;

      if (!user || !passwordMatch) {
        return reply.view('session/new.pug', {
          errors: { email: [t('flash.signInError')] },
          data: { email: data.email },
          currentUser: null,
          flash: { type: 'danger', message: t('flash.signInError') },
        });
      }

      // eslint-disable-next-line no-param-reassign
      request.session.userId = user.id;
      request.setFlash('success', t('flash.signedIn'));
      return reply.redirect('/');
    });
};

export default sessionRoutes;
