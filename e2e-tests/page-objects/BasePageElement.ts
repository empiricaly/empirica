import { test, expect, type Page } from '@playwright/test';

export type BasePageElementConstructor = {
    page: Page;
    baseUrl?: string;
}

export default class BasePageElement {
    public page: Page;
    public baseUrl: string;

    constructor({ page, baseUrl }: BasePageElementConstructor) {
        this.baseUrl = baseUrl ?? '';
        this.page = page;
    }

    // Override this method if needed
    public async open() {
        if (this.baseUrl) {
            this.page.goto(this.baseUrl);
        }
    }
    
}
