const archiver = require('archiver');
const handlers = [];
jest.mock('node-fetch', () => (url, opts) => {
  const handler = handlers.find(([pattern]) => pattern.test(url));
  if (handler) return handler[1](url, opts);
  throw `No mock for url: ${url}`;
});
const realFetch = jest.requireActual('node-fetch');

handlers.push([/^https:\/\/foundryvtt.com$/, () => ({
  text: () => `
    <input type="hidden" name="csrfmiddlewaretoken" value="mock-csrfmiddlewaretoken">
  `,
  headers: {
    raw: () => ({
      'set-cookie': ['csrftoken=mock-csrftoken']
    })
  }
})]);

handlers.push([/auth\/login/, () => ({
  headers: {
    raw: () => ({
      'set-cookie': [
        'sessionid=mock-sessionid',
        'messages=You are now logged in as mock-username!'
      ],
    })
  }
})]);

handlers.push([/community\/mock-username\/licenses/, () => ({
  text: () => `
    <optgroup label="Stable Releases">
      <option value="9.9.9">9.9.9</option>
    </optgroup>
    <pre class="license-key"><code>mock-license</code></pre>
  `
})]);

handlers.push([/download\?version=9\.9\.9/, () => {
  const archive = archiver('zip');
  archive.directory(__dirname + '/mockFoundry/', false);
  archive.finalize();
  return { body: archive };
}]);

handlers.push([/localhost/, realFetch]);
