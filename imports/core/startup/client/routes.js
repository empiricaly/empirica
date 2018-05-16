import { BrowserRouter, Switch } from "react-router-dom";
import React from "react";

import Admin from "../../ui/components/Admin";
import AuthorizedRoute from "../../ui/containers/AuthorizedRoute";
import IdentifiedRoute from "../../ui/containers/IdentifiedRoute";
import Login from "../../ui/components/Login";
import PublicContainer from "../../ui/containers/PublicContainer";

export const renderRoutes = () => (
  <BrowserRouter>
    <div className="app">
      <Switch>
        {/* IdentifiedRoutes need to know which player the user is to play a game */}
        <IdentifiedRoute path="/" exact component={PublicContainer} />

        {/* AuthorizedRoutes need to know if the user is logged in for admin business */}
        <AuthorizedRoute path="/admin" component={Admin} />
        <AuthorizedRoute path="/login" component={Login} />
      </Switch>
    </div>
  </BrowserRouter>
);
