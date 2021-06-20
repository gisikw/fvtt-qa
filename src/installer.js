const fs = require('fs');
const util = require('util');
const fetch = require('node-fetch');
const unzipper = require('unzipper');
const { exec, spawn } = require('child_process');
const mkdir = util.promisify(fs.mkdir);

async function install({ installDir, cacheDir, username, password }) {
  const { sessionId, license, latestVersion } = await getInstallData({ username, password });
  const name = `foundryvtt-${latestVersion}.zip`;
  if (!fs.existsSync(`${cacheDir}/${name}`)) {
    await downloadZip({
      url: `https://foundryvtt.com/releases/download?version=${latestVersion}&platform=linux`,
      path: cacheDir,
      sessionId,
      name,
    });
  }
  await fs.createReadStream(`${cacheDir}/${name}`).pipe(unzipper.Extract({ path: `${installDir}/foundryvtt` })).promise();
  await activateInstall({ installDir, license });
  return latestVersion;
}

async function getInstallData({ username, password }) {
  const { middlewareToken, csrfToken } = await getMiddlewareAndCSRFToken();
  const { sessionId, caseUsername } = await getSessionAndUsername({ middlewareToken, csrfToken, username, password });
  const { license, latestVersion } = await getLicenseAndLatestVersion({ sessionId, caseUsername });
  return { sessionId, license, latestVersion };
}

async function downloadZip({ url, name, path, sessionId }) {
  await mkdir(path, { recursive: true });
  const res = await fetch(url, { headers: { 'Cookie': `sessionid=${sessionId}` }});
  const fileStream = fs.createWriteStream(`${path}/${name}`);
  await new Promise((resolve, reject) => {
    res.body.pipe(fileStream);
    res.body.on('error', reject);
    fileStream.on('finish', resolve);
  });
}

async function activateInstall({ installDir, license }) {
  await mkdir(`${installDir}/foundrydata`, { recursive: true });
  const port = 30000 // FIXME: Find an available port
  const server = exec(`node resources/app/main.js --dataPath=${installDir}/foundrydata --port=${port}`, { 
    cwd: `${installDir}/foundryvtt`,
  });
  await new Promise(resolve => {
    const interval = setInterval(async () => {
      try {
        await fetch(`http://localhost:${port}`);
        clearInterval(interval);
        resolve();
      } catch (e) {}
    }, 500);
  });
  await fetch('http://localhost:30000/license', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
    },
    body: `action=enterKey&licenseKey=${license}`,
  });
  await fetch('http://localhost:30000/license', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
    },
    body: `agree=on&accept=`,
  });
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

function getCookieValue(resp, cookie) {
  const line = resp.headers.raw()['set-cookie'].find(line => line.includes(cookie));
  return line.match(/=([^;]+)/)[1];
}

module.exports = { install };
