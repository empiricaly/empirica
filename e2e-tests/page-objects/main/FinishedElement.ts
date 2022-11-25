import { expect } from "@playwright/test";
import BasePageObject from "../BasePageObject";


export default class FinishedElement extends BasePageObject {
    getFinishedText() {
        return this.page.getByText('Finished'); // TODO: add test id
    }

    public async checkIfVisible() {
        const finishedText = await this.getFinishedText();

        await expect(finishedText).toBeVisible();
    }
}