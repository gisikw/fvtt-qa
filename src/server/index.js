async function getStatus() {
  return {
    isInstalled: false,
    isLicensed: false,
  };
}

async function start() {
  // Ping until it's up
}

async function close() {
  // Stop the server
}

async function install() {
  // Delegate to install
}

module.exports = {
  start,
  close,
  install,
  getStatus,
};
