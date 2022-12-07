import { expect } from "@playwright/test";
import BasePageElement from "../../BasePageElement";

export default class ExitSurveyElement extends BasePageElement {
  getBonusTitleElement() {
    return this.page.getByText("Bonus");
  }

  getAgeInput() {
    return this.page.locator('[id="age"]');
  }

  getGenderInput() {
    return this.page.locator('[id="gender"]');
  }

  getEducationInput() {
    return this.page.locator('[name="education"]');
  }

  getSubmitButton() {
    return this.page.locator('button[type="submit"]');
  }

  public async fillSurvey({ age, gender }: { age: number; gender: string }) {
    const ageInput = await this.getAgeInput();

    await expect(ageInput).toBeVisible();

    ageInput.fill(age.toString());

    const genderInput = await this.getGenderInput();

    await expect(genderInput).toBeVisible();

    genderInput.fill(gender);

    const submitButton = await this.getSubmitButton();

    await submitButton.click();
  }
}
