import { expect } from "@playwright/test";
import BasePageElement from "../../BasePageElement";

export default class MinesweeperGameElement extends BasePageElement {
  getTitleElement() {
    return this.page.getByText("Round 2 - Minesweeper");
  }

  getSubmitButton() {
    return this.page.locator('button[type="button"]'); // TODO: add test id
  }

  getMinefieldElement(number: number) {
    return this.page.locator(`.h-full.w-full.flex >> nth=${number}`); // TODO: add test id!
  }

  public async checkIfVisible() {
    const roundTitle = await this.getTitleElement();

    await expect(roundTitle).toBeVisible();
  }

  public async openMinefieldElement(number: number) {
    const minefieldElement = await this.getMinefieldElement(number);

    await expect(minefieldElement).toBeVisible();

    await minefieldElement.click();
  }

  public async checkState(number: number) {
    const submitButton = await this.getMinefieldElement(number);

    await expect(submitButton).toBeVisible();

    await submitButton.click();
  }

  public async finishGame() {
    const submitButton = await this.getSubmitButton();

    await expect(submitButton).toBeVisible();

    await submitButton.click();
  }
}
