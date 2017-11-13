const {Builder, By, Key, until} = require('selenium-webdriver');
jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;

describe('Smoke', function() {
  beforeEach(function() {
    this.driver = new Builder()
      .forBrowser('firefox')
      .build();
  });

  afterEach(function() {
    this.driver.quit();
  });

  it('can control Firefox', async function() {
    this.driver.get('http://www.google.com/ncr');
    this.driver.findElement(By.name('q')).sendKeys('webdriver', Key.RETURN);
    await this.driver.wait(until.titleIs('webdriver - Google Search'));
  });
});
