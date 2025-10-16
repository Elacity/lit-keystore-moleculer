/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable no-unreachable-loop */
/* eslint-disable func-names */
import { LitNodeClient } from "@lit-protocol/lit-node-client";
import type { AccessControlConditions, EvmContractConditions, LIT_NETWORKS_KEYS } from "@lit-protocol/types";
import type { ServiceSchema } from "moleculer";

declare type UnifiedAccessControls = AccessControlConditions | EvmContractConditions;

export interface LitSettings {
  litNetwork: LIT_NETWORKS_KEYS;
}

export interface KeystoreOptions {
  protocolParameters?: {
    authority: string;
    ledger: string;
    chainId: number;
    rpc: string;
    keystoreUrl?: string;
  };
}

export default (settings: LitSettings): ServiceSchema<LitSettings> => ({
  name: "lit",
  settings,
  lit: null as unknown as LitNodeClient,
  actions: {},
  methods: {
    combinedAccessControls(
      {
        accessControlConditions,
        evmContractConditions,
      }: { accessControlConditions?: AccessControlConditions; evmContractConditions?: EvmContractConditions },
      parameters: Record<string, string>,
    ): UnifiedAccessControls {
      const acc = accessControlConditions ? this.replaceConditionsParameters(accessControlConditions, parameters) : undefined;
      const ecc = evmContractConditions ? this.replaceConditionsParameters(evmContractConditions, parameters) : undefined;

      return {
        ...(acc && {
          accessControlConditions: acc,
        }),
        ...(ecc && {
          evmContractConditions: ecc,
        }),
      };
    },
    replaceConditionsParameters(conditions: UnifiedAccessControls, parameters: Record<string, string>): UnifiedAccessControls {
      this.logger.info("Generating access control conditions...");
      const accessControlConditions: UnifiedAccessControls = [];
      for (const condition of conditions) {
        let stringifiedCondition = JSON.stringify(condition);
        // replace the parameters with the actual values
        for (const [key, value] of Object.entries(parameters ?? {})) {
          stringifiedCondition = stringifiedCondition.replace(`:${key}`, value);
        }

        accessControlConditions.push(JSON.parse(stringifiedCondition));
      }

      return accessControlConditions;
    },
  },
  async started() {
    this.lit = new LitNodeClient({
      litNetwork: this.settings.litNetwork,
      debug: true,
    });
    await this.lit.connect();
  },

  async stopped() {
    await (this.lit as LitNodeClient).disconnect();
  },
});
