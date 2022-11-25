import { expect } from "@playwright/test";
import BasePageObject from "../BasePageObject";




export default class ConsentElement extends BasePageObject {
    getAcceptConsentButton() {
        return this.page.locator('button[type="button"]'); // TODO: add test id!
    }

    public async acceptConsent() {
        const acceptConsentButton = await this.getAcceptConsentButton();

        await expect(acceptConsentButton).toBeVisible();

        await acceptConsentButton.click();
    }
}