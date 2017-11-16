require('geckodriver');
const {Builder} = require('selenium-webdriver');
const firefox = require('selenium-webdriver/firefox');
const settings = require('../../../grunt/settings');
const manifest = require('../../../src/manifest');

module.exports.ADDON_FILE = `dist/update_scanner-${manifest.version}.zip`;

module.exports.buildAddonDriver = () => {
  const options = new firefox.Options();
  const firefoxBinary = settings.get('firefox', null);
  if (firefoxBinary) {
    options.setBinary(firefoxBinary);
  }

  const driver = new Builder()
    .forBrowser('firefox')
    .setFirefoxOptions(options)
    .build();

  driver.setContext(firefox.Context.CHROME);
  return driver;
};
