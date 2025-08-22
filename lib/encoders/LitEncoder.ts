/* eslint-disable @typescript-eslint/no-parameter-properties */
import { encryptString } from "@lit-protocol/encryption";
import type { LitNodeClient } from "@lit-protocol/lit-node-client";
import type { AccessControlConditions, EncryptResponse, EvmContractConditions, UnifiedAccessControlConditions } from "@lit-protocol/types";
import type { Service } from "moleculer";
import { KeySystemId, ProtectionType, supportedChains } from "../constants/index.js";
import type { EncodingResult, ICEKEncoder, ProtectionInput } from "./types.js";

declare type UnifiedAccessControls = AccessControlConditions | EvmContractConditions | UnifiedAccessControlConditions;

interface LitKeystoreParameters {
  litClient: LitNodeClient;
}

type AccessControlsTemplate = Partial<Record<"evmContractConditions" | "accessControlConditions" | "unifiedAccessControls", UnifiedAccessControls>>;

export default class LitKeystoreManager implements ICEKEncoder<ProtectionInput & { kid: string }> {
  private readonly accessControlsTemplate: AccessControlsTemplate = {
    unifiedAccessControls: [
      {
        conditionType: "evmContract",
        chain: ":chain",
        contractAddress: ":authority",
        functionName: "hasAccessByContentId",
        functionParams: [":userAddress", ":kid"],
        functionAbi: {
          inputs: [
            {
              name: "userAddress",
              type: "address",
            },
            {
              name: "contentId",
              type: "bytes16",
            },
          ],
          name: "hasAccessByContentId",
          outputs: [
            {
              name: "hasAccess",
              type: "bool",
            },
          ],
          stateMutability: "view",
          type: "function",
        },
        returnValueTest: {
          key: "hasAccess",
          comparator: "=",
          value: "true",
        },
      },
    ],
  };

  constructor(private readonly service: Service, protected readonly parameters: LitKeystoreParameters) {}

  async encode(cek: Uint8Array, protection?: ProtectionInput & { kid: string }): Promise<EncodingResult> {
    const { litClient } = this.parameters;

    if (!protection) {
      throw new Error("Protection parameters are required for Lit Protocol encoding");
    }

    try {
      const accessControls: AccessControlsTemplate = this.buildAccessControls(protection);
      const { ciphertext, dataToEncryptHash } = await encryptString({
        ...accessControls,
        dataToEncrypt: Buffer.from(cek).toString("base64"),
      }, litClient);

      return {
        keystore: ciphertext,
        systemId: KeySystemId.CencDRM_LitV1,
        protectionData: this.buildProtectionData(
          {
            ciphertext,
            dataToEncryptHash,
          },
          accessControls,
        ),
      };
    } catch (error) {
      this.service.logger.error("Lit: encryption failed:", error);
      throw error;
    }
  }

  private buildProtectionData(cipher: EncryptResponse, accessControls?: AccessControlsTemplate) {
    const { litClient } = this.parameters;
    return {
      network: litClient.config.litNetwork,
      protectionType: ProtectionType.CencDRM_LitV1,
      variant: "eth.web3.clearkey",
      data: {
        ciphertext: cipher.ciphertext,
        hash: cipher.dataToEncryptHash,
        ...accessControls,
      },
    };
  }

  private buildAccessControls(protection?: ProtectionInput): AccessControlsTemplate {
    const accessControls: AccessControlsTemplate = {};

    const chainName = supportedChains[Number(protection?.chainId)];

    if (!chainName) {
      throw new Error(`cannot map requested chain ${protection?.chainId}`);
    }

    Object.entries(this.accessControlsTemplate).forEach(([key, value]) => {
      accessControls[key as keyof AccessControlsTemplate] = this.replaceConditionsParameters(value, {
        ...protection,
        chain: chainName,
        authority: protection?.authority ?? "",
      });
    });

    return accessControls;
  }

  private replaceConditionsParameters(
    conditions: UnifiedAccessControls,
    parameters: Record<string, string | number>,
  ): UnifiedAccessControls {
    this.service.logger.info("Generating access control conditions...");
    const accessControlConditions: UnifiedAccessControls = [];

    // Validate parameters to prevent injection
    const validatedParams = this.validateParameters(parameters);

    for (const condition of conditions) {
      accessControlConditions.push(this.safeReplaceParameters(condition, validatedParams));
    }

    return accessControlConditions;
  }

  private validateParameters(parameters: Record<string, string | number>): Record<string, string> {
    const validated: Record<string, string> = {};

    for (const [key, value] of Object.entries(parameters ?? {})) {
      const stringValue = String(value);

      // Validate parameter keys and values
      if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(key)) {
        throw new Error(`Invalid parameter key: ${key}`);
      }

      // Validate values based on expected types
      switch (key) {
        case "chain":
          if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(stringValue)) {
            throw new Error(`Invalid chain name: ${stringValue}`);
          }
          break;
        case "authority":
        case "userAddress":
          if (!/^0x[a-fA-F0-9]{40}$/.test(stringValue)) {
            throw new Error(`Invalid Ethereum address: ${stringValue}`);
          }
          break;
        case "kid":
          if (!/^0x[a-fA-F0-9]{32}$/.test(stringValue)) {
            throw new Error(`Invalid KID format: ${stringValue}`);
          }
          break;
        default:
          // Generic validation for other parameters
          if (stringValue.includes('"') || stringValue.includes("'") || stringValue.includes("\\")) {
            throw new Error(`Invalid characters in parameter ${key}: ${stringValue}`);
          }
      }

      validated[key] = stringValue;
    }

    return validated;
  }

  private safeReplaceParameters(
    condition: UnifiedAccessControls[number],
    parameters: Record<string, string>,
  ): UnifiedAccessControls[number] {
    if (typeof condition === "string") {
      let result = condition;
      for (const [key, value] of Object.entries(parameters)) {
        result = result.replace(new RegExp(`:${key}`, "g"), value);
      }
      return result;
    }

    if (Array.isArray(condition)) {
      return condition.map((item) => this.safeReplaceParameters(item, parameters));
    }

    if (condition && typeof condition === "object") {
      const result: any = {};
      for (const [key, value] of Object.entries(condition)) {
        result[key] = this.safeReplaceParameters(value, parameters);
      }
      return result;
    }

    return condition;
  }
}
