import { expect } from "@playwright/test";
import BasePage from "../BasePage";

export default class PlayersPage extends BasePage {
  public async open() {
    await this.initContext();

    await this.page.goto(`${this.baseUrl}/admin`);

    const batchesSidebarButton = await this.getLobbiesLinkInSidebar();

    await batchesSidebarButton.click();

    const newBatchButton = await this.getNewConfigurationButton();

    await expect(newBatchButton).toBeVisible();
  }
}
