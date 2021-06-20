const os = require("os");
const fs = require("fs");
const FoundryQA = require("../src/index.js");

const cacheDir = os.tmpdir();
const installDir = os.tmpdir();
const username = "mock-username";
const password = "mock-password";

test("install a version not cached locally via user credentials", async () => {
  const latestVersion = await FoundryQA.Installer.install({
    username,
    password,
    cacheDir,
    installDir,
  });
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
