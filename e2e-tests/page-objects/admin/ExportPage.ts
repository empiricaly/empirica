import { expect } from "@playwright/test";
import BasePageObject from "../BasePageObject";




export default class ExportPage extends BasePageObject {
    public async open() {
        await this.page.goto(`${this.baseUrl}/admin`)

        const leftPanel = await this.page.locator('[aria-label="Sidebar"]');

        await expect(leftPanel).toBeVisible()
    }

    public async export() {
        // TODO: implement export functionality
    }
}