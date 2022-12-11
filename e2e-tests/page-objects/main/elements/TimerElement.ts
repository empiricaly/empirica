import { expect } from "@playwright/test";
import BasePageElement from "../../BasePageElement";

export default class TimerElement extends BasePageElement {
  getElement() {
    return this.page.locator(".font-mono.text-3xl"); // TODO: add test id
  }

  public async checkIfVisible() {
    const timerText = await this.getElement();

    await expect(timerText).toBeVisible();
    await expect(timerText).toContain("02:00");
  }
}
