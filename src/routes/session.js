import bcrypt from 'bcryptjs';
import i18next from 'i18next';
import User from '../models/User.js';

const t = i18next.t.bind(i18next);

export default async (app) => {
  app.get('/session/new', (request, reply) => {
    reply.view('session/new.pug', {
      errors: {},
      data: {},
      currentUser: request.currentUser,
      flash: request.flash,
    });
  });

  app.post('/session', async (request, reply) => {
    const body = request.body ?? {};

    // eslint-disable-next-line no-underscore-dangle
    if (body._method === 'DELETE') {
      // eslint-disable-next-line no-param-reassign
      delete request.session.userId;
      // eslint-disable-next-line no-param-reassign
      request.session.flash = { type: 'success', message: t('flash.signedOut') };
      return reply.redirect('/');
    }

    const data = body.data ?? {};
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
    // eslint-disable-next-line no-param-reassign
    request.session.flash = { type: 'success', message: t('flash.signedIn') };
    return reply.redirect('/');
  });
};
