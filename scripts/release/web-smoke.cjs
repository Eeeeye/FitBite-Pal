// Run against an isolated local API and the actual exported Web bundle.
// Install playwright-core@1.56.1 separately and set PLAYWRIGHT_CORE and CHROME_BIN.
// FITBITE_SMOKE_API is the API base (including /api). FITBITE_SMOKE_WEB is the exported app URL.
const assert = require('node:assert/strict');
const { randomUUID, randomBytes } = require('node:crypto');
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const verifyDeletionPage = require('./web-account-deletion.cjs');
const { olderMessages, verifyChat } = require('./web-chat.cjs');

function localUrl(input) {
  const url = new URL(input);
  assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname), 'Use a disposable loopback deployment');
  return url.href.replace(/\/$/, '');
}
const web = localUrl(process.env.FITBITE_SMOKE_WEB);
const api = localUrl(process.env.FITBITE_SMOKE_API);
const run = randomUUID().slice(0, 8);
const password = randomBytes(18).toString('hex');

async function request(path, data, token) {
  const response = await fetch(api + path, {
    method: data ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: data ? JSON.stringify(data) : undefined,
  });
  assert.ok(response.ok, path + ' returned ' + response.status);
  const body = await response.json();
  assert.equal(body.success, true, path + ' did not succeed');
  return body.data;
}

async function createMember(suffix) {
  const username = 'web' + run + suffix;
  await request('/auth/register', { username, email: username + '@example.test', password });
  const session = await request('/auth/login', { usernameOrEmail: username, password });
  await request('/users/' + session.userId + '/profile', {
    gender: 'Male', age: 28, height: 176, weight: 78,
    activityLevel: 'Beginner', goal: 'Lose weight', trainingDuration: 30,
  }, session.token);
  return { username, ...session };
}

