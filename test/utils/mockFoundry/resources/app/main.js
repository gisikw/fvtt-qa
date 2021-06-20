const http = require("http");
const util = require("util");
const fs = require("fs");

const mkdir = util.promisify(fs.mkdir);
const handlers = [];

const PORT =
  (process.argv.find((arg) => arg.match(/^--port=/)) || "").split("=")[1] ||
  30000;
const DATA_PATH = (
  process.argv.find((arg) => arg.match(/^--dataPath=/)) || ""
).split("=")[1];
const LICENSE_FILE = `${DATA_PATH}/Config/license.json`;

function server(req, res) {
  const handler = handlers.find(([pattern]) => pattern.test(req.url));
  if (handler) return handler[1](req, res);
  return res.end();
}
http.createServer(server).listen(PORT);

handlers.push([
  /license/,
  async (req, res) => {
    let stream = "";
    req.on("data", (chunk) => {
      stream += chunk;
    });
    req.on("end", () => {
      const data = parseData(stream);
      if (data.action === "enterKey") {
        writeLicense(data.licenseKey, () => res.end());
      } else if (data.accept !== undefined) {
        addSignature(() => res.end());
      } else {
        res.end();
      }
    });
  },
]);

function parseData(stream) {
  return stream.split("&").reduce((acc, pair) => {
    const [key, value] = pair.split("=");
    return {
      [key]: value,
      ...acc,
    };
  }, {});
}

async function writeLicense(license, cb) {
  await mkdir(`${DATA_PATH}/Config`, { recursive: true });
  fs.writeFile(
    LICENSE_FILE,
    JSON.stringify(
      {
        license,
      },
      null,
      2
    ),
    cb
  );
}

function addSignature(cb) {
  fs.readFile(LICENSE_FILE, "utf8", (_, data) => {
    const json = JSON.parse(data);
    fs.writeFile(
      LICENSE_FILE,
      JSON.stringify(
        {
          signature: "mock-signature",
          ...json,
        },
        null,
        2
      ),
      cb
    );
  });
}
