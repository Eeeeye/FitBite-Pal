const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createChatSession, createChatStore, chatKey } = require('../src/storage/chatHistory');
const { createSessionStore } = require('../src/storage/createSessionStore');

function memory(initial) {
  const entries = new Map(initial);
  return { entries, getItem: async key => entries.get(key) ?? null, setItem: async (k,v) => entries.set(k,v),
    removeItem: async key => entries.delete(key), multiRemove: async keys => keys.forEach(k => entries.delete(k)),
    getAllKeys: async () => [...entries.keys()] };
}
function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}

test('history is owned by server and account; unassigned history is isolated until explicitly removed', async () => {
  const storage = memory([['@FitBitePal:chatHistory', '[{"text":"unassigned"}]']]);
  const store = createChatStore(storage);
  const a = chatKey('https://one/api', 1), b = chatKey('https://one/api', 2), c = chatKey('https://two/api', 1);
  await store.write(a, [{text:'A'}]);
  await store.write(b, [{text:'B'}]);
  assert.deepEqual(await store.read(c), []);
  assert.equal(await store.hasLegacy(), true);
  await store.clear(a);
  assert.deepEqual(await store.read(a), []);
  assert.deepEqual(await store.read(b), [{text:'B'}]);
  assert.equal(await store.hasLegacy(), true);
  await store.clearLegacy();
  assert.equal(await store.hasLegacy(), false);
  assert.deepEqual(await store.read(b), [{text:'B'}]);
});

test('a clear or account switch drops late AI replies, including when another account is already active', async () => {
  for (const operation of ['clear','close']) {
    const store=createChatStore(memory());
    const key=chatKey('https://host/api',1);
    const a=createChatSession(store,key), b=createChatSession(store,chatKey('https://host/api',2));
    await a.load();
    const reply=deferred(), started=deferred();
    const sending=a.send('first account',null,()=>{ started.resolve(); return reply.promise; });
    await started.promise;
    await a[operation]();
    await b.load();
    assert.deepEqual(b.snapshot().messages, []);
    reply.resolve('late response');
    await sending;
    assert.deepEqual((await store.read(key)).map(m=>m.text), operation === 'clear' ? [] : ['first account']);
    assert.deepEqual(b.snapshot().messages, []);
  }
});

test('a delayed disk read cannot restore a cleared conversation and a new session waits for queued writes', async () => {
  const storage=memory(), key=chatKey('https://host/api',4), gate=deferred();
  storage.getItem=async()=>gate.promise;
  const store=createChatStore(storage), chat=createChatSession(store,key);
  const loading=chat.load();
  const clearing=chat.clear();
  gate.resolve('[{"text":"old"}]');
  await Promise.all([loading,clearing]);
  assert.deepEqual(chat.snapshot().messages,[]);
  const write=deferred();
  storage.setItem=async(k,v)=>{ await write.promise;storage.entries.set(k,v); };
  storage.getItem=async k=>storage.entries.get(k);
  const old=store.write(key,[{text:'previous'}]);
  const next=createChatSession(store,key);
  const fresh=next.load();
  write.resolve();
  await Promise.all([old,fresh]);
  assert.deepEqual(next.snapshot().messages,[{text:'previous'}]);
});

test('restore removes legacy plaintext, rejects leftover keychain data from another install or server, and logout wins queued writes', async () => {
  const storage=memory([['access_token','legacy'],['user_id','1'],['user_info','legacy info']]);
  let value='{"server":"A","userId":1,"token":"old"}';
  const device={get:async()=>value,set:async v=>{value=v;},remove:async()=>{value=null;}};
  const sessions=createSessionStore(storage,device);
  assert.equal(await sessions.restore('A'), null);
  assert.equal(storage.entries.has('access_token'), false);
  await sessions.save('A',2,'test-token');
  assert.deepEqual(await sessions.restore('A'), {server:'A', userId:2, token:'test-token'});
  assert.equal([...storage.entries.values()].includes('test-token'),false);
  assert.equal(await sessions.restore('B'), null);
  const writing=sessions.save('B',3,'new');
  const clearing=sessions.clear();
  await Promise.all([writing,clearing]);
  assert.equal(value,null);
});

test('removal from a second web tab cancels an active reply and leaves the conversation empty', async () => {
  const store = createChatStore(memory()), key = chatKey('https://one/api', 3);
  const session = createChatSession(store, key);
  await session.load();
  const reply = deferred(), started = deferred();
  const sending = session.send('before clear', null, () => { started.resolve(); return reply.promise; });
  await started.promise;
  await store.clear(key);
  session.clearedElsewhere();
  reply.resolve('after clear');
  await sending;
  assert.deepEqual(session.snapshot().messages, []);
  assert.deepEqual(await store.read(key), []);
});

test('damaged account history is preserved on read error and can be cleared by its owner', async () => {
  const key = chatKey('https://one/api', 4);
  const storage = memory([[key, 'damaged']]), store = createChatStore(storage);
  const session = createChatSession(store, key);
  await session.load();
  assert.equal(session.snapshot().status, 'read-error');
  assert.equal(await session.send('new message', null, async () => 'reply'), false);
  assert.equal(storage.entries.get(key), 'damaged');
  await session.clear();
  assert.equal(session.snapshot().status, 'ready');
  assert.equal(storage.entries.has(key), false);
});

test('deletion removes only the confirmed owner after server success and preserves the new session', async () => {
  const { deleteSignedInAccount } = require('../src/storage/accountDeletion');
  const storage = memory([['checkInDates_1', 'a'], ['weightGoal_1', 'a'], ['bodyFatGoal_1', 'a'], ['checkInDates_2', 'b']]);
  let clearCount = 0, signedIn = 'a', notified = 0;
  const options = {
    request: async () => { throw new Error('wrong password'); }, password: 'fixture-password', userId: 1, storage,
    removeChat: async () => { clearCount++; }, signOutIfCurrent: () => { if (signedIn === 'a') signedIn = null; },
    notifyOtherTabs: () => { notified++; },
  };
  await assert.rejects(deleteSignedInAccount(options));
  assert.equal(clearCount, 0);
  assert.equal(signedIn, 'a');
  assert.equal(storage.entries.size, 4);
  const reply = deferred();
  const deleting = deleteSignedInAccount({ ...options, request: () => reply.promise });
  signedIn = 'b';
  reply.resolve({success: true});
  assert.deepEqual(await deleting, {localDataCleared: true});
  assert.equal(clearCount, 1);
  assert.equal(signedIn, 'b');
  assert.equal(notified, 1);
  assert.deepEqual([...storage.entries.keys()], ['checkInDates_2']);
});
