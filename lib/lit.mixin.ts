/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable no-unreachable-loop */
/* eslint-disable func-names */
import { createSiweMessage, generateAuthSig, LitActionResource } from "@lit-protocol/auth-helpers";
import { LIT_ABILITY, LIT_RPC } from "@lit-protocol/constants";
import { LitNodeClient } from "@lit-protocol/lit-node-client";
import type { AccessControlConditions, EvmContractConditions, LIT_NETWORKS_KEYS } from "@lit-protocol/types";
import * as ethers from "ethers";
import { Errors } from "moleculer";
import type { ServiceSchema } from "moleculer";

declare type UnifiedAccessControls = AccessControlConditions | EvmContractConditions;

interface LitSettings {
  litNetwork: LIT_NETWORKS_KEYS;
}

export interface KeystoreOptions {
  protocol: {
    protocolVersion: string;
    authority?: string;
    channel?: string;
  };
  signer: {
    privateKey: string;
    address?: string;
  };
  accessControlConditions?: AccessControlConditions;
  evmContractConditions?: EvmContractConditions;
  parameters?: Record<string, string>;
}

export default (settings: LitSettings): ServiceSchema<LitSettings> => ({
  name: "lit",
  settings,
  lit: null as unknown as LitNodeClient,
  actions: {},
  methods: {
    async encryptWithLit(hexData: string, options: KeystoreOptions) {
      const dataBytes = Buffer.from(hexData, "hex");
      const { protocol, accessControlConditions, evmContractConditions, parameters } = options;

      this.logger.info("Encrypting data with Lit", {
        protocol,
      });

      if (!accessControlConditions && !evmContractConditions) {
        throw new Errors.ValidationError("accessControlConditions or evmContractConditions is required");
      }

      const accessControls = this.combinedAccessControls(
        {
          accessControlConditions,
          evmContractConditions,
        },
        parameters,
      );

      const { ciphertext, dataToEncryptHash } = await (this.lit as LitNodeClient).encrypt({
        ...accessControls,
        dataToEncrypt: dataBytes,
      });

      return {
        ciphertext,
        hash: dataToEncryptHash,
        ...accessControls,
      };
    },
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
    async generateSessionSignatures(client: LitNodeClient, signerRaw: KeystoreOptions["signer"]) {
      const signer = new ethers.Wallet(signerRaw.privateKey, new ethers.providers.JsonRpcProvider(LIT_RPC.LOCAL_ANVIL));

      const sessionSignatures = await client.getSessionSigs({
        chain: "ethereum",
        expiration: new Date(Date.now() + 1000 * 60 * 10).toISOString(), // 10 minutes
        resourceAbilityRequests: [
          {
            resource: new LitActionResource("*"),
            ability: LIT_ABILITY.LitActionExecution,
          },
        ],
        authNeededCallback: async ({ uri, expiration, resourceAbilityRequests }) => {
          const toSign = await createSiweMessage({
            uri,
            expiration,
            resources: resourceAbilityRequests,
            walletAddress: await signer.getAddress(),
            nonce: await client.getLatestBlockhash(),
            litNodeClient: client,
          });

          return generateAuthSig({
            signer,
            toSign,
          });
        },
      });

      return sessionSignatures;
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
