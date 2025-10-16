/* eslint-disable @typescript-eslint/no-parameter-properties */
import elliptic from "elliptic";
import { cipher, encryptWithPublicKey, hash, sign } from "eth-crypto";
import { ethers } from "ethers";
import type { Service } from "moleculer";
import { KeySystemId, ProtectionType } from "../constants/systemId.js";
import { AuthorityGateway } from "../utils/contract.js";
import type { EncodingResult, ICEKEncoder, KeyTransportOption, ProtectionInput } from "./types.js";

/**
 * ECIESKeystoreParameters is a class that implements
 * the ECIESKeystoreParameters interface.
 */
interface ECIESKeystoreParameters {
  privateKey: string;
  remoteKey?: string | null;
  curve: elliptic.curves.PresetCurve;
  kid: string;
  extraOptions?: KeyTransportOption;
}

/**
 * ECIESKeystoreManager is a class that implements the ICEKEncoder interface.
 *
 * It basically encodes a plaintext into ciphertext using ECIES scheme.
 * @see https://cryptobook.nakov.com/asymmetric-key-ciphers/ecies-public-key-encryption
 */
export default class ECIESKeystoreManager implements ICEKEncoder<ProtectionInput> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(private readonly service: Service, protected readonly parameters: ECIESKeystoreParameters) {}

  async encode(cek: Uint8Array, protection?: ProtectionInput): Promise<EncodingResult> {
    const { privateKey, remoteKey, kid, extraOptions, curve: curveName } = this.parameters;
    const opts: KeyTransportOption = {
      format: "hex",
      ...extraOptions,
    };

    // eslint-disable-next-line new-cap
    const curve = new elliptic.ec(curveName);

    // we process the signature with KID so we can recover it in
    // prior in the reverse process
    const hashedValue = hash.keccak256(kid);
    const sig = sign(privateKey, hashedValue);

    let pubKey = remoteKey ?? curve.keyFromPrivate(privateKey.slice(2)).getPublic("hex").slice(2);

    if (pubKey.length > 128) {
      pubKey = pubKey.slice(pubKey.length - 128);
    }

    const formattedKey = Buffer.from(cek).toString(opts.format);
    const keystore = await encryptWithPublicKey(pubKey, formattedKey);

    if (protection) {
      try {
        await this.pushToBlockchain(kid, sig + cipher.stringify(keystore), protection);
        this.service.logger.info(`new key generated with KID=${kid}`, { chainId: protection.chainId });
      } catch (error) {
        this.service.logger.error(`Failed to register key ${kid} on blockchain:`, error);
        throw error;
      }
    }

    return {
      // sig already have 0x prefix, and cipher.strignify doesnt
      // we need to conccat both with that prefix
      // (0x + (r, s, v)[65 bytes] + cipher)
      keystore: sig + cipher.stringify(keystore),
      ...(protection && {
        systemId: KeySystemId.CencDRM_V1,
        protectionData: this.buildProtectionData(pubKey, protection),
      }),
    };
  }

  /**
   * Builds the protection data for the ECIES keystore.
   *
   * @param publicKey - The public key of the ECIES keystore.
   * @param protection - The protection data to be included in the protection data.
   * @returns The protection data for the ECIES keystore.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private buildProtectionData(publicKey: string, protection?: ProtectionInput): Record<string, any> {
    return {
      protectionType: ProtectionType.CencDRM_V1,
      variant: "eth.web3.clearkey",
      ciphersuite: "e8582013",
      data: {
        publicKey,
        ...(protection && {
          ...protection,
        }),
      },
    };
  }

  /**
   * Pushes the keystore to the blockchain.
   *
   * @param kid - The KID of the keystore.
   * @param keystore - The keystore to be pushed to the blockchain.
   * @param protection - The protection data to be included in the protection data.
   */
  private async pushToBlockchain(kid: string, keystore: string, protection: ProtectionInput) {
    const { privateKey } = this.parameters;

    const authority = new AuthorityGateway(
      protection.authority,
      new ethers.Wallet(privateKey, new ethers.providers.JsonRpcProvider(protection.rpc)),
    );

    await authority.registerIPWithKey(protection.ledger, `0x${kid}`, keystore);
  }
}
