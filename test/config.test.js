const os = require("os");
const fs = require("fs");

let FoundryQA;
function reload() {
  jest.resetModules();
  FoundryQA = require("../src/index.js");
}

beforeEach(() => {
  delete process.env.FOUNDRY_PASSWORD;
  delete process.env.FOUNDRY_USERNAME;
  process.argv = [];
});

test("Config merges values from multiple sources", () => {
  const configFile = `${os.tmpdir()}/fvtt-qa.config.js`;
  fs.writeFileSync(
    configFile,
    'module.exports = { cacheDir: "mock-cacheDir" };'
  );
  process.env.FOUNDRY_PASSWORD = "mock-password";
  process.argv = ["--installDir=mock-installDir", `--config=${configFile}`];
  reload();

  expect(FoundryQA.Config).toMatchObject({
    config: configFile,
    foundryUsername: "",
    foundryPassword: "mock-password",
    cacheDir: "mock-cacheDir",
    installDir: "mock-installDir",
  });
});

test("Config pulls in project-level config file", () => {
  const configFile = `${__dirname}/../fvtt-qa.config.js`;
  if (!fs.existsSync(configFile)) {
    fs.writeFileSync(
      configFile,
      `
      module.exports = {
        foundryUsername: 'mock-username',
        foundryPassword: 'mock-password'
      };
    `
    );
  }
  reload();

  expect(FoundryQA.Config).toMatchObject(require(configFile));
});
