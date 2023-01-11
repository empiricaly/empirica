import { expect } from "@playwright/test";
import { AdminUser } from "../../../utils/adminUtils";
import BasePageElement from "../../BasePageElement";

export default class AdminLoginElement extends BasePageElement {
  getUsernameElement() {
    return this.page.locator('[id="playerID"]');
  }

  getPasswordElement() {
    return this.page.locator('[id="playerID"]');
  }

  getEnterButtonElement() {
    return this.page.locator('button[type="submit"]');
  }

  public async login({ username, password }: AdminUser) {
    const loginInput = await this.getUsernameElement();

    await expect(loginInput).toBeVisible();

    loginInput.fill(username);

    const passwordInput = await this.getPasswordElement();

    await expect(passwordInput).toBeVisible();

    passwordInput.fill(password);

    const enterButton = await this.getEnterButtonElement();

    await enterButton.click();
  }
}
