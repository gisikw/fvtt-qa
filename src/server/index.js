const readline = require("readline");
const unzipper = require("unzipper");
const fetch = require("node-fetch");
const fs = require("fs/promises");
const util = require("util");
const os = require("os");

async function getStatus(config) {
  return {
    isInstalled: false,
    isLicensed: false,
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
  console.log("Installing");
}

module.exports = {
  start,
  close,
  install,
  getStatus,
};
