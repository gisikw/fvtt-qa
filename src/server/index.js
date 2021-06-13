const readline = require('readline');
const unzipper = require('unzipper');
const fetch = require('node-fetch');
const fs = require('fs/promises');
const util = require('util');
const os = require('os');

async function getStatus(config) {
  return {
    isInstalled: false,
    isLicensed: false
  };
}

async function start() {
  console.log("Starting foundry server");
  // Ping until it's up
}

async function close() {
  console.log("Stopping foundry server");
}

async function install() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const question = util.promisify(rl.question).bind(rl);
  const license = await question('Please paste your software license: ');
  const url = await question('Please paste your timed url: ');
  await downloadFoundryToDir({ url, path: "~/.fvtt-qa" });
  await activateInstall({ path: "~/.fvtt-qa", license });
  rl.close();
}

async function downloadFoundryToDir({ url, path, sessionId }) {
  const installPath = `${path}/foundryvtt`;
  await fs.mkdir(installPath, { recursive: true });
  const resp = await fetch(url, { headers: { 'Cookie': `sessionid=${sessionId}` }});
  // FIXME: unzipper is failing from the s3 link - suspect it's a matter of
  // asset disposition. Save to tmp, then unzip
  // `${os.tmpdir()}/fvtt-version.zip`;
  await resp.body.pipe(unzipper.Extract({ path: installPath })).promise();
}

async function activateInstall({ path, license }) {
  // node resources/app/main.js --dataPath=whatev --port=custom
  // curl -is "localhost:30000/license" --data "action=enterKey&licenseKey=$license"
  // curl -is "localhost:30000/license" --data "agree=on&accept="
  // Save config so we can easily backup/nuke the data dir
  // kill server
}

// Necessary for CI - can be stored in GH secrets
async function installFromUserCreds(username, password) {
  const { sessionId, license, latestVersion } = await getInstallData();
  const url = `https://foundryvtt.com/releases/download?version=${latestVersion}&platform=linux`;
  await downloadFoundryToDir({ path: '~/.fvtt-qa', version: latestVersion, sessionId });
  await activateInstall({ path: "~/.fvtt-qa", license });
}

async function getInstallData() {
  const { middlewareToken, csrfToken } = await getMiddlewareAndCSRFToken();
  const { sessionId, username } = await getSessionAndUsername({ middlewareToken, csrfToken });
  const { license, latestVersion } = await getLicenseAndLatestVersion({ sessionId, username });
  return { sessionId, license, latestVersion };
}

async function getMiddlewareAndCSRFToken() {
  const resp = await fetch('https://foundryvtt.com');
  const body = await resp.text();
  const middlewareToken = body.match(/csrfmiddlewaretoken"\s+value="([^"]+)/)[1];
  const csrfToken = getCookieValue(resp, 'csrftoken');
  return { middlewareToken, csrfToken };
}

async function getSessionAndUsername({ middlewareToken, csrfToken }) {
  const resp = await fetch('https://foundryvtt.com/auth/login/', {
    method: 'POST',
    headers: { 
      'Referer': 'https://foundryvtt.com/',
      'Cookie': `csrftoken=${csrfToken}`,
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
    },
    body: 
      `csrfmiddlewaretoken=${middlewareToken}&login_username=${FOUNDRY_USERNAME}&login_password=${FOUNDRY_PASSWORD}&login_redirect=%2F`,
    redirect: 'manual'
  });
  const sessionId = getCookieValue(resp, 'sessionid');
  const username = getCookieValue(resp, 'messages').match(/You are now logged in as ([^\!]+)/)[1];
  return { sessionId, username };
}

async function getLicenseAndLatestVersion({ sessionId, username }) {
  const resp = await fetch(`https://foundryvtt.com/community/${username}/licenses`, {
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

module.exports = {
  start,
  close,
  install,
  getStatus
}
