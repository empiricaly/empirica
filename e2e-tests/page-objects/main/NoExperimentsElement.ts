import { expect } from "@playwright/test";
import BasePageObject from "../BasePageObject";




export default class NoExperimentsElement extends BasePageObject {
    getElement() {
        return this.page.getByText('No experiments available');
    }
}