/* eslint-disable @typescript-eslint/require-await */
import type { ServiceSchema } from "moleculer";

const HealthzService: ServiceSchema = {
  name: "lit-healthz",

  /**
   * Health check service to monitor the health of the application.
   */
  actions: {
    /**
     * Check the health of the service.
     * @returns {Object} Health status
     */
    check: {
      async handler(): Promise<{ status: string }> {
        return { status: "OK" };
      },
    },
  },

  /**
   * Service created lifecycle event.
   */
  created() {
    this.logger.info("Healthz service created");
  },

  /**
   * Service started lifecycle event.
   */
  started() {
    this.logger.info("Healthz service started");
  },

  /**
   * Service stopped lifecycle event.
   */
  stopped() {
    this.logger.info("Healthz service stopped");
  },
};

export default HealthzService;
