import { expect } from "@playwright/test";
import BasePageObject, { BasePageObjectConstructor } from "../BasePageObject";
import BatchesPage from "./BatchesPage";




export default class AdminPage extends BasePageObject {
    private batchesPage: BatchesPage;

    constructor({ page, baseUrl }: BasePageObjectConstructor) {
        super({ page, baseUrl });

        this.batchesPage = new BatchesPage({ page });
    }

    public async open() {
        await this.page.goto(`${this.baseUrl}/admin`)

        const leftPanel = await this.page.locator('[aria-label="Sidebar"]');

        await expect(leftPanel).toBeVisible()
    }

    public getBatchesPage() {
        return this.batchesPage;
    }
}