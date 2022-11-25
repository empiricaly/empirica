import { expect } from "@playwright/test";
import BasePageObject from "../BasePageObject";




export default class InstructionsElement extends BasePageObject {
    getNextButtonElement() {
        return this.page.getByText('Next'); // TODO: add test id
    }

    public async gotoNextPage() {
        const enterButton = await this.getNextButtonElement();

        await expect(enterButton).toBeVisible();

        await enterButton.click();
    }
}