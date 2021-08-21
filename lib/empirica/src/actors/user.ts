import { TajribaAdmin } from "tajriba";
import { Admin } from "./admin";

export class User extends Admin {
  constructor(taj: TajribaAdmin) {
    super(taj);
  }
}
