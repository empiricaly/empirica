import { expect } from "@playwright/test";
import BasePage from "../BasePage";

export default class TreatmentsPage extends BasePage {
  public async open() {
    await this.initContext();

    await this.page.goto(`${this.baseUrl}/admin`);

    const leftPanel = await this.page.locator('[aria-label="Sidebar"]');

    await expect(leftPanel).toBeVisible();
  }
}
