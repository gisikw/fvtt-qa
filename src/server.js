const net = require("net");
const fetch = require("node-fetch");
const { exec } = require("child_process");

async function start(config) {
  const { installDir } = config;
  const port = config.port || (await getOpenPort());
  const url = `http://localhost:${port}`;

  const server = exec(
    `node resources/app/main.js --dataPath=${installDir}/foundrydata --port=${port}`,
    { cwd: `${installDir}/foundryvtt` }
  );
  await serverState(url, true);

  async function stop() {
    server.kill();
    await serverState(url, false);
  }

  async function activate(license) {
    await post(url, `action=enterKey&licenseKey=${license}`);
    await post(url, "agree=on&accept=");
  }

  return {
    url,
    stop,
    activate,
  };
}

function post(url, body) {
  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    },
    body,
  });
}

function serverState(url, targetState) {
  return new Promise((resolve) => {
    const interval = setInterval(async () => {
      try {
        await fetch(url);
        if (targetState) {
          clearInterval(interval);
          resolve();
        }
      } catch (e) {
        if (!targetState) {
          clearInterval(interval);
          resolve();
        }
      }
    }, 500);
  });
}

function getOpenPort() {
  return new Promise((resolve) => {
    const server = net.createServer(() => {});
    server.listen(0, () => {
      const { port } = server.address();
      server.close(() => {
        resolve(port);
      });
    });
  });
}

module.exports = {
  start,
};
