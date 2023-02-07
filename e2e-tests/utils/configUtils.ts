import { AdminUser } from "./adminUtils";

export default function createEmpiricaConfigToml(
  projectId: string,
  adminCredentials: AdminUser
): string {
  return `
name = "${projectId}"

[tajriba.auth]
srtoken = "UEqYgbcBZwZLLsqb"

[[tajriba.auth.users]]
name = "Admin"
username = "${adminCredentials.username}"
password = "${adminCredentials.password}"
  `;
}
