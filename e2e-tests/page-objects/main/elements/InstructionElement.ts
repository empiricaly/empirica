import { expect } from "@playwright/test";
import BasePageElement from "../../BasePageElement";

export default class InstructionsElement extends BasePageElement {
  getNextButtonElement() {
    return this.page.getByText("Next"); // TODO: add test id
  }

  public async gotoNextPage() {
    const enterButton = await this.getNextButtonElement();

    await expect(enterButton).toBeVisible();

    await enterButton.click();
  }
}
