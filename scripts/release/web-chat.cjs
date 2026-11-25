const assert = require('node:assert/strict');

function olderMessages() {
  return Array.from({ length: 60 }, (_, i) => ({
    id: 'history-' + i, type: i % 2 ? 'user' : 'ai', text: 'History turn ' + i, time: '09:00',
  }));
}

async function verifyChat(page, api) {
  const transcript = page.getByTestId('chat-history');
  const input = page.locator('textarea:visible');
  const header = page.getByRole('button', { name: /^(Back|返回)$/ });
  const previousSize = page.viewportSize();
  const chatUrl = api + '/ai/chat';
  const posts = [];
  let releaseReply;
  const pendingReply = new Promise(resolve => { releaseReply = resolve; });
  const draft = '第一行\n第二行';
  async function reply(route) {
    const { message } = route.request().postDataJSON();
    posts.push(message);
    if (message === draft) await pendingReply;
    await route.fulfill({ json: { success: true, data: 'Fixture reply for ' + message } });
  }
  const nearEnd = () => page.waitForFunction(() => {
    const el = document.querySelector('[data-testid="chat-history"]');
    return el && el.scrollHeight > el.clientHeight && el.scrollHeight - el.clientHeight - el.scrollTop < 3;
  });
  await page.route(chatUrl, reply);
  try {
    for (const width of [390, 1512]) {
      await page.setViewportSize({ width, height: 698 });
      await transcript.waitFor();
      const box = await input.boundingBox();
      assert.ok(box && box.y >= 0 && box.y + box.height <= 698, 'Composer outside the viewport at width ' + width);
    }
    // A long history should open on the newest message and scroll independently of the composer.
    await nearEnd();
    const composerY = (await input.boundingBox()).y;
    const headerY = (await header.boundingBox()).y;
    const area = await transcript.boundingBox();
    await page.mouse.move(area.x + area.width / 2, area.y + area.height / 2);
    await page.mouse.wheel(0, -850);
    await page.waitForFunction(() => {
      const el = document.querySelector('[data-testid="chat-history"]');
      return el.scrollHeight - el.clientHeight - el.scrollTop > 750;
    });
    assert.ok(Math.abs((await input.boundingBox()).y - composerY) < 2);
    assert.ok(Math.abs((await header.boundingBox()).y - headerY) < 2);

    await input.fill('   ');
    await input.press('Enter');
    await input.fill('中文候选词');
    const compositionAccepted = await input.evaluate(el => {
      el.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
      const accepted = el.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'Enter', keyCode: 229, isComposing: true, bubbles: true, cancelable: true,
      }));
      el.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: '中文候选词' }));
      return accepted;
    });
    assert.ok(compositionAccepted, 'The IME confirmation key should reach the input method');
    assert.equal(await input.inputValue(), '中文候选词');
    await input.fill('第一行');
    await input.press('Shift+Enter');
    await input.pressSequentially('第二行');
    assert.equal(await input.inputValue(), draft);
    const outgoing = page.waitForRequest(r => r.url() === chatUrl && r.method() === 'POST');
    await input.press('Enter');
    await outgoing;
    assert.equal(await input.inputValue(), '');
    await nearEnd();
    await page.mouse.move(area.x + area.width / 2, area.y + area.height / 2);
    await page.mouse.wheel(0, -950);
    await page.waitForFunction(() => {
      const el = document.querySelector('[data-testid="chat-history"]');
      return el.scrollHeight - el.clientHeight - el.scrollTop > 900;
    });
    const readingAt = await transcript.evaluate(el => el.scrollTop);
    await input.press('Enter'); // Pending response and empty composer.
    releaseReply();
    await page.getByText('Fixture reply for ' + draft, { exact: true }).waitFor({ state: 'attached' });
    await transcript.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    assert.ok(Math.abs(await transcript.evaluate(el => el.scrollTop) - readingAt) < 3, 'Reply interrupted reading history');
    await input.fill('Button message');
    await page.getByRole('button', { name: /^(Send message|发送消息)$/i }).click();
    await page.getByText('Fixture reply for Button message', { exact: true }).waitFor();
    await nearEnd();
    assert.deepEqual(posts, [draft, 'Button message']);
    console.log('PASS long chat scroll, anchored composer, Enter send, multiline and IME composition');
  } finally {
    releaseReply();
    await page.unroute(chatUrl, reply);
    await page.setViewportSize(previousSize);
  }
}

module.exports = { olderMessages, verifyChat };
