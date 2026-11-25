const test = require('node:test');
const assert = require('node:assert/strict');
const { apiEndpoint } = require('../services/apiOrigin');

test('a released app uses HTTPS and appends /api only once', () => {
  assert.equal(apiEndpoint('https://api.example.test/v1/'), 'https://api.example.test/v1/api');
  assert.equal(apiEndpoint('https://api.example.test/api/'), 'https://api.example.test/api');
  for (const url of ['http://api.example.test', 'https://api.example.test/?token=x',
    'http://127.0.0.1:8080', 'https://user@api.example.test']) {
    assert.throws(() => apiEndpoint(url));
  }
});

test('only a loopback web preview can use an HTTP loopback backend in release mode', () => {
  assert.equal(apiEndpoint('http://127.0.0.1:29690', { pageHostname: 'localhost' }), 'http://127.0.0.1:29690/api');
  assert.throws(() => apiEndpoint('http://localhost:8080', { pageHostname: 'www.example.test' }));
  assert.throws(() => apiEndpoint('http://api.example.test', { pageHostname: 'localhost' }));
});
