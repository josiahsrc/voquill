import { browser, expect } from '@wdio/globals';

describe('Voquill desktop bootstrap', () => {
  it('renders the application shell', async () => {
    const root = await browser.$('#root');
    await root.waitForExist({ timeout: 15000 });

    const renderedChildren = await root.$$(':scope > *');
    expect(renderedChildren.length).toBeGreaterThan(0);

    const progressIndicator = await browser.$('[role="progressbar"]');
    if (await progressIndicator.isExisting()) {
      expect(await progressIndicator.isDisplayed()).toBe(true);
    }
  });
});
