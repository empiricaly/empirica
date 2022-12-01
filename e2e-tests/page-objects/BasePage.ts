import { test, expect, type Page, type Browser, type BrowserContext } from '@playwright/test';
import BasePageElement from './BasePageElement';

export type BasePageConstructor = {
    browser: Browser;
    baseUrl?: string;
}

export interface BasePageInterface  {
    open: () => Promise<void>
    init: () => Promise<void>
}

export default class BasePage implements BasePageInterface {
    public page: Page;
    public baseUrl: string;
    public browser: Browser;
    private context: BrowserContext;

    constructor({ browser, baseUrl }: BasePageConstructor) {
        this.baseUrl = baseUrl ?? '';
        this.browser = browser;
    }

    protected async initContext() {
        this.context = await this.browser.newContext();
        this.page = await this.context.newPage();
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
