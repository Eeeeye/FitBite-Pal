const legacyChatKey = '@FitBitePal:chatHistory';

function chatKey(server, userId) {
  if (!server || !userId) throw new Error('A signed-in chat owner is required');
  return '@FitBitePal:chat:v2:' + encodeURIComponent(server) + ':' + userId;
}

// Keep writes ordered with clears and reloads, including after a screen or account remount.
function createChatStore(storage) {
  const pending = new Map();
  function enqueue(key, operation) {
    const next = (pending.get(key) || Promise.resolve()).catch(() => {}).then(operation);
    pending.set(key, next);
    const done = () => { if (pending.get(key) === next) pending.delete(key); };
    next.then(done, done);
    return next;
  }
  return {
    read(key) {
      return enqueue(key, async () => {
        const json = await storage.getItem(key);
        if (!json) return [];
        const messages = JSON.parse(json);
        if (!Array.isArray(messages)) throw new Error('Invalid chat history');
        return messages;
      });
    },
    write: (key, messages) => enqueue(key, () => storage.setItem(key, JSON.stringify(messages))),
    clear: key => enqueue(key, () => storage.removeItem(key)),
    hasLegacy: async () => (await storage.getAllKeys()).includes(legacyChatKey),
    clearLegacy: () => storage.removeItem(legacyChatKey),
  };
}

// A single signed-in account owns this instance. A cleared or closed conversation
// rejects replies from its previous generation even if the transport finishes later.
function createChatSession(store, key) {
  let state = { messages: [], status: 'loading', sending: false };
  let revision = 0;
  let serial = 0;
  let ready = false;
  const listeners = new Set();
  function update(changes) {
    state = { ...state, ...changes };
    listeners.forEach(listener => listener());
  }
  function append(type, text, image) {
    const message = {
      id: String(Date.now()) + '-' + ++serial, type, text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    if (image) message.image = image;
    const messages = [...state.messages, message];
    update({ messages });
    return store.write(key, messages);
  }
  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    snapshot: () => state,
    async load() {
      const ticket = ++revision;
      ready = false;
      update({ status: 'loading', sending: false });
      try {
        const messages = await store.read(key);
        if (revision !== ticket) return;
        ready = true;
        update({ messages, status: 'ready' });
      } catch {
        if (revision === ticket) update({ status: 'read-error' });
      }
    },
    async send(text, image, reply) {
      if (!ready || state.sending || (!text && !image)) return false;
      const ticket = revision;
      update({ sending: true, status: 'ready' });
      try {
        await append('user', text || '(Sent an image)', image);
        if (revision !== ticket) return false;
        const answer = await reply();
        if (revision !== ticket) return false;
        await append('ai', answer);
        return true;
      } catch {
        if (revision === ticket) update({ status: 'send-error' });
        return false;
      } finally {
        if (revision === ticket) update({ sending: false });
      }
    },
    async clear() {
      const ticket = ++revision;
      ready = false;
      update({ status: 'clearing', sending: false });
      try {
        await store.clear(key);
        if (revision === ticket) {
          ready = true;
          update({ messages: [], status: 'ready' });
        }
      } catch (error) {
        if (revision === ticket) update({ status: 'read-error' });
        throw error;
      }
    },
    clearedElsewhere() {
      revision++;
      ready = true;
      update({ messages: [], status: 'ready', sending: false });
    },
    close() {
      revision++;
      ready = false;
    },
  };
}

module.exports = { chatKey, createChatSession, createChatStore };
