import { expect } from "@playwright/test";
import BasePageObject from "../BasePageObject";




export default class JellyBeansGameElement extends BasePageObject {
    getTitleElement() {
        return this.page.getByText('Round 1 - Jelly Beans'); // TODO: add test id
    }

    getSubmitButton() {
        return this.page.locator('button[type="button"]'); // TODO: add test id
    }

    getCountsSlider() {
        return this.page.locator('input[type="range"]'); // TODO: add test id
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