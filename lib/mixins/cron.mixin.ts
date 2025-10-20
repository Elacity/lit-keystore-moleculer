/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable func-names */
import { Context, type ServiceSchema } from "moleculer";
import cron, { type TaskOptions } from "node-cron";

export interface CronJobConfig extends TaskOptions {
  cronTime: string;
  onTick: (ctx: Context) => Promise<void>;
  onComplete?: () => Promise<void>;
  onInitialize?: () => Promise<void>;
  onStart?: () => Promise<void>;
  onStop?: () => Promise<void>;
  runOnInit?: boolean;
  scheduled?: boolean;
  manualStart?: boolean;
}

export interface CronJobWrapper {
  name: string;
  config: CronJobConfig;
  task: any;
  isRunning: boolean;
  lastExecution?: Date;
  nextExecution?: Date;
  executionCount: number;
  start: () => void;
  stop: () => void;
  destroy: () => void;
}

export interface CronMixinSettings {
  cronJobs: CronJobConfig[];
}

/**
 * Cron mixin for Moleculer services using node-cron
 * Provides scheduled job execution with full lifecycle management
 */
export const CronService = (settings?: Partial<CronMixinSettings>): Partial<ServiceSchema> => ({
  settings: {
    cronJobs: [],
    ...settings,
  },

  jobs: null as Map<string, CronJobWrapper> | null,

  created() {
    this.jobs = new Map<string, CronJobWrapper>();
    this.validateAndCreateJobs();
  },

  started() {
    this.logger.info("Starting cron jobs...");
    this.startJobs();
  },

  stopped() {
    this.logger.info("Stopping all cron jobs...");
    if (this.jobs) {
      const jobsArray = Array.from((this.jobs as Map<string, CronJobWrapper>).values());
      jobsArray.forEach((job: CronJobWrapper) => {
        try {
          job.stop();
          job.destroy();
        } catch (error) {
          this.logger.error(`Error stopping cron job ${job.name}:`, error);
        }
      });
      this.jobs.clear();
    }
  },

  methods: {
    /**
     * Validate and create all cron jobs from settings
     */
    validateAndCreateJobs() {
      if (!Array.isArray(this.settings.cronJobs)) {
        this.logger.warn("No cron jobs defined or invalid configuration");
        return;
      }

      this.settings.cronJobs.forEach((jobConfig) => {
        try {
          this.createJob(jobConfig);
        } catch (error) {
          this.logger.error(`Error creating cron job: ${error instanceof Error ? error.message : "Unknown error"}`, {
            jobConfig,
            error,
          });
        }
      });
    },

    /**
     * Create a single cron job with the given configuration
     */
    createJob(jobConfig: CronJobConfig) {
      // Validate required fields
      if (!jobConfig.name || !jobConfig.cronTime || !jobConfig.onTick) {
        throw new Error("Invalid job configuration. Required: name, cronTime, onTick");
      }

      // Validate cron expression
      if (!this.validateCronExpression(jobConfig.cronTime)) {
        throw new Error(`Invalid cron expression: ${jobConfig.cronTime}`);
      }

      // Check for duplicate job names
      if (this.jobs && this.jobs.has(jobConfig.name)) {
        throw new Error(`Cron job with name '${jobConfig.name}' already exists`);
      }

      const { timezone, name, noOverlap, maxExecutions, maxRandomDelay } = jobConfig;

      try {
        const task = cron.schedule(jobConfig.cronTime, this.wrapOnTick(name, jobConfig.onTick), {
          timezone,
          name,
          noOverlap,
          maxExecutions,
          maxRandomDelay,
        });

        const jobWrapper: CronJobWrapper = {
          name: jobConfig.name,
          config: jobConfig,
          task,
          isRunning: false,
          executionCount: 0,
          start: () => {
            if (!jobWrapper.isRunning) {
              jobWrapper.task.start();
              jobWrapper.isRunning = true;
              this.logger.info(`Started cron job: ${jobConfig.name}`);

              if (jobConfig.onStart) {
                try {
                  const result = jobConfig.onStart.call(this);
                  if (result instanceof Promise) {
                    result.catch((error) => {
                      this.logger.error(`Error in onStart for job ${jobConfig.name}:`, error);
                    });
                  }
                } catch (error) {
                  this.logger.error(`Error in onStart for job ${jobConfig.name}:`, error);
                }
              }
            }
          },
          stop: () => {
            if (jobWrapper.isRunning) {
              jobWrapper.task.stop();
              jobWrapper.isRunning = false;
              this.logger.info(`Stopped cron job: ${jobConfig.name}`);

              if (jobConfig.onStop) {
                try {
                  const result = jobConfig.onStop.call(this);
                  if (result instanceof Promise) {
                    result.catch((error) => {
                      this.logger.error(`Error in onStop for job ${jobConfig.name}:`, error);
                    });
                  }
                } catch (error) {
                  this.logger.error(`Error in onStop for job ${jobConfig.name}:`, error);
                }
              }
            }
          },
          destroy: () => {
            jobWrapper.task.destroy();
            jobWrapper.isRunning = false;
          },
        };

        if (this.jobs) {
          this.jobs.set(jobConfig.name, jobWrapper);
          this.logger.info(`Cron job created: ${jobConfig.name} with schedule: ${jobConfig.cronTime}`);

          // Call onInitialize if provided
          if (jobConfig.onInitialize) {
            try {
              const result = jobConfig.onInitialize.call(this);
              if (result instanceof Promise) {
                result.catch((error) => {
                  this.logger.error(`Error in onInitialize for job ${jobConfig.name}:`, error);
                });
              }
            } catch (error) {
              this.logger.error(`Error in onInitialize for job ${jobConfig.name}:`, error);
            }
          }

          // Run immediately if specified
          if (jobConfig.runOnInit) {
            try {
              this.logger.debug(`Running job ${jobConfig.name} on initialization`);
              const result = jobConfig.onTick.call(this, Context.create(this.broker));
              if (result instanceof Promise) {
                result.catch((error) => {
                  this.logger.error(`Error running job ${jobConfig.name} on init:`, error);
                });
              }
            } catch (error) {
              this.logger.error(`Error running job ${jobConfig.name} on init:`, error);
            }
          }
        }
      } catch (error) {
        throw new Error(`Failed to create job ${jobConfig.name}: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    },

    wrapOnTick(jobName: string, onTick: (ctx: Context) => Promise<void>) {
      return async () => {
        const job = this.jobs?.get(jobName);
        if (!job) {
          return;
        }

        try {
          this.logger.debug(`Executing cron job: ${jobName}`);
          job.lastExecution = new Date();
          job.executionCount += 1;

          await onTick.call(this, Context.create(this.broker));

          this.logger.debug(`Completed cron job: ${jobName}`);

          // Call onComplete if provided
          if (job.config.onComplete) {
            await this.wrapOnComplete(jobName, job.config.onComplete)();
          }
        } catch (error) {
          this.logger.error(`Error in cron job ${jobName}:`, error);
        }
      };
    },

    wrapOnComplete(jobName: string, onComplete?: () => void | Promise<void>) {
      return async () => {
        if (!onComplete) {
          return;
        }

        try {
          this.logger.debug(`Running onComplete for cron job: ${jobName}`);
          await onComplete.call(this);
        } catch (error) {
          this.logger.error(`Error in onComplete for job ${jobName}:`, error);
        }
      };
    },

    /**
     * Start all cron jobs that are not marked as manual start
     */
    startJobs() {
      if (this.jobs) {
        const jobsArray = Array.from((this.jobs as Map<string, CronJobWrapper>).entries());
        jobsArray.forEach(([name, job]: [string, CronJobWrapper]) => {
          if (!job.config.manualStart) {
            job.start();
          } else {
            this.logger.debug(`Skipping auto-start for manual job: ${name}`);
          }
        });
      }
    },

    /**
     * Start a specific cron job by name
     */
    startJob(name: string): boolean {
      this.logger.info("starting cron...", name);
      const job = this.jobs?.get(name);
      if (job) {
        job.start();
        return true;
      }
      this.logger.warn(`Attempted to start non-existent job: ${name}`);
      return false;
    },

    /**
     * Stop a specific cron job by name
     */
    stopJob(name: string): boolean {
      const job = this.jobs?.get(name);
      if (job) {
        job.stop();
        return true;
      }
      this.logger.warn(`Attempted to stop non-existent job: ${name}`);
      return false;
    },

    /**
     * Permanently destroy a cron job and remove it from the job list
     */
    destroyJob(name: string): boolean {
      const job = this.jobs?.get(name);
      if (job) {
        job.destroy();
        this.jobs.delete(name);
        this.logger.info(`Destroyed cron job: ${name}`);
        return true;
      }
      this.logger.warn(`Attempted to destroy non-existent job: ${name}`);
      return false;
    },

    /**
     * Get a specific cron job wrapper by name
     */
    getJob(name: string): CronJobWrapper | undefined {
      return this.jobs?.get(name);
    },

    /**
     * Get all cron jobs as a Map
     */
    getAllJobs(): Map<string, CronJobWrapper> {
      return new Map(this.jobs || []);
    },

    /**
     * Check if a specific cron job is currently running
     */
    isJobRunning(name: string): boolean {
      const job = this.jobs?.get(name);
      return job ? job.isRunning : false;
    },

    /**
     * Validate a cron expression using node-cron validation
     */
    validateCronExpression(cronExpression: string): boolean {
      try {
        return cron.validate(cronExpression);
      } catch (error) {
        return false;
      }
    },

    /**
     * Get execution statistics for a specific cron job
     */
    getJobStats(name: string) {
      const job = this.jobs?.get(name);
      if (!job) {
        return undefined;
      }

      return {
        name: job.name,
        isRunning: job.isRunning,
        lastExecution: job.lastExecution,
        nextExecution: job.nextExecution,
        executionCount: job.executionCount,
      };
    },
  },
});

export default CronService();
