import { expect } from "@playwright/test";
import BasePageElement from "../../BasePageElement";

export default class NoExperimentsElement extends BasePageElement {
  getElement() {
    return this.page.getByText("No experiments available");
  }

  async checkIfVisible() {
    const element = await this.getElement();

    await expect(element).toBeVisible();
  }
}
