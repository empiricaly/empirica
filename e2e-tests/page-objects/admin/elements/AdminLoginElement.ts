import { expect } from "@playwright/test";
import { AdminUser } from "../../../utils/adminUtils";
import BasePageElement from "../../BasePageElement";

export default class AdminLoginElement extends BasePageElement {
  getUsernameElement() {
    return this.page.locator('[data-test="usernameInput"]');
  }

  getPasswordElement() {
    return this.page.locator('[data-test="passwordInput"]');
  }

  getEnterButtonElement() {
    return this.page.locator('button[data-test="signInButton"]');
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
