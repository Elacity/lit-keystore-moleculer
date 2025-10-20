/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/require-await */
import type { Context, ServiceSchema } from "moleculer";
import CronMixin from "../lib/mixins/cron.mixin.js";

const RLICronService: ServiceSchema = {
  name: "rli-cron",

  mixins: [CronMixin],

  settings: {
    cronJobs: [
      {
        name: "rli-cron",
        cronTime: "0 0 1,15 * *", // Run at midnight on 1st and 15th of every month
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        async onTick(ctx: Context) {
          await ctx.emit(`${this.name}.tick`, { timestamp: Date.now(), durationDays: 15 });
        },
        onStart() {
          this.logger.info("RLI-cron mounted")
        },
        timezone: "UTC",
      },
    ],
  },
};

export default RLICronService;
