import i18next from 'i18next';

const t = i18next.t.bind(i18next);

export const requireAuth = (request, reply) => {
  if (!request.currentUser) {
    request.setFlash('danger', t('flash.accessDenied'));
    reply.redirect('/');
    return false;
  }
  return true;
};

export const validateName = (data) => {
  const errors = {};
  if (!data.name || data.name.length < 1) {
    errors.name = ['must NOT have fewer than 1 characters'];
  }
  return errors;
};
