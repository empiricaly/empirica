# Empirica

Open source project to tackle the problem of long development cycles required to
produce software to conduct multi-participant and real-time human experiments
online.

## Experiment development

Empirica was built with the experiement developer in mind. The `core` of
Empirica has been seperated from the `experiment`. The folder structure reflects
this organization method.

To develop a new game, you will only be interested in a couple of folders:

* imports/experiment
* public/experiment

All other folders contain `core` Empirica code, which you should not need to
change in the vast majority of cases.

## Running locally

You will need Meteor, for which you can find installation instruction
[here](https://meteor.com/install).

Then run `meteor npm install` to update local npm dependencies and start the
local webserver by running `meteor`. The app boot on http://localhost:3000/
by default. You can access the admin at http://localhost:3000/admin, the login
credentials can be found in `/import/core/startup/server/bootstrap.js`.

## Settings

Don't be intimidated by the settings, they are not currently important to
develop an experiement, you can easily ignore them for now.

**IMPORTANT** **IMPORTANT** **IMPORTANT** **IMPORTANT**  
Settings files MUST NOT be saved into the repo. They should not be transmitted
over an insecure transport such as Email. Ideally, they are shared in person by
USB key, otherwise, encrypt the files with something like
[VeraCrypt](https://www.veracrypt.fr) before sharing over an insecure transport.  
**IMPORTANT** **IMPORTANT** **IMPORTANT** **IMPORTANT**

Settings are set on the app by passing the `--setting JSON_SETTINGS_FILE_NAME`
flag to the `meteor` command. Learn about Meteor Settings in the
[official documentation](https://docs.meteor.com/api/core.html#Meteor-settings).

By convention, we recomment you call your settings files as follows:

* local.json: For local development (on your own computer).
* dev.json: For a development development.
* staging.json: For a staging development.
* production.json: For a production development.

You might not have as many environment but we if you do, we might as well all
follow a convention.

Note that keys under the `"public"` key will be available on both server and
client, all other keys will only be available on the server.

Example configuration:

```json
{
  "public": {
    "playerIdParam": "workerId",
    "playerIdParamExclusive": true,
    "debug_newPlayer": false,
    "debug_resetSession": false,
    "debug_resetDatabase": false,
    "debug_gameDebugMode": false
  }
}
```

Custom settings for Empirica:

* **public.debug_newPlayer** `Boolean` (default: true in development, false in
  production) **This MUST NOT be true in production!** If true, a button in the
  header allows to create a new player without while staying the same browser.
* **public.debug_resetSession**: `Boolean` (default: true in development, false in
  production) **This MUST NOT be true in production!** If true, a button in the
  header allows the player to reset their session (aka player logout).
* **public.debug_resetDatabase**: `Boolean` (default: true in development, false in
  production) **This MUST NOT be true in production!** If true, this will activate
  2 buttons in the Admin that allow to partially or fully clear the DB. CAREFUL!!
* **public.debug_gameDebugMode**: `Boolean` (default: true in development, false in
  production) **This MUST NOT be true in production!** If true, this activates a
  "Game Debug mode". This mode is very useful to develop, test and debug an
  experiment. In this mode, if you click on the `▶️ Start` button of a batch
  while holding `⌘` (mac) or `ctrl` (pc), all the games in the batch will
  be in debug mode, which does 2 things:
  * it skips the instruction steps
  * it sets the timer to a very long time
* **public.playerIdParam**: `String` (default: ""). If provided, Empirica will
  try to extract the Player's ID from the URL parameter of the given key. This
  helps with integration with external tools such as Mechanical Turk. For
  example, if the `playerIdParam` is set to "workerId" and the URL is:
  `https://tictactoe.amazon.com/?workerId=AZ3456EXAMPLE`, the player's ID will
  be `AZ3456EXAMPLE` and they will not be shown the "Enter Player ID" screen.
  If you are working with MTurk, see the [URL docs](https://docs.aws.amazon.com/AWSMechTurk/latest/AWSMturkAPI/ApiReference_ExternalQuestionArticle.html#ApiReference_ExternalQuestionArticle-the-external-form) for more
  info about which fields they provide.
* **public.playerIdParamExclusive**: `Boolean` (default: false"). If provided,
  the "Enter Player ID" will not be show, users are expected to sign up only
  through a URL param, see `public.playerIdParam` above. If
  `public.playerIdParam` is missing, `public.playerIdParamExclusive` is ignored.

## Deployment

There are many ways the app can be deployed. Empirica has no special
dependencies beyond normal Meteor requirements: Node.js + Mongo.

We will go through the deployment on one of the easiest solution using
`Meteor Galaxy`. But there are many other options so we recommend you take a
look at the Meteor Deploymeny Guide: https://guide.meteor.com/deployment.html

### Meteor Galaxy

This is simplest way to deploy. First, you will need a Meteor account, which
you can make at https://www.meteor.com. Then you'll need to log in on your
local machine with the `meteor login` command.

You will also need to create a Mongo database, self-hosted or by using a service
provider. There are many providers to choose from: Compose, MongoDB Atlas,
ObjectRocket... MLab offers a small free sandbox to try things out if you only
have very limited needs or want to just try things out: https://mlab.com/
(be careful, their free version comes with no garanties, make sure to
dump/backup your DB regularly).

Once your DB is configured, you should get a MongoDB configuration URL that
looks something like this:

```
mongodb://myuser:A6629E8B-F4D2-4EC1-ACE3-DF5AA9F2F9A6@43243gh43.mlab.com:6604/my-empirica-db
```

You should then create a settings.json file at the same level as this file and
add you Mongo URL config as follows:

```json
{
  "galaxy.meteor.com": {
    "env": {
      "MONGO_URL":
        "mongodb://myuser:A6629E8B-F4D2-4EC1-ACE3-DF5AA9F2F9A6@43243gh43.mlab.com:6604/my-empirica-db"
    }
  }
}
```

DO NOT COMMIT this file, it contains secrets that should not go into your git
repo.

`*.meteorapp.com` domains are free to use with Galaxy, so you can simply choose
an available subdomain such as `my-empirica-app` (don't use this one), which will
give us the `my-empirica-app.meteorapp.com` domain name. Meteor will let you know
when you try to deploy if the domain is available. Finally just run the
following command with you settings file and your domain name:

```sh
DEPLOY_HOSTNAME=galaxy.meteor.com meteor deploy my-empirica-app.meteorapp.com --settings settings.json
```

Then you can go to https://galaxy.meteor.com/ to see the status of your
deployment.

You can redeploy the app with the same command. As long as it's up and running
you are paying by the hour. You can easily stop the app from the admin UI and
you are no longer billed. You can bring up the app for a few hours or days and
then just bring it back down when you're done to avoid paying to nothing.

To find out more about Meteor Galaxy deployments, see the guide:
http://galaxy-guide.meteor.com/index.html
