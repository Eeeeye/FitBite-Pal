(() => {
  'use strict';
  const copy = {
    zh: {
      title: '注销 FitBite 账号',
      scope: '确认后，FitBite 会立即删除服务中的账号、个人资料、饮食与训练计划和记录、打卡、热量及姿态会话。操作无法撤销。',
      retention: '旧计划缓存最多保留 12 小时，到期自动清除。其他设备上的本机聊天可在注销前通过「设置 → 安全与隐私」清除。',
      instructions: '请输入要注销的账号和当前密码，核对后确认。',
      'identity-label': '用户名或邮箱', 'password-label': '当前密码',
      consent: '我了解此账号及上述记录将被永久删除。', submit: '永久注销此账号', cancel: '取消',
      cancelled: '已取消。', busy: '正在验证并处理…', done: '账号已注销。',
      invalid: '账号或密码验证失败，请核对后重试。', failed: '未收到注销确认，请检查连接后重试。',
    },
    en: {
      title: 'Delete your FitBite account',
      scope: 'Confirming permanently deletes your account, profile, meal and workout plans and records, check-ins, calorie records and pose sessions from the active service immediately.',
      retention: 'Old plan caches expire within 12 hours. To erase local chats on other devices, use Settings → Security & Privacy on those devices before deletion.',
      instructions: 'Enter the account to delete and its current password, review the consequences, then confirm.',
      'identity-label': 'Username or email', 'password-label': 'Current password',
      consent: 'I understand that this account and its listed records will be permanently deleted.',
      submit: 'Permanently delete this account', cancel: 'Cancel', cancelled: 'Cancelled.', busy: 'Verifying and deleting…',
      done: 'Your account has been deleted.', invalid: 'Check your username or email and current password.',
      failed: 'Deletion was not confirmed. Check your connection and retry.',
    },
  };
  const el = id => document.getElementById(id);
  const form = el('account-form');
  let language = navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en';
  let status = '';
  let busy = false;
  function render() {
    const words = copy[language];
    document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
    document.title = words.title;
    for (const id of Object.keys(words)) {
      if (el(id)) el(id).textContent = words[id];
    }
    el('language').textContent = language === 'zh' ? 'English' : '中文';
    el('status').textContent = words[status] || '';
  }
  el('language').onclick = () => { language = language === 'zh' ? 'en' : 'zh'; render(); };
  el('cancel').onclick = () => { form.reset(); status = 'cancelled'; render(); };

  async function request(path, method, body, token) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = 'Bearer ' + token;
    const response = await fetch(path, { method, headers, body: JSON.stringify(body), credentials: 'omit',
      redirect: 'error', cache: 'no-store', mode: 'same-origin' });
    if (!response.ok) throw Object.assign(new Error('Request failed'), { status: response.status });
    const result = await response.json();
    if (!result.success) throw new Error('Request failed');
    return result.data;
  }
  function clearBrowserData(userId) {
    const server = new URL('.', location.href).href.replace(/\/$/, '');
    const owner = { server, userId };
    try {
      const saved = JSON.parse(sessionStorage.getItem('fitbite.session.v2') || 'null');
      if (saved?.server === server && saved?.userId === userId) sessionStorage.removeItem('fitbite.session.v2');
      for (const key of ['@FitBitePal:chat:v2:' + encodeURIComponent(server) + ':' + userId,
        'checkInDates_' + userId, 'weightGoal_' + userId, 'bodyFatGoal_' + userId]) localStorage.removeItem(key);
    } catch { /* Storage may be disabled on a standalone deletion page. */ }
    if (typeof BroadcastChannel === 'function') {
      const channel = new BroadcastChannel('fitbite.account-deleted.v1');
      channel.postMessage(owner);
      channel.close();
    }
  }
  form.onsubmit = async event => {
    event.preventDefault();
    if (busy || !form.reportValidity()) return;
    busy = true;
    status = 'busy';
    el('submit').disabled = el('cancel').disabled = true;
    render();
    try {
      const password = el('password').value;
      const { token, userId } = await request('./auth/login', 'POST', { usernameOrEmail: el('identity').value.trim(), password });
      await request('./users/me', 'DELETE', { password }, token);
      form.reset();
      form.hidden = true;
      status = 'done';
      clearBrowserData(userId);
    } catch (error) {
      status = [400, 401, 403].includes(error.status) ? 'invalid' : 'failed';
      el('password').value = '';
    } finally {
      busy = false;
      el('submit').disabled = el('cancel').disabled = false;
      render();
    }
  };
  render();
})();
