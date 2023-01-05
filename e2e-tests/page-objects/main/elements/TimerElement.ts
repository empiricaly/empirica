import { expect } from "@playwright/test";
import BasePageElement from "../../BasePageElement";

const TIMER_NOT_INITIALIZED_VALUE = "--:--";

export default class TimerElement extends BasePageElement {
  getElement() {
    return this.page.locator(".font-mono.text-3xl"); // TODO: add test id
  }

  private parseTimerValue(timerText: string) {
    const [minutes, seconds] = timerText.split(":");

    console.log("timerText", timerText);

    return {
      minutes: +minutes,
      seconds: +seconds,
    };
  }

  public async checkIfVisible() {
    const timerTextElement = await this.getElement();

    const timerText = await timerTextElement.innerText();

    const { minutes, seconds } = this.parseTimerValue(timerText);

    await expect(TIMER_NOT_INITIALIZED_VALUE).not.toBe(
      TIMER_NOT_INITIALIZED_VALUE
    );

    console.log({ minutes, seconds });

    await expect(timerTextElement).toBeVisible();

    await expect(minutes).not.toBeNaN();
    await expect(seconds).not.toBeNaN();
  }
}
