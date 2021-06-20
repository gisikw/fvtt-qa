const server = require("../server");

const commands = {};

async function run(rawArguments) {
  if (!rawArguments.length || !commands[rawArguments[0]]) {
    console.log("Usage: fvtt-qa exec {command}");
    console.log("               install");
    process.exit(1);
  }
  commands[rawArguments.shift()](rawArguments);
}

commands.exec = async function (args) {
  const config = buildConfig();
  const { isInstalled, isLicensed } = server.getStatus(config);
  if (!isInstalled || !isLicensed) {
    console.log("No valid FoundryVTT server (have you tried fvtt-qa install?)");
    process.exit(1);
  }
  try {
    await server.start(config);
    child_process.spawnSync(args.pop(), args);
  } finally {
    server.close();
  }
};

commands.install = async function () {
  const config = buildConfig();
  server.install();
};

// TODO: Read from a .fvtt-qa.js file
function buildConfig() {
  return {
    version: "0.8.6",
  };
}

module.exports = {
  run,
};
