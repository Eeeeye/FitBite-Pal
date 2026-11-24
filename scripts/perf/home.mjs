// Replays the authenticated mobile read paths against a loopback FitBite instance.
import http from 'node:http';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { execFileSync } from 'node:child_process';

const [version, scenario] = process.argv.slice(2);
assert(['before', 'after'].includes(version));
assert(['home', 'chart-plan'].includes(scenario));
const port = Number(process.env.PERF_PORT || 29690);
const concurrency = Number(process.env.PERF_CLIENTS || 12);
const samples = Number(process.env.PERF_SAMPLES || 192);
const seconds = Number(process.env.PERF_SECONDS || 0);
assert(Number.isInteger(seconds) && seconds >= 0 && seconds <= 120);
assert(Number.isInteger(concurrency) && concurrency > 0 && concurrency <= 32);
assert(Number.isInteger(samples) && samples >= 32 && samples <= 2048);
const agents = Array.from({ length: concurrency }, () => new http.Agent({ keepAlive: true, maxSockets: 6 }));
let requests = 0, bytes = 0;
const errors = [];
function call(agent, path, { token, body } = {}) {
  return new Promise((resolve, reject) => {
    const headers = {};
    if (token) headers.Authorization = 'Bearer ' + token;
    if (body) headers['Content-Type'] = 'application/json';
    const req = http.request({ host: '127.0.0.1', port, path: '/api' + path, method: body ? 'POST' : 'GET', agent, headers }, res => {
      const chunks = [];
      res.on('data', chunk => { bytes += chunk.length; chunks.push(chunk); });
      res.on('error', reject);
      res.on('end', () => {
        try {
          const json = JSON.parse(Buffer.concat(chunks));
          assert.equal(res.statusCode, 200, path + ' HTTP ' + res.statusCode);
          assert.equal(json.success, true, path);
          resolve(json.data);
        } catch (error) { reject(error); }
      });
    });
    requests++;
    req.on('error', reject);
    req.setTimeout(12000, () => req.destroy(new Error('HTTP timeout')));
    req.end(body && JSON.stringify(body));
  });
}
function date(offset) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return [d.getFullYear(), String(d.getMonth()+1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
}
const accounts = [];
for (let i = 0; i < 32; i++) {
  const usernameOrEmail = 'fbperf' + String(i).padStart(3, '0');
  const result = await call(agents[i % concurrency], '/auth/login', { body: { usernameOrEmail, password: process.env.PERF_PASSWORD } });
  accounts.push({ id: result.userId, token: result.token });
}
async function journey(agent, account) {
  const get = path => call(agent, path, account);
  const user = '/users/' + account.id;
  const byUser = 'userId=' + account.id;
  const plan = day => get(user + '/training-plan?date=' + date(day));
  const done = (kind, day) => get('/completion/records?' + byUser + '&itemType=' + kind + (day == null ? '' : '&date=' + date(day)));
  const days = Array.from({length: 17}, (_, i) => i - 15);
  async function chart() {
    if (version === 'after') {
      const rows = await get('/data/calories/live?' + byUser + '&days=7&endDate=' + date(0));
      assert.equal(rows.length, 7);
      for (let i=0; i<rows.length; i++) {
        const row=rows[i];
        assert.deepEqual([row.date,row.intake,row.exerciseCalories,row.expenditure], [date(i-6),900,100,1800]);
      }
      return;
    }
    const profile = await get(user);
    assert.equal(profile.bmr, 1700);
    for (let day = -6; day <= 0; day++) {
      for (const kind of ['exercise','meal']) {
        const rows = await done(kind, day);
        const total = rows.filter(row => row.completed).reduce((sum,row) => sum + row.calories, 0);
        assert.equal(total, kind === 'meal' ? 900 : 100);
      }
    }
  }
  async function plans() {
    const results = await Promise.all((version === 'before' ? days : [0]).map(plan));
    assert(results.every(items => items.length === 3));
  }
  if (scenario === 'chart-plan') return Promise.all([chart(), plans()]);
  if (version === 'after') {
    const [profile, training, completed, history] = await Promise.all([get(user), plan(0), done('exercise',0),
      get(user + '/check-in/history?days=16')]);
    assert(profile.id === account.id && training.length === 3 && completed.length === 3 && history.length === 15);
    return;
  }
  // Initial mount, populated plans, no profile POST. Replay the timer's network work without UI sleeps.
  await Promise.all([
    done('exercise', null).then(() => done('meal', null)),
    get(user+'/check-in/history'), get('/data/weight?'+byUser+'&days=7'), chart(), get('/data/statistics?'+byUser+'&days=7'),
    get(user), plans(), get(user+'/diet-plan'), get('/records/diet/'+account.id),
    get(user), plan(0), get(user), plan(0)
  ]);
}
async function run(count, record, deadline = null) {
  const latency = [];
  let next = 0;
  await Promise.all(agents.map(async agent => {
    while (deadline == null ? next < count : performance.now() < deadline) {
      const index = next++;
      const start = performance.now();
      try { await journey(agent, accounts[index % accounts.length]); }
      catch (e) { if (!record) throw e; errors.push(e.message); }
      latency.push(performance.now()-start);
    }
  }));
  return latency;
}
function metrics() {
  if (!process.env.PERF_MYSQL || !process.env.PERF_MYSQL_CNF) return {};
  const sql = "SELECT coalesce(sum(COUNT_STAR),0) FROM performance_schema.events_statements_summary_by_digest WHERE SCHEMA_NAME='fitbite_perf' AND DIGEST_TEXT LIKE 'SELECT %'";
  const result = execFileSync(process.env.PERF_MYSQL, ['--defaults-file='+process.env.PERF_MYSQL_CNF,'-BN','-e',sql], {encoding:'utf8'});
  return { selects: Number(result.trim()) };
}
try {
  // Initialize JWT and MVC code paths before concurrent warm-up on both versions.
  await call(agents[0], "/users/" + accounts[0].id, accounts[0]);
  await journey(agents[0], accounts[0]);
  await run(64, false);
  bytes = 0; requests = 0;
  const before = metrics();
  const start = performance.now();
  const latency = await run(samples, true, seconds ? start + seconds * 1000 : null);
  const elapsed = (performance.now() - start) / 1000;
  const after = metrics();
  latency.sort((a,b) => a-b);
  const quantile = q => latency[Math.ceil(q*latency.length)-1];
  const completed = latency.length;
  console.log(JSON.stringify({version, scenario, concurrency, samples:completed, seconds, requests, bytes, errors:errors.length,
    errorSample:errors.slice(0,3), elapsed, journeysPerSecond:(completed-errors.length)/elapsed, p50:quantile(.5), p95:quantile(.95),
    p99:quantile(.99), selects:after.selects == null ? null : after.selects-before.selects}));
  if (errors.length) process.exitCode = 1;
} finally {
  for (const agent of agents) agent.destroy();
}
