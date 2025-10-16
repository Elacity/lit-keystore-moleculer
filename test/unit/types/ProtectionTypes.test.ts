import { describe, expect, test } from "@jest/globals";
import { KeySystemId } from "../../../lib/constants/systemId.js";
import type { EncodingResult, KeyTransportOption, ProtectionInput } from "../../../lib/encoders/types.js";

describe("Protection Types and Interfaces", () => {
  describe("ProtectionInput Interface", () => {
    test("should define required fields correctly", () => {
      const protectionInput: ProtectionInput = {
        authority: "0x1234567890123456789012345678901234567890",
        ledger: "ethereum",
        chainId: 1,
      };

      expect(protectionInput.authority).toBeDefined();
      expect(protectionInput.ledger).toBeDefined();
      expect(protectionInput.chainId).toBeDefined();
      expect(typeof protectionInput.authority).toBe("string");
      expect(typeof protectionInput.ledger).toBe("string");
      expect(typeof protectionInput.chainId).toBe("number");
    });

    test("should support optional fields", () => {
      const protectionInputWithOptionals: ProtectionInput = {
        authority: "0x1234567890123456789012345678901234567890",
        ledger: "ethereum",
        chainId: 1,
        rpc: "https://ethereum-rpc.com",
        keystoreUrl: "https://keystore.example.com",
      };

      expect(protectionInputWithOptionals.rpc).toBe("https://ethereum-rpc.com");
      expect(protectionInputWithOptionals.keystoreUrl).toBe("https://keystore.example.com");
    });
  });

  describe("KeyTransportOption Interface", () => {
    test("should support hex format option", () => {
      const hexOption: KeyTransportOption = {
        format: "hex",
      };

      expect(hexOption.format).toBe("hex");
    });

    test("should support base64 format option", () => {
      const base64Option: KeyTransportOption = {
        format: "base64",
      };

      expect(base64Option.format).toBe("base64");
    });
  });

  describe("EncodingResult Interface", () => {
    test("should define required keystore field", () => {
      const encodingResult: EncodingResult = {
        keystore: "mock-keystore-data",
      };

      expect(encodingResult.keystore).toBe("mock-keystore-data");
      expect(typeof encodingResult.keystore).toBe("string");
    });

    test("should support optional systemId field", () => {
      const encodingResultWithSystemId: EncodingResult = {
        keystore: "mock-keystore-data",
        systemId: KeySystemId.CencDRM_LitV1,
      };

      expect(encodingResultWithSystemId.systemId).toBe(KeySystemId.CencDRM_LitV1);
    });

    test("should support flexible protectionData field", () => {
      const encodingResultWithProtection: EncodingResult = {
        keystore: "mock-keystore-data",
        systemId: KeySystemId.CencDRM_LitV1,
        protectionData: {
          network: "habanero",
          authority: "0x1234567890123456789012345678901234567890",
          customField: "custom-value",
        },
      };

      expect(encodingResultWithProtection.protectionData).toBeDefined();
      expect(encodingResultWithProtection.protectionData?.network).toBe("habanero");
      expect(encodingResultWithProtection.protectionData?.authority).toBeDefined();
    });
  });

  describe("Interface Type Validation", () => {
    test("should validate ProtectionInput structure", () => {
      // Test minimum required structure
      const minimalInput: ProtectionInput = {
        authority: "0x0000000000000000000000000000000000000000",
        ledger: "test",
        chainId: 0,
      };

      expect(Object.keys(minimalInput)).toContain("authority");
      expect(Object.keys(minimalInput)).toContain("ledger");
      expect(Object.keys(minimalInput)).toContain("chainId");
    });

    test("should validate EncodingResult structure", () => {
      const result: EncodingResult = {
        keystore: "test-keystore",
        systemId: KeySystemId.CencDRM_LitV1,
        protectionData: {},
      };

      expect(Object.keys(result)).toContain("keystore");
      expect("systemId" in result).toBe(true);
      expect("protectionData" in result).toBe(true);
    });

    test("should validate KeyTransportOption values", () => {
      const validFormats: KeyTransportOption["format"][] = ["hex", "base64"];

      validFormats.forEach((format) => {
        const option: KeyTransportOption = { format };
        expect(["hex", "base64"]).toContain(option.format);
      });
    });
  });
});
