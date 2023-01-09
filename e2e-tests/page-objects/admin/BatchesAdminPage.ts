import { expect } from "@playwright/test";
import BasePage from "../BasePage";

export enum GamesTypeTreatment {
  "Solo" = "Solo",
  "TwoPlayers" = "Two Players",
}

export enum GamesStatus {
  "Created" = "Created",
  "Stopped" = "Stopped",
  "Running" = "Running",
  "Finished" = "Finished",
  "Ended" = "Ended",
}

export enum BatchStatus {
  "Created" = "Created",
  "Running" = "Running",
  "Ended" = "Ended",
  "Terminated" = "Terminated",
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

  private getGamesCountInput() {
    return this.page.locator('[data-test="gameCountInput"]');
  }

  private getGameBatchLine(lineNumber: number) {
    return this.page.locator('[data-test="batchLine"]').nth(lineNumber);
  }

  private getBatchStatusElement(batchNumber: number, status: BatchStatus) {
    return this.page.locator('[data-test="batchLine"] span').getByText(status);
  }

  private getGamesList(batchNumber: number) {
    return this.getGameBatchLine(batchNumber).locator("ul");
  }

  private getLobbyConfigrationList() {
    return this.page.locator('[data-test="lobbySelect"]');
  }

  private getStartGameButton() {
    return this.page.locator('[data-test="startButton"]');
  }

  private getStopGameButton(batchNumber: number) {
    return this.getGameBatchLine(batchNumber).locator(
      '[data-test="stopButton"]'
    );
  }

  private getGameItem({
    batchNumber = 0,
    gameNumber,
  }: {
    batchNumber: number;
    gameNumber: number;
  }) {
    return this.getGameBatchLine(batchNumber).locator("li").nth(gameNumber);
  }

  private async selectTreatmeant(mode: GamesTypeTreatment) {
    const treatmentsSelect = await this.getTreatmentsSelect();

    await treatmentsSelect.selectOption({ label: mode });
  }

  private async selectGamesCount(count: number) {
    const gamesCountInput = await this.getGamesCountInput();

    await gamesCountInput.fill(`${count}`);
  }

  private async selectLobbyConfiguration(name: string) {
    const configrationsList = await this.getLobbyConfigrationList();

    expect(configrationsList).toBeVisible();

    await configrationsList.selectOption({ label: name });
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
    lobbyConfigrationName,
  }: {
    mode: GamesTypeTreatment;
    gamesCount: number;
    lobbyConfigrationName?: string;
  }) {
    await this.getNewBatchButton().click();

    await this.selectTreatmeant(mode);

    await this.selectGamesCount(gamesCount);

    if (lobbyConfigrationName) {
      await this.selectLobbyConfiguration(lobbyConfigrationName);
    }

    await this.getCreateBatchButton().click();
  }

  public async checkGameStatus(
    {
      batchNumber = 0,
      gameNumber,
    }: {
      batchNumber: number;
      gameNumber: number;
    },
    status: GamesStatus
  ) {
    const gameItem = await this.getGameItem({ batchNumber, gameNumber });

    const statusElement = await gameItem.getByText(status);

    // TODO: this should be awaited! fix this issue:
    // await expect(statusElement).toBeVisible();
    expect(statusElement).toBeVisible();
  }

  public async checkBatchStatus({
    batchNumber = 0,
    status,
  }: {
    batchNumber: number;
    status: BatchStatus;
  }) {
    const batchStatus = await this.getBatchStatusElement(batchNumber, status);

    await expect(batchStatus).toBeVisible();
  }

  public async findGameByStatus(
    {
      batchNumber = 0,
    }: {
      batchNumber: number;
    },
    status: GamesStatus
  ) {
    const list = await this.getGamesList(batchNumber);

    const statusElement = await list.getByText(status);

    expect(statusElement).toBeVisible();
  }

  public async startGame() {
    const batchLine = await this.getGameBatchLine(0);

    await expect(batchLine).toBeVisible();

    const startGameButton = await this.getStartGameButton();

    await startGameButton.click();
  }

  public async stopBatch({ batchNumber = 0 }: { batchNumber: number }) {
    const batchLine = await this.getGameBatchLine(batchNumber);

    await expect(batchLine).toBeVisible();

    const stopGameButton = await this.getStopGameButton(batchNumber);

    this.page.on("dialog", (dialog) => dialog.accept());

    await stopGameButton.click();
  }
}
