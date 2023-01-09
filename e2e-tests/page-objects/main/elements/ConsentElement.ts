import { expect } from "@playwright/test";
import BasePageElement from "../../BasePageElement";

export default class ConsentElement extends BasePageElement {
  getAcceptConsentButton() {
    return this.page.locator('button[type="button"]'); // TODO: add test id!
  }

  public async acceptConsent() {
    const acceptConsentButton = await this.getAcceptConsentButton();

    await expect(acceptConsentButton).toBeVisible();

    await acceptConsentButton.click();
  }
}
