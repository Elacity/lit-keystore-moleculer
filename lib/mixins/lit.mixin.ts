/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable no-unreachable-loop */
/* eslint-disable func-names */
import { LIT_RPC } from "@lit-protocol/constants";
import { LitContracts } from "@lit-protocol/contracts-sdk";
import { LitNodeClient } from "@lit-protocol/lit-node-client";
import type { AccessControlConditions, EvmContractConditions, LIT_NETWORKS_KEYS, MintCapacityCreditsRes } from "@lit-protocol/types";
import type { ContractReceipt } from "ethers";
import { ethers } from "ethers";
import type { ServiceSchema } from "moleculer";
import { ecosystem } from "../constants/litprotocol.js";

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

export default (settings: LitSettings): ServiceSchema<Partial<LitSettings>> => ({
  name: "lit",
  settings,
  lit: null as unknown as LitNodeClient,
  contracts: null as unknown as LitContracts,
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
    /**
     * As ERC-721, transfer the RLI token to the payer registered to the system
     *
     * @param rli
     * @returns
     */
    async transferRLI(rli: MintCapacityCreditsRes): Promise<ContractReceipt> {
      const contracts = this.contracts as LitContracts;
      const { litNetwork } = (this.lit as LitNodeClient).config;
      const { [litNetwork]: ecosystemData } = ecosystem;

      const tx = await contracts.rateLimitNftContract.write["safeTransferFrom(address,address,uint256)"](
        await contracts.rateLimitNftContract.read.ownerOf(rli.capacityTokenId),
        ecosystemData.payer,
        rli.capacityTokenId,
      );
      const receipt = await tx.wait();

      return receipt;
    },
    /**
     * Mint a new RLI token
     *
     * @returns
     */
    async mintRLI(daysUntil: number): Promise<MintCapacityCreditsRes> {
      const contracts = this.contracts as LitContracts;
      await contracts.connect();

      const rli = await contracts.mintCapacityCreditsNFT({
        requestsPerKilosecond: 1440,
        daysUntilUTCMidnightExpiration: daysUntil,
      });

      return rli;
    },
  },
  async started() {
    this.lit = new LitNodeClient({
      litNetwork: this.settings.litNetwork as LIT_NETWORKS_KEYS,
      debug: true,
    });
    await this.lit.connect();

    this.contracts = new LitContracts({
      signer: new ethers.Wallet(process.env.ETH_PK as string, new ethers.providers.JsonRpcProvider(LIT_RPC.CHRONICLE_YELLOWSTONE)),
      network: (this.lit as LitNodeClient).config.litNetwork,
    });
  },

  async stopped() {
    await (this.lit as LitNodeClient).disconnect();
  },
});
