import { expect } from "@playwright/test";
import BasePageElement from "../../BasePageElement";

export default class LoginElement extends BasePageElement {
  getLoginElement() {
    return this.page.locator('[id="playerID"]'); // TODO: add test id
  }

  getEnterButtonElement() {
    return this.page.locator('button[type="submit"]'); // TODO: add test id
  }

  public async login({ playerId }: { playerId: string }) {
    const loginInput = await this.getLoginElement();

    await expect(loginInput).toBeVisible();

    loginInput.fill(playerId);

    const enterButton = await this.getEnterButtonElement();

    await enterButton.click();
  }
}