async function main() {
  const members = await Promise.all([createMember('a'), createMember('b'), createMember('c')]);
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_BIN,
    headless: true, args: ['--disable-background-networking'],
  });
  const context = await browser.newContext({ locale: 'en-US', viewport: { width: 1440, height: 900 } });
  const origins = [new URL(web).origin, new URL(api).origin];
  await context.route('**/*', route => origins.includes(new URL(route.request().url()).origin)
    ? route.continue() : route.abort());
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const requests = [];
  page.on('request', r => { if (['fetch','xhr'].includes(r.resourceType())) requests.push(r.method() + ' ' + new URL(r.url()).origin + new URL(r.url()).pathname); });
  page.on('requestfailed', r => { if (['fetch','xhr'].includes(r.resourceType())) requests.push('FAILED ' + new URL(r.url()).pathname + ' ' + r.failure()?.errorText); });
  page.on('dialog', dialog => dialog.accept());
  const exact = pattern => page.getByText(pattern, { exact: true }).filter({ visible: true });
  const keys = members.slice(0, 2).map(member => '@FitBitePal:chat:v2:' + encodeURIComponent(api) + ':' + member.userId);
  const legacyKey = '@FitBitePal:chatHistory';
  const markers = ['private-a-' + run, 'private-b-' + run, 'unassigned-' + run];
  async function observe(method, path, action) {
    const response = page.waitForResponse(r => r.request().method() === method &&
      new URL(r.url()).origin === origins[1] && new URL(r.url()).pathname === '/api' + path);
    await action();
    const result = await response;
    assert.ok(result.ok(), method + ' ' + path + ' returned ' + result.status());
    return (await result.json()).data;
  }
  async function tab(label) { await exact(label).last().click(); }
  async function login(member) {
    await exact(/^(Start Now|立即开始)$/i).click();
    await page.getByPlaceholder(/Enter username or email|输入用户名或邮箱/i).fill(member.username);
    await page.getByPlaceholder(/Enter password|输入密码/i).fill(password);
    await observe('POST', '/auth/login', () => exact(/^(sign in|登录)$/i).last().click());
    await exact(/^(Stats|统计)$/i).last().waitFor();
  }
  async function openStats() {
    await tab(/^(Stats|统计)$/i);
    await page.getByLabel(/^(Edit goals|编辑目标)$/).waitFor();
  }
  async function openChat() {
    await tab(/^(Diet|饮食)$/i);
    await exact(/^(AI Diet Companion|AI饮食助手)$/i).click();
  }
  async function backFromChat() {
    await page.getByRole('button', { name: /^(Back|返回)$/ }).click();
  }
  const expectStored = async (key, exists) => {
    assert.equal(await page.evaluate(k => !!localStorage.getItem(k), key), exists);
  };
  try {
    await page.goto(web);
    // Seed local fixtures before signing in. No messages are transmitted to an AI service.
    await page.evaluate(({ allKeys, markers, history }) => allKeys.forEach((k, i) => {
      const marker = { id: 'sample-' + i, type: 'user', text: markers[i], time: '09:00' };
      localStorage.setItem(k, JSON.stringify(i === 0 ? [...history, marker] : [marker]));
    }), { allKeys: [...keys, legacyKey], markers, history: olderMessages() });
    await login(members[0]);
    await openStats();
    await page.getByLabel(/^(Edit goals|编辑目标)$/).click();
    const targets = page.getByPlaceholder(/Leave blank to clear|留空可清除/i);
    await targets.nth(0).fill('68.5');
    await targets.nth(1).fill('17');
    const goals = await observe('PATCH', '/users/' + members[0].userId + '/goals',
      () => exact(/^(Save|保存)$/i).last().click());
    assert.equal(goals.weight.start, 78);
    assert.equal(goals.weight.target, 68.5);
    assert.equal(goals.bodyFat.target, 17);
    assert.equal(goals.bodyFat.achieved, false);
    await page.reload();
    await openStats();
    await exact(/(Target|目标) 68\.5 kg/i).first().waitFor();
    await exact(/(Target|目标) 17 %/i).first().waitFor();
    console.log('PASS goals saved, baseline checked, restored after reload');

    await tab(/^(Diet|饮食)$/i);
    await exact(/^(Edit|编辑)$/i).first().click();
    await exact(/^(Add Food|添加食物)$/i).last().click();
    const meal = 'Meal-' + run;
    await page.getByPlaceholder(/Grilled Chicken Salad|烤鸡胸沙拉/i).fill(meal);
    await page.getByPlaceholder(/e\.g\., 350|例如：350/).fill('250');
    const record = await observe('POST', '/records/diet/' + members[0].userId,
      () => exact(/^(Save|保存)$/i).last().click());
    await exact(/^(Done|完成)$/i).first().click();
    const checkbox = page.getByRole('checkbox', { name: meal, exact: true });
    await observe('POST', '/completion/save', () => checkbox.click());
    assert.equal(await checkbox.getAttribute('aria-checked'), 'true');
    await page.reload();
    await tab(/^(Diet|饮食)$/i);
    await page.getByRole('checkbox', { name: meal, checked: true }).waitFor();
    await exact(/^(Edit|编辑)$/i).first().click();
    await observe('DELETE', '/records/diet/' + record.id, () =>
      page.getByLabel(new RegExp('^(Delete |删除 )' + meal + '$')).click());
    await exact(meal).first().waitFor({ state: 'hidden' });
    const day = new Date();
    const dateKey = [day.getFullYear(), String(day.getMonth() + 1).padStart(2, '0'), String(day.getDate()).padStart(2, '0')].join('-');
    const flags = await request('/completion/records?userId=' + members[0].userId + '&itemType=meal&date=' + dateKey, null, members[0].token);
    assert.ok(!flags.some(row => row.mealKey === 'record:' + record.id));
    console.log('PASS custom meal created, checked, restored after reload, removed with its completion');

    await openChat();
    await exact(markers[0]).waitFor();
    await verifyChat(page, api);
    assert.equal(await exact(markers[1]).count(), 0);
    assert.equal(await exact(markers[2]).count(), 0);
    await backFromChat();
    await tab(/^(Set|设置)$/i);
    await exact(/^(Security & Privacy|安全与隐私)$/i).first().click();
    await exact(/^(Clear my chat on this device|清除我的本机聊天)$/i).click();
    await exact(/^(Confirm removal|确认清除)$/i).click();
    await exact(/^(Selected chat history cleared\.|已清除所选聊天记录。)$/i).waitFor();
    await expectStored(keys[0], false);
    await expectStored(keys[1], true);
    await expectStored(legacyKey, true);
    await exact(/^(Remove unassigned history|清除无归属旧记录)$/i).click();
    await exact(/^(Confirm removal|确认清除)$/i).click();
    await exact(/^(Remove unassigned history|清除无归属旧记录)$/i).waitFor({ state: 'hidden' });
    await expectStored(legacyKey, false);
    await exact(/back to settings|返回设置/i).first().click();
    await exact(/^(Sign out|退出登录)$/i).click();
    await exact(/^(Start Now|立即开始)$/i).waitFor();
    assert.equal(await page.evaluate(() => sessionStorage.getItem('fitbite.session.v2')), null);
    await login(members[1]);
    await openStats();
    await exact(/^(No target set|尚未设定目标)$/i).first().waitFor();
    assert.equal(await exact(/(Target|目标) 68\.5 kg/i).count(), 0);
    await openChat();
    await exact(markers[1]).waitFor();
    assert.equal(await exact(markers[0]).count(), 0);
    console.log('PASS account and legacy chat cleanup, sign-out credential removal and second-account isolation');

    await backFromChat();
    await tab(/^(Set|设置)$/i);
    await exact(/^(Security & Privacy|安全与隐私)$/i).first().click();
    await exact(/^(Delete my account|注销我的账号)$/i).click();
    await page.getByPlaceholder(/^(Current password|当前密码)$/i).fill(password);
    await observe('DELETE', '/users/me', () => exact(/^(Confirm permanent deletion|确认永久注销)$/i).click());
    await exact(/^(Start Now|立即开始)$/i).waitFor();
    await expectStored(keys[1], false);
    assert.equal(await page.evaluate(() => sessionStorage.getItem('fitbite.session.v2')), null);
    const oldSession = await fetch(api + '/users/' + members[1].userId, {
      headers: { Authorization: 'Bearer ' + members[1].token },
    });
    assert.equal(oldSession.status, 401);
    await login(members[0]);
    await openStats();
    await exact(/(Target|目标) 68\.5 kg/i).first().waitFor();
    console.log('PASS settings account deletion, credential and chat removal, other member still accessible');
    assert.deepEqual(errors, [], 'Browser raised a runtime exception');
    await verifyDeletionPage({ browser, api, member: members[2], other: members[0], password });
  } catch (error) {
    // The test accounts contain only synthetic data. Never print cookies or session storage.
    console.error(requests.slice(-15));
    console.error((await page.locator('body').innerText()).slice(-1600));
    throw error;
  } finally {
    await browser.close();
    // Each run creates its own random members. Remove any remaining fixture.
    for (const member of members) {
      const cleanup = await fetch(api + '/users/me', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + member.token },
        body: JSON.stringify({ password }),
      });
      assert.ok(cleanup.ok || cleanup.status === 401, 'Could not remove a synthetic smoke member');
    }
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
