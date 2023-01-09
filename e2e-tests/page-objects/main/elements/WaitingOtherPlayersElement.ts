import { expect } from "@playwright/test";
import BasePageElement from "../../BasePageElement";

export default class WaitingOtherPlayersElement extends BasePageElement {
  getHeader() {
    return this.page.getByText("Waiting for other players"); // TODO: add test id
  }

  public async checkIfVisible() {
    const finishedText = await this.getHeader();

    await expect(finishedText).toBeVisible();
  }
}
