const key = 'fitbite.session.v2';

export default {
  get: () => window.sessionStorage.getItem(key),
  set: value => window.sessionStorage.setItem(key, value),
  remove: () => window.sessionStorage.removeItem(key),
};
