# Empirica

Open source project to tackle the problem of long development cycles required to
produce software to conduct multi-participant and real-time human experiments
online. Here is
[some sort of a tutorial](https://github.com/empiricaly/guess-correlation-tutorial) (still work in
progress!).

## We are in Beta

This is a REAL beta - this means that you will be using a version of Empirica
that is not yet ready for public release and still lacks proper documentation
and examples. You should be prepared to find things which don't work perfectly,
so please give us feedback on how to make them better. You can provide us with
feedback by sending an email to hello@empirica.ly or by creating an issue on
GitHub. The more feedback you give us, the better!

## Why Empirica?

The purpose of Empirica is to address the problem of long development cycles
required to produce software to conduct human online experiments by handling all
the boring logistics and allowing you to get straight to what really interests
you, whatever that may be. It was built with the experiment developer in mind.
Your time should not be spent in implementing the software and reinventing the
wheel every time you try to experiment with your ideas.

## Features

* Design complex tasks and set up interactions that happen over any period of
  time, from seconds to months, or among any number of people, from a single
  player to groups of any size.
* Implement simple A/B tests with independent players in this framework. But
  it's just as easy to implement group experiments with real-time or
  asynchronous interactions in a factorial or within-subjects design, or designs
  involving multiple types of units and conditional logic.
* Add configurable artificial players and allowing for the study of Human + AI
  social systems. This hybrid system could be the future of our society!
* Create your own experimental games with only little prior programming
  knowledge as the framework is based on widely-used web technology standards:
  Javascript and React.js.
* Watch the progress of experiments in real time with the ability to create
  one-way mirrors to observe the behavior of players in the virtual lab.

## Experiment development

Empirica was built with the experiment developer in mind. The `core` of Empirica
has been separated from the `experiment`. The folder structure reflects this
organization method.

To develop a new game, you will only be interested in a couple of folders:

* imports/experiment
* public/experiment

All other folders contain `core` Empirica code, which you should not need to
change in the vast majority of cases.

## Usage strategy (a temporary solution)

To duplicate Empirica without forking it, you can run a special clone command,
then mirror-push to the new repository (this should be your experiment
repository).

