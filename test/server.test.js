const os = require("os");
const fetch = require("node-fetch");
const FoundryQA = require("../src/index");

const config = {
  ...FoundryQA.Config,
  cacheDir: os.tmpdir(),
  installDir: os.tmpdir(),
};

test("start and stop a server", async () => {
  await FoundryQA.Installer.install(config);
  const server = await FoundryQA.Server.start(config);
  await fetch(server.url);
  await server.stop();
  expect(fetch(server.url)).rejects.toThrow();
});
