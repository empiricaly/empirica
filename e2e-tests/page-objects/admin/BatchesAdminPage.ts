import { expect } from "@playwright/test";
import BasePage from "../BasePage";

export enum GamesTypeTreatment {
  "Solo" = "Solo",
  "TwoPlayers" = "Two Players",
}

export default class BatchesAdminPage extends BasePage {
  private getBatchesLinkInSidebar() {
    return this.page.locator('[data-test="batchesSidebarButton"]');
  }

  private getNewBatchButton() {
    return this.page.locator('[data-test="newBatchButton"]');
  }

  private getTreatmentsSelect() {
    return this.page.locator('[data-test="treatmentSelect"]');
  }

  private getCreateBatchButton() {
    return this.page.locator('[data-test="createBatchButton"]');
  }

  private getGameBatchLine() {
    return this.page.locator('[data-test="batchLine"]');
  }

  private getStartGameButton() {
    return this.page.locator('[data-test="startButton"]');
  }

  private async selectTreatmeant(mode: GamesTypeTreatment) {
    const treatmentsSelect = await this.getTreatmentsSelect();

    await treatmentsSelect.selectOption({ label: mode });
  }

  public async open() {
    await this.initContext();

    await this.page.goto(`${this.baseUrl}/admin`);

    const batchesSidebarButton = await this.getBatchesLinkInSidebar();

    await batchesSidebarButton.click();

    const newBatchButton = await this.getNewBatchButton();

    await expect(newBatchButton).toBeVisible();
  }

  public async createBatch({
    mode,
    gamesCount,
  }: {
    mode: GamesTypeTreatment;
    gamesCount: number;
  }) {
    console.log({ mode, gamesCount });

    const newBatchButton = await this.getNewBatchButton();

    await newBatchButton.click();

    await this.selectTreatmeant(mode);

    const createBatchButton = await this.getCreateBatchButton();

    await createBatchButton.click();
  }

  public async startGame() {
    const batchLine = await this.getGameBatchLine();

    await expect(batchLine).toBeVisible();

    const startGameButton = await this.getStartGameButton();

    await startGameButton.click();
  }
}
