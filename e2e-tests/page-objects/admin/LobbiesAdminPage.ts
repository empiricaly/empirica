import { expect } from "@playwright/test";
import BasePage from "../BasePage";

export enum LobbyTimeoutKind {
  "Shared" = "Shared",
  "Individual" = "Individual",
}

export enum LobbyTimeoutStrategy {
  "Fail" = "Fail",
  "Ignore" = "Ignore",
}

type NewLobbyTimeoutParams = {
  name: string;
  description?: string;
  kind: LobbyTimeoutKind;
  duration: string;
  strategy?: LobbyTimeoutStrategy;
};

export default class LobbiesAdminPage extends BasePage {
  private getLobbiesLinkInSidebar() {
    return this.page.locator('[data-test="lobbiesSidebarButton"]');
  }

  private getNewConfigurationButton() {
    return this.page.locator('[data-test="newLobbyButton"]');
  }

  private getNameInput() {
    return this.page.locator('input[id="name"]');
  }

  private getDescriptionField() {
    return this.page.locator('textarea[id="description"]');
  }

  private getSharedKindButton() {
    return this.page.locator('[data-test="sharedKindButton"]');
  }

  private getIndividualKindButton() {
    return this.page.locator('[data-test="individualKindButton"]');
  }

  private getDurationInout() {
    return this.page.locator('[data-test="durationInput"]');
  }

  private getFailStrategyButton() {
    return this.page.locator('[data-test="failStrategyButton"]');
  }

  private getIgnoreStrategyButton() {
    return this.page.locator('[data-test="ignoreStrategyButton"]');
  }

  private getSaveConfigrationButton() {
    return this.page.locator('button[type="submit"]');
  }

  public async open() {
    await this.initContext();

    await this.page.goto(`${this.baseUrl}/admin`);

    const batchesSidebarButton = await this.getLobbiesLinkInSidebar();

    await batchesSidebarButton.click();

    const newBatchButton = await this.getNewConfigurationButton();

    await expect(newBatchButton).toBeVisible();
  }

  public async selectKind(kind: LobbyTimeoutKind) {
    if (kind === LobbyTimeoutKind.Shared) {
      await this.getSharedKindButton().click();
    }

    if (kind === LobbyTimeoutKind.Individual) {
      await this.getIndividualKindButton().click();
    }
  }

  public async selectStrategy(strategy: LobbyTimeoutStrategy) {
    if (strategy === LobbyTimeoutStrategy.Fail) {
      await this.getFailStrategyButton().click();
    }

    if (strategy === LobbyTimeoutStrategy.Ignore) {
      await this.getIgnoreStrategyButton().click();
    }
  }

  public static getLobbyName(config: NewLobbyTimeoutParams) {
    const strategyName =
      config.kind === LobbyTimeoutKind.Shared
        ? config?.strategy?.toLowerCase()
        : "0";

    return `${config.name} - ${config.kind} / ${config.duration} / ${strategyName}`;
  }

  public async createNewLobbyConfiguration({
    name,
    description,
    kind,
    duration,
    strategy,
  }: NewLobbyTimeoutParams) {
    await this.getNewConfigurationButton().click();

    const nameInput = await this.getNameInput();

    await expect(nameInput).toBeVisible();

    nameInput.fill(name);

    if (description) {
      const descriptionField = await this.getDescriptionField();

      await expect(descriptionField).toBeVisible();

      await descriptionField.fill(description);
    }

    await this.getDurationInout().fill(duration);

    await this.selectKind(kind);

    if (kind === LobbyTimeoutKind.Shared && strategy) {
      await this.selectStrategy(strategy);
    }

    await this.getSaveConfigrationButton().click();
  }

  // public async checkLobbyConfigurationVisible() {}
}
