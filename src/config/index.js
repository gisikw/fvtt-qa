const path = require('path');
const findProjectRoot = require('./findProjectRoot');

const DEFAULT_CONFIG = {
  foundryUsername: '',
  foundryPassword: '',
  config: path.join(findProjectRoot(process.cwd()),'fvtt-qa.config.js')
};

const envConfig = {};
if (process.env.FOUNDRY_USERNAME) envConfig.foundryUsername = process.env.FOUNDRY_USERNAME;
if (process.env.FOUNDRY_PASSWORD) envConfig.foundryPassword = process.env.FOUNDRY_PASSWORD;

const argvConfig = 
  process.argv
    .filter(arg => arg.match(/^--[^=]+=/))
    .reduce((acc, pair) => {
      const [key, value] = pair.split('=');
      return {
        [key.slice(2)]: value,
        ...acc
      };
    }, {});

const fileConfig = require(argvConfig.config || DEFAULT_CONFIG.config);

module.exports = {
  ...DEFAULT_CONFIG,
  ...fileConfig,
  ...envConfig,
  ...argvConfig
}
