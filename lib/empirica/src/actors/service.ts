import { TajribaAdmin } from "tajriba";
import { Admin as Admin } from "./admin";

export class Service extends Admin {
  constructor(taj: TajribaAdmin) {
    super(taj);
  }
}
