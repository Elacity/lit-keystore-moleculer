/* eslint-disable @typescript-eslint/no-explicit-any */
import type { KeySystemId } from "../constants/systemId.js";

export interface ProtectionInput {
  authority: string;
  ledger: string;
  chainId: number;
  rpc?: string;
  keystoreUrl?: string;
}

export interface KeyTransportOption {
  format: "hex" | "base64";
}

export interface EncodingResult {
  keystore: string;
  systemId?: KeySystemId;
  protectionData?: Record<string, any>;
}

export interface ICEKEncoder<T extends ProtectionInput> {
  encode: (cek: Uint8Array, protection?: T) => Promise<EncodingResult>;
}
