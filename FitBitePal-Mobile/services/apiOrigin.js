// Release bundles pin the API at build time. Web previews may use a loopback API on a loopback page.
const isLoopback = host => ['localhost', '127.0.0.1', '[::1]'].includes(host);

function apiEndpoint(value, { development = false, pageHostname } = {}) {
  const url = new URL(value);
  if (url.username || url.password || url.search || url.hash) {
    throw new Error('The API address must contain only a host and a path.');
  }
  if (url.protocol !== 'https:' &&
      !(url.protocol === 'http:' && (development || (isLoopback(pageHostname) && isLoopback(url.hostname))))) {
    throw new Error('The release API address must use HTTPS.');
  }
  const path = url.pathname.replace(/\/+$/, '');
  return url.origin + (path.endsWith('/api') ? path : path + '/api');
}

module.exports = { apiEndpoint };
