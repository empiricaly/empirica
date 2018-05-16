// Client entry point, imports all client code

import "/imports/core/startup/both";
import "/imports/core/startup/client";

import { render } from "react-dom";
import { renderRoutes } from "../imports/core/startup/client/routes";

Meteor.startup(() => {
  render(renderRoutes(), document.getElementById("app"));
});
