const marker = '@FitBitePal:session-install-v2';

function createSessionStore(storage, device) {
  let tail = Promise.resolve();

  function sequence(operation) {
    const result = tail.then(operation);
    tail = result.catch(() => {});
    return result;
  }

  return {
    restore(server) {
      return sequence(async () => {
        // Old credentials were shared across tabs and did not record their server.
        await storage.multiRemove(['access_token', 'user_id', 'user_info']);
        if (!(await storage.getItem(marker))) {
          // iOS Keychain can survive uninstall. A fresh app install must sign in.
          await device.remove();
          await storage.setItem(marker, '1');
        }
        const value = await device.get();
        if (!value) return null;
        let saved;
        try { saved = JSON.parse(value); } catch { /* discard invalid storage below */ }
        if (saved?.server === server && Number.isSafeInteger(saved.userId) && saved.userId > 0 &&
            typeof saved.token === 'string' && saved.token) return saved;
        await device.remove();
        return null;
      });
    },
    save(server, userId, token) {
      return sequence(() => device.set(JSON.stringify({ server, userId, token })));
    },
    clear() {
      return sequence(() => device.remove());
    },
  };
}

module.exports = { createSessionStore };
