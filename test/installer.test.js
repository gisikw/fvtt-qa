const os = require("os");
const fs = require("fs");
const FoundryQA = require("../src/index");

const config = {
  ...FoundryQA.Config,
  ...(process.env.USE_EXTERNAL_FOUNDRY
    ? {}
    : {
        cacheDir: os.tmpdir(),
        installDir: os.tmpdir(),
      }),
};

test("install a version not cached locally via user credentials", async () => {
  const { cacheDir, installDir } = config;
  const latestVersion = await FoundryQA.Installer.install(config);
  expect(
    fs.existsSync(`${cacheDir}/foundryvtt-${latestVersion}.zip`)
  ).toBeTruthy();
  expect(fs.existsSync(`${installDir}/foundryvtt`)).toBeTruthy();
  expect(fs.existsSync(`${installDir}/foundrydata`)).toBeTruthy();
  const installedVersion =
    require(`${installDir}/foundryvtt/resources/app/package.json`).version;
  expect(installedVersion).toBe(latestVersion);
  const {
    license,
    signature,
  } = require(`${installDir}/foundrydata/Config/license.json`);
  expect(license).toBeTruthy();
  expect(signature).toBeTruthy();
});

test.todo("install a version already cached locally");
