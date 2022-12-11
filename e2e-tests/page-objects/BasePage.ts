import { type Page, type Browser, type BrowserContext } from "@playwright/test";

export type BasePageConstructor = {
  browser: Browser;
  baseUrl?: string;
};

export interface BasePageInterface {
  open: () => Promise<void>;
  init: () => Promise<void>;
}

export default class BasePage implements BasePageInterface {
  public page: Page;

  public baseUrl: string;

  public browser: Browser;

  private context: BrowserContext;

  private isInitialized: boolean;

  constructor({ browser, baseUrl }: BasePageConstructor) {
    this.isInitialized = false;
    this.baseUrl = baseUrl ?? "";
    this.browser = browser;
  }

  protected async initContext() {
    if (this.isInitialized) return;

    this.context = await this.browser.newContext();
    this.page = await this.context.newPage();

    this.isInitialized = true;
  }

  // Use to initialize the page objects here
  // as they will need to get the reference to the "page" object from Playwright
  public async init() {
    await this.initContext();
  }

  // Override this method if needed
  public async open() {
    await this.initContext();

    if (this.baseUrl) {
      await this.page.goto(this.baseUrl);
    }
  }
}
