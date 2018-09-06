import { Conditions } from "../../api/conditions/conditions.js";
import { config } from "../../../experiment/server";
import log from "../../lib/log.js";

const admins = [];

const settingsAdmins = Meteor.settings.admins;
if (settingsAdmins) {
  if (!_.isArray(settingsAdmins)) {
    log.error("settings: `admins` field is not an array");
  } else {
    settingsAdmins.forEach(({ username, password }) => {
      if (!username || !password) {
        log.error("settings: `admins` require `username` and `password`");
      } else {
        admins.push({ username, password });
      }
    });
  }
}

if (admins.length === 0) {
  const tempPassword =
    Math.random()
      .toString(36)
      .slice(2) +
    Math.random()
      .toString(36)
      .slice(2);

  admins.push({
    username: "admin",
    password: tempPassword
  });

  log.warn(
    `You have not set any custom passwords in your settings file (see Readme), you can temporarily log in with (reset on each app reload):\n- username: admin\n- password: ${tempPassword}\n`
  );
}

const bootstrapFunctions = [];
export const bootstrap = () => {
  bootstrapFunctions.forEach(f => f());
};

Meteor.startup(() => {
  bootstrap();
});

bootstrapFunctions.push(() => {
  admins.forEach(admin => {
    const exists = Meteor.users.findOne(_.omit(admin, "password"));
    if (!exists) {
      Accounts.createUser(admin);
    } else {
      Accounts.setPassword(exists._id, admin.password, { logout: false });
    }
  });
});

const insertMissingValue = key => value => {
  const attributes = { type: key, value };
  if (!Boolean(Conditions.findOne(attributes))) {
    Conditions.insert(_.extend({ name: String(value) }, attributes), {
      autoConvert: false
    });
  }
};
bootstrapFunctions.push(() => {
  _.each(config.conditions, (definition, key) => {
    if (definition.allowedValues) {
      definition.allowedValues.forEach(insertMissingValue(key));
    }
    if (definition.type === Boolean) {
      [true, false].forEach(insertMissingValue(key));
    }
  });
});
