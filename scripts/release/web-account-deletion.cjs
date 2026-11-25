const assert = require('node:assert/strict');

// The release smoke supplies two newly registered members and a loopback API.
module.exports = async function verifyDeletionPage({ browser, api, member, other, password }) {
  const origin = new URL(api).origin;
  const context = await browser.newContext({ locale: 'zh-CN', viewport: { width: 1440, height: 900 } });
  const profileStatus = async account => {
    const response = await fetch(api + '/users/' + account.userId, {
      headers: { Authorization: 'Bearer ' + account.token },
    });
    return response.status;
  };
  const loginStatus = async account => {
    const response = await fetch(api + '/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usernameOrEmail: account.username, password }),
    });
    return response.status;
  };
  const keysFor = account => [
    '@FitBitePal:chat:v2:' + encodeURIComponent(api) + ':' + account.userId,
    'checkInDates_' + account.userId, 'weightGoal_' + account.userId, 'bodyFatGoal_' + account.userId,
  ];
  try {
    await context.route('**/*', route => new URL(route.request().url()).origin === origin
      ? route.continue() : route.abort());
    const page = await context.newPage();
    page.setDefaultTimeout(10000);
    const writes = [];
    const errors = [];
    page.on('request', request => {
      if (request.method() !== 'GET') writes.push(request.method() + ' ' + request.url());
    });
    page.on('pageerror', error => errors.push(error.message));
    const load = await page.goto(api + '/account-deletion.html');
    assert.equal(load.status(), 200);
    await page.getByRole('heading', { name: '注销 FitBite 账号' }).waitFor();
    await page.getByRole('button', { name: 'English' }).click();
    await page.getByRole('heading', { name: 'Delete your FitBite account' }).waitFor();

    const identity = page.getByLabel('Username or email');
    const currentPassword = page.getByLabel('Current password');
    const consent = page.getByRole('checkbox');
    const submit = page.getByRole('button', { name: 'Permanently delete this account' });
    async function fill(value) {
      await identity.fill(member.username);
      await currentPassword.fill(value);
      await consent.check();
    }
    await fill(password);
    await page.getByRole('button', { name: 'Cancel' }).click();
    await page.getByText('Cancelled.', { exact: true }).waitFor();
    assert.equal(await identity.inputValue(), '');
    assert.equal(await currentPassword.inputValue(), '');
    assert.equal(await consent.isChecked(), false);
    assert.deepEqual(writes, []);
    assert.equal(await profileStatus(member), 200);

    await fill(password + '-wrong');
    await submit.click();
    await page.getByText('Check your username or email and current password.').waitFor();
    const login = 'POST ' + api + '/auth/login';
    assert.deepEqual(writes, [login]);
    assert.equal(await currentPassword.inputValue(), '');
    assert.equal(await profileStatus(member), 200);
    console.log('PASS bilingual deletion page, cancellation and incorrect password keep the account active');

    const own = keysFor(member);
    const control = keysFor(other);
    const sessionKey = 'fitbite.session.v2';
    await page.evaluate(({ keys, server, userId, sessionKey }) => {
      for (const key of keys) localStorage.setItem(key, 'fixture');
      sessionStorage.setItem(sessionKey, JSON.stringify({ server, userId }));
    }, { keys: [...own, ...control], server: api, userId: member.userId, sessionKey });
    await fill(password);
    const deletion = page.waitForResponse(r => r.url() === api + '/users/me' && r.request().method() === 'DELETE');
    await submit.click();
    assert.equal((await deletion).status(), 200);
    await page.getByText('Your account has been deleted.').waitFor();
    assert.deepEqual(writes, [login, login, 'DELETE ' + api + '/users/me']);
    assert.equal(await submit.isVisible(), false);
    const stored = await page.evaluate(({ own, control, sessionKey }) => ({
      session: sessionStorage.getItem(sessionKey),
      removed: own.every(key => localStorage.getItem(key) === null),
      retained: control.every(key => localStorage.getItem(key) === 'fixture'),
    }), { own, control, sessionKey });
    assert.deepEqual(stored, { session: null, removed: true, retained: true });
    assert.equal(await profileStatus(member), 401);
    assert.ok([400, 401, 403].includes(await loginStatus(member)));
    assert.equal(await profileStatus(other), 200);
    assert.equal(await loginStatus(other), 200);
    assert.deepEqual(errors, []);
    console.log('PASS confirmed webpage deletion, old token and login rejected, control member and data retained');
  } finally {
    await context.close();
  }
};
