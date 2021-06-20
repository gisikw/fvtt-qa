const fs = require('fs');
const net = require('net');
const util = require('util');
const fetch = require('node-fetch');
const unzipper = require('unzipper');
const { exec } = require('child_process');
const mkdir = util.promisify(fs.mkdir);

async function install({ installDir, cacheDir, username, password }) {
  const { sessionId, license, latestVersion } = await getMetadataFromFoundrySite({ username, password });
  const zip = await downloadZipUnlessCached({ 
    version: latestVersion,
    cacheDir,
    sessionId
  });
  await unzipFile(zip, `${installDir}/foundryvtt`);
  await activateInstall({ installDir, license });
  return latestVersion;
}

async function getMetadataFromFoundrySite({ username, password }) {
  const { middlewareToken, csrfToken } = await getMiddlewareAndCSRFToken();
  const { sessionId, caseUsername } = await getSessionAndUsername({ middlewareToken, csrfToken, username, password });
  const { license, latestVersion } = await getLicenseAndLatestVersion({ sessionId, caseUsername });
  return { sessionId, license, latestVersion };
}

async function downloadZipUnlessCached({ version, cacheDir, sessionId }) {
  const zip = `${cacheDir}/foundryvtt-${version}.zip`;
  const url = `https://foundryvtt.com/releases/download?version=${version}&platform=linux`;
  if (fs.existsSync(zip)) return zip;
  await mkdir(cacheDir, { recursive: true });
  const res = await fetch(url, { headers: { 'Cookie': `sessionid=${sessionId}` }});
  const fileStream = fs.createWriteStream(zip);
  await new Promise((resolve, reject) => {
    res.body.pipe(fileStream);
    res.body.on('error', reject);
    fileStream.on('finish', resolve(zip));
  });
}

async function unzipFile(source, path) {
  await fs.createReadStream(source).pipe(unzipper.Extract({ path })).promise();
}

async function activateInstall({ installDir, license }) {
  await mkdir(`${installDir}/foundrydata`, { recursive: true });
  const port = await getOpenPort();
  const server = exec(
    `node resources/app/main.js --dataPath=${installDir}/foundrydata --port=${port}`, 
    { cwd: `${installDir}/foundryvtt` }
  );
  await anyResponse(`http://localhost:${port}`);
  await post(`http://localhost:${port}/license`, `action=enterKey&licenseKey=${license}`);
  await post(`http://localhost:${port}/license`, 'agree=on&accept=');
  server.kill();
}

async function getMiddlewareAndCSRFToken() {
  const resp = await fetch('https://foundryvtt.com');
  const body = await resp.text();
  const middlewareToken = body.match(/csrfmiddlewaretoken"\s+value="([^"]+)/)[1];
  const csrfToken = getCookieValue(resp, 'csrftoken');
  return { middlewareToken, csrfToken };
}

async function getSessionAndUsername({ middlewareToken, csrfToken, username, password }) {
  const resp = await fetch('https://foundryvtt.com/auth/login/', {
    method: 'POST',
    headers: { 
      'Referer': 'https://foundryvtt.com/',
      'Cookie': `csrftoken=${csrfToken}`,
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
    },
    body: 
      `csrfmiddlewaretoken=${middlewareToken}&login_username=${username}&login_password=${password}&login_redirect=%2F`,
    redirect: 'manual'
  });
  const sessionId = getCookieValue(resp, 'sessionid');
  const caseUsername = getCookieValue(resp, 'messages').match(/You are now logged in as ([^\!]+)/)[1];
  return { sessionId, caseUsername };
}

async function getLicenseAndLatestVersion({ sessionId, caseUsername }) {
  const resp = await fetch(`https://foundryvtt.com/community/${caseUsername}/licenses`, {
    headers: { 
      'Cookie': `sessionid=${sessionId}`
    }
  });
  const body = await resp.text();
  const latestVersion = body.match(/Stable Releases">[\s\n]+<option value="([^"]+)/)[1];
  const license = body.match(/<code>([^<]+)/)[1];
  return { license, latestVersion };
}

function anyResponse(url) {
  return new Promise(resolve => {
    const interval = setInterval(async () => {
      try {
        await fetch(url);
        clearInterval(interval);
        resolve();
      } catch (e) {}
    }, 500);
  });
}

function post(url, body) {
  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
    },
    body
  });
}

function getCookieValue(resp, cookie) {
  const line = resp.headers.raw()['set-cookie'].find(line => line.includes(cookie));
  return line.match(/=([^;]+)/)[1];
}

function getOpenPort() {
  return new Promise(resolve => {
    const server = net.createServer(() => {});
    server.listen(0, () => {
      const { port } = server.address();
      server.close(() => {
        resolve(port);
      });
    });
  });
}

module.exports = { install };
