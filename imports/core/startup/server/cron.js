import SimpleSchema from "simpl-schema";
import colors from "colors/safe";

const tasks = {};

const Cron = {
  add(options) {
    new SimpleSchema({
      name: { type: String },
      interval: { type: SimpleSchema.Integer }, // In ms, shouldn't be less than 1000ms
      task: { type: Function }
    }).validate(options);

    if (tasks[options.name]) {
      throw `Cron task with name ${options.name} already exists`;
    }

    tasks[options.name] = options;
  }
};

const logCron = (Meteor.cron && Meteor.cron.log) || false;
const cronLog = msg => logCron && console.info(msg);
const cronLogErr = msg => logCron && console.error(msg);

Meteor.startup(() => {
  for (const name in tasks) {
    if (!tasks.hasOwnProperty(name)) {
      continue;
    }
    const task = tasks[name];

    Meteor.defer(() => {
      const taskName = colors.bold(task.name);
      const startLog = `${colors.green("▶")} ${taskName}`;
      const doneLog = (took, wait) => {
        return (
          `${colors.red("◼")} ${taskName}: Done in ${took}ms. ` +
          `Waiting for ${wait < 0 ? 0 : wait}ms.`
        );
      };
      const log = {
        info(msg) {
          cronLog(`${colors.dim("i")} ${taskName}: ${msg} `);
        },
        error(msg) {
          cronLog(`${colors.red("✘")} ${colors.red(taskName + ":")} ${msg} `);
        }
      };
      let run = () => {
        cronLog(startLog);
        const start = new Date();
        task.task(log);
        const took = new Date() - start;
        const wait = task.interval - took;
        cronLog(doneLog(took, wait));
        if (wait <= 0) {
          Meteor.defer(run);
        } else {
          Meteor.setTimeout(run, wait);
        }
      };
      run();
    });
  }
});

export default Cron;
