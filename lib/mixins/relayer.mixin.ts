/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable no-unreachable-loop */
/* eslint-disable func-names */
import { LIT_RPC } from "@lit-protocol/constants";
import { LitRelay } from "@lit-protocol/lit-auth-client";
import { LitNodeClient } from "@lit-protocol/lit-node-client";
import type { IRelay } from "@lit-protocol/types";
import * as ethers from "ethers";
import { type Context, Errors, type ServiceSchema } from "moleculer";
import type { LitSettings } from "./lit.mixin.js";

const delegationContractAbi = [
  {
    name: "getPayers",
    type: "function",
    stateMutability: "view",
    inputs: [
      {
        name: "user",
        type: "address",
      },
    ],
    outputs: [
      {
        name: "payers",
        type: "address[]",
      },
    ],
  },
  {
    name: "getPayersAndRestrictions",
    type: "function",
    stateMutability: "view",
    inputs: [
      {
        name: "users",
        type: "address[]",
      },
    ],
    outputs: [
      {
        name: "payers",
        type: "address[][]",
      },
      {
        name: "restrictions",
        type: "tuple[][]",
        components: [
          {
            name: "requestsPerPeriod",
            type: "uint256",
          },
          {
            name: "periodSeconds",
            type: "uint256",
          },
        ],
      },
    ],
  },
];

interface RelayerSettings extends LitSettings {
  relayerApiKey: string;
  payerSecretKey?: string;
}

interface NetworkConfig {
  relayerBaseUrl: string;
  payer: string;
  delegationContract: string;
}

declare type InternalRelayerSettings = RelayerSettings & Partial<NetworkConfig>;

const ecosystem: Record<string, NetworkConfig> = {
  datil: {
    relayerBaseUrl: "https://datil-relayer.getlit.dev",
    payer: "0x581D4bca99709c1E0cB6f07c9D05719818AA6e49", // sec. "L9LwH..."
    delegationContract: "0xF19ea8634969730cB51BFEe2E2A5353062053C14",
  },
  "datil-test": {
    relayerBaseUrl: "https://datil-test-relayer.getlit.dev",
    payer: "0x16BA0779c9e099F9fb7396992Cb3722220EA7385", // sec. "xjDfx..."
    delegationContract: "0xd7188e0348F1dA8c9b3d6e614844cbA22329B99E",
  },
};

/**
 * This
 */
export default (settings: RelayerSettings): ServiceSchema<InternalRelayerSettings> => ({
  name: "relayer",
  description: "Proxy the Lit Relayer functionnalities for only internal use",
  settings: {
    ...settings,
    ...ecosystem[settings.litNetwork],
  },
  lit: null as unknown as LitNodeClient,
  relayer: null as unknown as IRelay,
  delegationContract: null as unknown as ethers.Contract,
  actions: {
    registerNewPayer: {
      async handler() {
        const response = await fetch(this.resolveRelayerURL("/register-payer"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "api-key": this.settings.relayerApiKey,
          },
        });

        return response.json();
      },
    },
    addUser: {
      params: {
        account: {
          type: "string",
        },
        preCheck: {
          type: "boolean",
          optional: true,
          default: true,
        },
      },
      async handler(ctx: Context<{ account: string; preCheck?: boolean }>) {
        const { account, preCheck } = ctx.params;

        if (preCheck) {
          const {
            payers: [payers],
            restrictions: [restrictions],
          } = await (this.delegationContract as ethers.Contract).getPayersAndRestrictions([account]);
          this.logger.trace("track restrictions of the current address", { payers, restrictions, account });

          if (payers?.length && restrictions?.length) {
            return {
              message: "already have payer(s)",
              payers,
              restrictions,
            };
          }
        }

        return ctx.call(`${this.name}.addUsers`, {
          accounts: [account],
        });
      },
    },
    addUsers: {
      params: {
        accounts: {
          type: "array",
          items: "string",
        },
      },
      async handler(ctx: Context<{ accounts: string[] }>) {
        const { accounts } = ctx.params;

        if (!accounts?.length) {
          throw new Errors.MoleculerClientError("Empty payees", 400);
        }

        const response = await fetch(this.resolveRelayerURL("/add-users"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "api-key": this.settings.relayerApiKey,
            "payer-secret-key": this.settings.payerSecretKey,
          },
          body: JSON.stringify(accounts),
        });

        return response.json();
      },
    },
  },
  methods: {
    resolveRelayerURL(path?: string) {
      const network = (this.lit as LitNodeClient).config.litNetwork;
      const urlsMap: Record<string, string> = {
        datil: "https://datil-relayer.getlit.dev",
        "datil-test": "https://datil-test-relayer.getlit.dev",
      };

      const baseUrl = urlsMap[network];
      if (!path) {
        return baseUrl;
      }

      return `${baseUrl}/${path.replace(/^\//, "")}`;
    },
  },
  async started() {
    if (!settings.relayerApiKey) {
      throw new Errors.ServiceSchemaError("missing relayerApiKey", {});
    }

    this.lit = new LitNodeClient({
      litNetwork: this.settings.litNetwork,
      debug: true,
    });
    await this.lit.connect();

    this.relay = new LitRelay({
      relayUrl: LitRelay.getRelayUrl(this.settings.litNetwork),
      relayApiKey: settings.relayerApiKey,
    });

    // initiate the delegation contact contract
    this.delegationContract = new ethers.Contract(
      this.settings.delegationContract as string,
      delegationContractAbi,
      new ethers.providers.JsonRpcProvider(LIT_RPC.CHRONICLE_YELLOWSTONE),
    );
  },

  async stopped() {
    await (this.lit as LitNodeClient)?.disconnect();
  },
});
