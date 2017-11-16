require('geckodriver');
const {Builder, By, until} = require('selenium-webdriver');
const firefox = require('selenium-webdriver/firefox');
const firefoxBinary = require('./helpers/firefox_binary');

jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;

describe('Popup', function() {
  beforeEach(function() {
    const options = new firefox.Options();

    if (firefoxBinary) {
      options.setBinary(firefoxBinary);
    }

    this.driver = new Builder()
      .forBrowser('firefox')
      .setFirefoxOptions(options)
      .build();

    this.driver.setContext(firefox.Context.CHROME);
  });

  afterEach(function() {
    this.driver.quit();
  });

  it('should have a toolbar button', async function() {
    await this.driver.installAddon('dist/update_scanner-4.0.0.zip', true);
    const button = await this.driver.wait(until.elementLocated(
      By.id('_c07d1a49-9894-49ff-a594-38960ede8fb9_-browser-action')));

    expect(await button.getAttribute('tooltiptext')).toEqual('Update Scanner');
  });
});