Before you can duplicate Empirica and push to your new experiment, or mirror, of
the repository, you must
[create the new experiment repository](https://help.github.com/articles/creating-a-new-repository/)
on GitHub. In these examples, `yourusername/yourexperimentname` is the newly
created repository for your experiment. On the other hand, `empiricaly/empirica`
is the repository to be mirrored.

### Mirroring a repository

1. Open Terminal.
2. Create a bare clone of the Empirica framework.

```
git clone --bare https://github.com/empiricaly/empirica.git
```

3. Mirror-push to your new experiment repository.

```
cd empirica.git
git push --mirror https://github.com/yourusername/yourexperimentname.git
```

4. Remove the temporary Empirica repository you created in step 1.

```
cd ..
rm -rf empirica.git
```

5. Clone your new experiment repository.

```
git clone https://github.com/yourusername/yourexperimentname.git
```

Now you are set. All you need to do is to change directory `cd
yourexperimentname/` and start editing the files in `imports/experiment` to
design your own experiment. You can
[make the repository private](https://help.github.com/articles/making-a-public-repository-private/),
if you wish, or public.

### Getting updates from Empirica

Now if you wish to update your experiment to include the latest features of
Empirica (i.e., pull new hotness):

1. Open Terminal.
2. go to your experiment folder

```
cd yourexperimentname
```

3. Add Empirica as a remote repository

```
git remote add empirica https://github.com/empiricaly/empirica.git`
```

4. Now you need to create a merge commit (note that README.md) would probably
   create a merge conflict that you will need to resolve

```
git pull empirica master
```

Note that steps 1-3 are only needed once. You can repeat step 4 every time there
is a new Empirica update

## Running locally

You will need Meteor, for which you can find installation instruction
[here](https://meteor.com/install).

Then run `meteor npm install` to update local npm dependencies and start the
local webserver by running `meteor`. The app boot on http://localhost:3000/ by
default. You can access the admin at http://localhost:3000/admin, the login
credentials can be found in `/import/core/startup/server/bootstrap.js`.

## Advanced Settings (You can ignore for now)

Don't be intimidated by the settings, they are not currently important to
develop an experiment, you can easily ignore them for now.

Settings files MUST NOT be saved in the repo. They should not be transmitted
over an insecure transport such as Email. Ideally, they are shared in person by
USB key, otherwise, encrypt the files with something like
[VeraCrypt](https://www.veracrypt.fr) before sharing over an insecure transport.

Settings are set on the app by passing the `--setting JSON_SETTINGS_FILE_NAME`
flag to the `meteor` command. Learn about Meteor Settings in the
[official documentation](https://docs.meteor.com/api/core.html#Meteor-settings).

By convention, we recommend you call your settings files as follows:

* local.json: For local development (on your own computer).
* dev.json: For a development development.
* staging.json: For a staging development.
* production.json: For a product development.

You might not have as many environments but we if you do, we might as well all
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
  header allows creating a new player without while staying in the same browser.
* **public.debug_resetSession**: `Boolean` (default: true in development, false
  in production) **This MUST NOT be true in production!** If true, a button in
  the header allows the player to reset their session (aka player logout).
* **public.debug_resetDatabase**: `Boolean` (default: true in development, false
  in production) **This MUST NOT be true in production!** If true, this will
  activate 2 buttons in the Admin that allow to partially or fully clear the DB.
  CAREFUL!!
* **public.debug_gameDebugMode**: `Boolean` (default: true in development, false
  in production) **This MUST NOT be true in production!** If true, this
  activates a "Game Debug mode". This mode is very useful to develop, test and
  debug an experiment. In this mode, if you click on the `▶️ Start` button of a
  batch while holding `⌘` (mac) or `ctrl` (pc), all the games in the batch will
  be in debug mode, which does 2 things:
  * it skips the instruction steps
  * it sets the timer for a very long time
* **public.playerIdParam**: `String` (default: ""). If provided, Empirica will
  try to extract the Player's ID from the URL parameter of the given key. This
  helps with integration with external tools such as Mechanical Turk. For
  example, if the `playerIdParam` is set to "workerId" and the URL is:
  `https://tictactoe.amazon.com/?workerId=AZ3456EXAMPLE`, the player's ID will
  be `AZ3456EXAMPLE` and they will not be shown the "Enter Player ID" screen. If
  you are working with MTurk, see the
  [URL docs](https://docs.aws.amazon.com/AWSMechTurk/latest/AWSMturkAPI/ApiReference_ExternalQuestionArticle.html#ApiReference_ExternalQuestionArticle-the-external-form)
  for more info about which fields they provide.
* **public.playerIdParamExclusive**: `Boolean` (default: false"). If provided,
  the "Enter Player ID" will not be show, users are expected to sign up only
  through a URL param, see `public.playerIdParam` above. If
  `public.playerIdParam` is missing, `public.playerIdParamExclusive` is ignored.

## Deployment

There are many ways the app can be deployed. Empirica has no special
dependencies beyond normal Meteor requirements: Node.js + Mongo.

We will go through the deployment on one of the easiest solution using `Meteor
Galaxy`. But there are many other options so we recommend you take a look at the
Meteor Deployment Guide: https://guide.meteor.com/deployment.html

### Meteor Galaxy

This is most straightforward way to deploy. First, you will need a Meteor
account, which you can make at https://www.meteor.com. Then you'll need to log
in on your local machine with the `meteor login` command.

You will also need to create a Mongo database, self-hosted or by using a service
provider. There are many providers to choose from: Compose, MongoDB Atlas,
ObjectRocket... MLab offers a small free sandbox to try things out if you only
have very limited needs or want just to try things out: https://mlab.com/ (be
careful, their free version comes with no guarantees, make sure to dump/backup
your DB regularly).

Once your DB is configured, you should get a MongoDB configuration URL that
looks something like this:

```
mongodb://myuser:A6629E8B-F4D2-4EC1-ACE3-DF5AA9F2F9A6@43243gh43.mlab.com:6604/my-empirica-db
```

You should then create a setting.json file at the same level as this file and
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
an available subdomain such as `my-empirica-app` (don't use this one), which
will give us the `my-empirica-app.meteorapp.com` domain name. Meteor will let
you know when you try to deploy if the domain is available. Finally just run the
following command with your settings file and your domain name:

```sh
DEPLOY_HOSTNAME=galaxy.meteor.com meteor deploy my-empirica-app.meteorapp.com --settings settings.json
```

Then you can go to https://galaxy.meteor.com/ to see the status of your
deployment.

You can redeploy the app with the same command. As long as it's up and running,
you are paying by the hour. You can quickly stop the app from the admin UI, and
you are no longer billed. You can bring up the app for a few hours or days and
then just bring it back down when you're done to avoid paying to nothing.

To find out more about Meteor Galaxy deployments, see the guide:
http://galaxy-guide.meteor.com/index.html
