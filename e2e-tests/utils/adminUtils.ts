export interface Auth {
  srtoken: string;
  users: AdminUser[];
}

export interface AdminUser {
  username: string;
  password: string;
}

export interface EmpricaConfigToml {
  name: string;
  tajriba: {
    auth: Auth;
  };
}
