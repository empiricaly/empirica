// Handles all the timing stuff
import { TimeSync } from "meteor/mizzao:timesync";
import { withTracker } from "meteor/react-meteor-data";
import moment from "moment";

// Handles all the timing stuff
export default withTracker(({ stage, player, ...rest }) => {
  const now = moment(TimeSync.serverTime(null, 100));
  const startTimeAt = stage && moment(stage.startTimeAt);
  const started = stage && now.isSameOrAfter(startTimeAt);
  const endTimeAt =
    stage && startTimeAt.add(stage.durationInSeconds, "seconds");
  const ended = stage && now.isSameOrAfter(endTimeAt);
  const timedOut = stage && player && !player.stage.submitted && ended;
  const roundOver = (stage && player && player.stage.submitted) || timedOut;
  const remainingSeconds = stage && endTimeAt.diff(now, "seconds");
  return {
    timedOut,
    roundOver,
    stage,
    player,
    started,
    ended,
    endTimeAt,
    now,
    remainingSeconds,
    ...rest
  };
});
