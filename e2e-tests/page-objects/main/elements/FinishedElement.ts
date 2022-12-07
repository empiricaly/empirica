import { expect } from "@playwright/test";
import BasePageElement from "../../BasePageElement";

export default class FinishedElement extends BasePageElement {
  getFinishedText() {
    return this.page.getByText("Finished"); // TODO: add test id
  }

  public async checkIfVisible() {
    const finishedText = await this.getFinishedText();

    await expect(finishedText).toBeVisible();
  }
}
