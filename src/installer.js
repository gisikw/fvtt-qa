const fs = require("fs");
const util = require("util");
const fetch = require("node-fetch");
const unzipper = require("unzipper");
const server = require("./server");

const mkdir = util.promisify(fs.mkdir);

async function install(config) {
  const { installDir, cacheDir } = config;
  const { sessionId, license, latestVersion } = await getSiteData(config);
  const zip = await downloadZipUnlessCached({
    version: latestVersion,
    cacheDir,
    sessionId,
  });
  await unzipFile(zip, `${installDir}/foundryvtt`);
  await activateInstall({ installDir, license });
  return latestVersion;
}

async function getSiteData(config) {
  const { middlewareToken, csrfToken } = await getMiddlewareAndCSRFToken();
  const { sessionId, caseUsername } = await getSessionAndUsername({
    middlewareToken,
    csrfToken,
    ...config,
  });
  const { license, latestVersion } = await getLicenseAndLatestVersion({
    sessionId,
    caseUsername,
  });
  return { sessionId, license, latestVersion };
}

async function downloadZipUnlessCached({ version, cacheDir, sessionId }) {
  const zip = `${cacheDir}/foundryvtt-${version}.zip`;
  const url = `https://foundryvtt.com/releases/download?version=${version}&platform=linux`;
  if (fs.existsSync(zip)) return zip;
  await mkdir(cacheDir, { recursive: true });
  const res = await fetch(url, {
    headers: { Cookie: `sessionid=${sessionId}` },
  });
  const fileStream = fs.createWriteStream(zip);
  return new Promise((resolve, reject) => {
    res.body.pipe(fileStream);
    res.body.on("error", () => {
      reject();
    });
    fileStream.on("finish", () => {
      resolve(zip);
    });
  });
}

async function unzipFile(source, path) {
  await fs.createReadStream(source).pipe(unzipper.Extract({ path })).promise();
}

async function activateInstall({ installDir, license }) {
  const srv = await server.start({ installDir });
  await srv.activate(license);
  await srv.stop();
}

async function getMiddlewareAndCSRFToken() {
  const resp = await fetch("https://foundryvtt.com");
  const body = await resp.text();
  const middlewareToken = body.match(
    /csrfmiddlewaretoken"\s+value="([^"]+)/
  )[1];
  const csrfToken = getCookieValue(resp, "csrftoken");
  return { middlewareToken, csrfToken };
}

async function getSessionAndUsername({
  middlewareToken,
  csrfToken,
  foundryUsername,
  foundryPassword,
}) {
  const resp = await fetch("https://foundryvtt.com/auth/login/", {
    method: "POST",
    headers: {
      Referer: "https://foundryvtt.com/",
      Cookie: `csrftoken=${csrfToken}`,
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    },
    body: `csrfmiddlewaretoken=${middlewareToken}&login_username=${foundryUsername}&login_password=${foundryPassword}&login_redirect=%2F`,
    redirect: "manual",
  });
  const sessionId = getCookieValue(resp, "sessionid");
  const caseUsername = getCookieValue(resp, "messages").match(
    /You are now logged in as ([^!]+)/
  )[1];
  return { sessionId, caseUsername };
}

async function getLicenseAndLatestVersion({ sessionId, caseUsername }) {
  const resp = await fetch(
    `https://foundryvtt.com/community/${caseUsername}/licenses`,
    {
      headers: {
        Cookie: `sessionid=${sessionId}`,
      },
    }
  );
  const body = await resp.text();
  const latestVersion = body.match(
    /Stable Releases">[\s\n]+<option value="([^"]+)/
  )[1];
  const license = body.match(/<code>([^<]+)/)[1];
  return { license, latestVersion };
}

function getCookieValue(resp, cookie) {
  const line = resp.headers.raw()["set-cookie"].find((l) => l.includes(cookie));
  return line.match(/=([^;]+)/)[1];
}

module.exports = { install };
