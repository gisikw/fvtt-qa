# FoundryVTT QA

Early-stage integration test harness for FoundryVTT modules.

## What can it do right now?

Not much yet - it can install and activate the latest Foundry version programmatically. A fair bit of the early work was around creating a mock foundryvtt.com and foundry app for testing.

```js
const FoundryQA = require('fvtt-qa');

const latestVersion = await FoundryQA.Installer.install({
  login: '<foundry username>',
  password: '<foundry password>',
  cacheDir: '$HOME',   // Save zip files to avoid multiple downloads
  installDir: '$HOME', // Installs FoundryVTT to <installDir>/foundryvtt
                       // Creates <installDir>/foundrydata for the data
});

console.log(`Installed v${latestVersion} of FoundryVTT`);
```

## Goals for this project
- Allow for automated regression testing within a Foundry instance
- Make it easy to validate module support within new versions of Foundry
- Support multiple browser test frameworks (Cypress, Selenium, DIY?)
- Manage setup and teardown of Foundry applications via configuration (e.g. "I want to test version 0.8.3 with modules x, y, and z")
- Support project-level configuration files to make baseline testing easy
- Add Github Hooks integration to allow CI regression testing against Foundry 
- Support installation via Timed URL for folks nervous about storing their credentials

## TODO
- [ ] Make license page url detection less brittle
- [X] Update Installer activation to find an open port
- [ ] Create a Config module that supports project-level .fvtt-qa.js
- [X] Update Jest to make fetch-stubbing optional
- [ ] Update Installer tests to use Config credentials when testing against real API
- [ ] Split out Installer interactions with foundryvtt.com and the local instance
