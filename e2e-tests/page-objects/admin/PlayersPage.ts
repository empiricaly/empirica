import { expect } from "@playwright/test";
import BasePageObject from "../BasePageObject";




export default class PlayersPage extends BasePageObject {
    public async open() {
        await this.page.goto(`${this.baseUrl}/admin`)

        const leftPanel = await this.page.locator('[aria-label="Sidebar"]');

        await expect(leftPanel).toBeVisible()
    }
}