import { expect } from "@playwright/test";
import BasePageElement from "../../BasePageElement";

export default class JellyBeansGameElement extends BasePageElement {
  getTitleElement() {
    return this.page.getByText("Round 1 - Jelly Beans"); // TODO: add test id
  }

  getSubmitButton() {
    return this.page.locator('button[type="button"]'); // TODO: add test id
  }

  getCountsSlider() {
    return this.page.locator('input[type="range"]:enabled'); // TODO: add test id
  }

  getOtherPlayersCountsSlider() {
    return this.page.locator('input[type="range"]:disabled'); // TODO: add test id
  }

  public async checkIfVisible() {
    const roundTitle = await this.getTitleElement();

    await expect(roundTitle).toBeVisible();
  }

  public async selectJellyBeansCount(count: number) {
    const countSlider = await this.getCountsSlider();

    await expect(countSlider).toBeVisible();

    await countSlider.fill(count.toString());
  }

  public async checkSubmittedCount() {
    const submitButton = await this.getSubmitButton();

    await expect(submitButton).toBeVisible();

    await submitButton.click();
  }

  public async submitResult() {
    const submitButton = await this.getSubmitButton();

    await expect(submitButton).toBeVisible();

    await submitButton.click();
  }

  public async finishGame() {
    const submitButton = await this.getSubmitButton();

    await expect(submitButton).toBeVisible();

    await submitButton.click();
  }
}
