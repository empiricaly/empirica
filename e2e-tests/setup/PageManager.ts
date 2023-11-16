import { type Browser } from "@playwright/test";

import BasePage from "../page-objects/BasePage";

export default class PageManager {
  private pages: BasePage[];

  constructor() {
    this.pages = [];
  }

  // This method should accept a class that is inherited from the BasePage class and return the instance of it
  public createPage<T extends BasePage>(
    pageClass: new (...a: any[]) => T,
    { browser, baseUrl }: { browser: Browser; baseUrl?: string }
  ): T {
    // eslint-disable-next-line new-cap
    const page = new pageClass({
      browser,
      baseUrl,
    });

    this.pages.push(page);

    return page;
  }

  public async cleanup() {
    for (const page of this.pages) {
      await page.close();
    }
  }
}
