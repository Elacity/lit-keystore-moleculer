/* eslint-disable func-names */
import {
  createSiweMessage,
  generateAuthSig,
  LitActionResource,
} from "@lit-protocol/auth-helpers";
import { LIT_ABILITY, LIT_RPC } from "@lit-protocol/constants";
import { LitNodeClient } from "@lit-protocol/lit-node-client";
import type { AccessControlConditions, LIT_NETWORKS_KEYS } from "@lit-protocol/types";
import * as ethers from "ethers";
import type { ServiceSchema } from "moleculer";

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
}

export default (settings: LitSettings): ServiceSchema<LitSettings> => ({
  name: "lit",
  settings,
  lit: null as unknown as LitNodeClient,
  actions: {},
  methods: {
    async encryptWithLit(hexData: string, options: KeystoreOptions) {
      const dataBytes = Buffer.from(hexData, "hex");
      const { protocol, signer: signerRaw } = options;

      const sessionSigs = await this.generateSessionSignatures(this.lit, signerRaw);

      this.logger.info("Encrypting data with Lit", {
        protocol,
        sessionSigs,
      });

      const accessControl: AccessControlConditions = [
        // we will build this access control conditions based on the options
      ];

      const { ciphertext, dataToEncryptHash } = await (this.lit as LitNodeClient).encrypt({
        accessControlConditions: accessControl,
        dataToEncrypt: dataBytes,
      });

      return {
        ciphertext,
        hash: dataToEncryptHash,
      };
    },
    async generateSessionSignatures(client: LitNodeClient, signerRaw: KeystoreOptions["signer"]) {
      const signer = new ethers.Wallet(
        signerRaw.privateKey, 
        new ethers.providers.JsonRpcProvider(LIT_RPC.LOCAL_ANVIL)
      );

      const sessionSignatures = await client.getSessionSigs({
        chain: "ethereum",
        expiration: new Date(Date.now() + 1000 * 60 * 10).toISOString(), // 10 minutes
        resourceAbilityRequests: [
          {
            resource: new LitActionResource("*"),
            ability: LIT_ABILITY.LitActionExecution,
          },
        ],
        authNeededCallback: async ({
          uri,
          expiration,
          resourceAbilityRequests,
        }) => {
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
