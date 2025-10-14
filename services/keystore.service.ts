/* eslint-disable @typescript-eslint/no-explicit-any */
import { LIT_NETWORK } from "@lit-protocol/constants";
import type { LIT_NETWORKS_KEYS } from "@lit-protocol/types";
import elliptic from "elliptic";
import { cipher, createIdentity, decryptWithPrivateKey, encryptWithPublicKey, hash, recover, sign } from "eth-crypto";
import { ethers } from "ethers";
import type { Context, ServiceBroker, ServiceSettingSchema } from "moleculer";
import { Errors, Service } from "moleculer";
import { v4 as uuid, v5 as uuidFromString } from "uuid";
import ECIESKeystoreManager from "../lib/encoders/ECIESKeystore.js";
import { LitEncoderEOAManager, LitEncoderSAManager } from "../lib/encoders/lit-protocol/index.js";
import type { EncodingResult, ProtectionInput } from "../lib/encoders/types.js";
import LitProtocolMixin, { type KeystoreOptions } from "../lib/mixins/lit.mixin.js";
import UtilsMixin from "../lib/mixins/utils.mixin.js";

const EC = elliptic.ec;
const curve = new EC("secp256k1");

interface EncryptedKeyFormat {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  keystore?: Record<string, string>;
  pubKey: string;
  sig: string;
  signer?: string;
  raw: string;
}

interface PlaintextResponse {
  kid: string;
  key: string;
  guardian: string;
}

interface UnwrapRequest {
  kid: string;
  data: string;
  pubKey?: string;
  options?: KeyTransportOption;
}

interface KeyTransportOption {
  format: "hex" | "base64";
}

interface KeystoreCreateRequest {
  salt: string;
  privateKey?: string;
  options?: KeystoreOptions;
  skipEcies?: boolean;
}

interface KeystoreCreateResponse {
  kid: string;
  key: string;
  psshInputs: EncodingResult[];
}

export default class KeystoreService extends Service<ServiceSettingSchema> {
  constructor(broker: ServiceBroker) {
    super(broker);
    this.parseServiceSchema({
      name: "keystore",
      description: "Keystore service, to create and deploy keypair",
      settings: {
        authorizedProcessors: {},
      },
      mixins: [
        LitProtocolMixin({
          litNetwork: (process.env.LIT_NETWORK as LIT_NETWORKS_KEYS) ?? LIT_NETWORK.Datil,
        }) as any,
        UtilsMixin(),
      ],
      actions: {
        createIdentity: {
          handler: async () => Promise.resolve(createIdentity()),
        },
        generateLocalKey: {
          params: {
            hash: {
              type: "string",
              optional: true,
              default: uuid(),
            },
          },
          handler: async (ctx: Context<{ hash: string }>): Promise<string> =>
            Promise.resolve(this.sanitizeUUID(uuidFromString(ctx.params.hash, uuid()))),
        },
        generateKeyPair: {
          params: {
            salt: {
              type: "string",
              optional: true,
              default: uuid(),
            },
          },
          /**
           * This method is used to generate a key pair from a hash value.
           * Generated key pair are both 128-bits long in compliance to [RFC4122](https://www.ietf.org/rfc/rfc4122.txt)
           * as requirement to media track identification
           *
           * @param ctx<{hash: string}> - The hash value to generate the key pair from
           * @returns {kid: string; key: string} - The key pair generated from the hash value
           */
          handler: async (ctx: Context<{ salt: string }>): Promise<{ kid: string; key: string }> => {
            const { salt } = ctx.params;

            // Generate keys pair, generate from hash will ensure unicity,
            // Given the hash is uniquely calculated
            let kid = uuid();
            const key = this.sanitizeUUID(uuidFromString(salt, kid));
            kid = this.sanitizeUUID(kid);

            return Promise.resolve({ kid, key });
          },
        },
        create: {
          params: {
            salt: {
              type: "string",
              optional: true,
              default: uuid(),
            },
            privateKey: {
              type: "string",
              optional: true,
            },
            options: {
              type: "object",
              optional: true,
              props: {
                protocolParameters: {
                  type: "object",
                  optional: true,
                  props: {
                    authority: {
                      type: "string",
                    },
                    ledger: {
                      type: "string",
                    },
                    chainId: {
                      type: "number",
                    },
                    rpc: {
                      type: "string",
                    },
                    keystoreUrl: {
                      type: "string",
                      optional: true,
                    },
                  },
                },
              },
              default: {
                protocolParameters: {},
              },
            },
          },
          handler: async (ctx: Context<KeystoreCreateRequest>): Promise<KeystoreCreateResponse> => {
            const { salt, privateKey: pk, options, skipEcies } = ctx.params;
            const { kid, key } = await ctx.call<{ kid: string; key: string }, { salt: string }>(`${this.name}.generateKeyPair`, {
              salt,
            });

            const { protocolParameters } = options as KeystoreOptions;

            const response: KeystoreCreateResponse = {
              kid,
              key,
              psshInputs: [],
            };

            const privateKey = pk ?? (Object.values(this.settings.authorizedProcessors).at(0) as string) ?? null;

            await Promise.all([
              (async () => {
                if (privateKey && !skipEcies) {
                  // is any private key is provided, we add the ECIES encoding
                  // to the response, encoded with the private key itself
                  const eciesEncoder = new ECIESKeystoreManager(this, {
                    privateKey,
                    kid,
                    curve: "secp256k1" as unknown as elliptic.curves.PresetCurve,
                    extraOptions: {
                      format: "hex",
                    },
                  });
                  try {
                    response.psshInputs.push(
                      await eciesEncoder.encode(new Uint8Array(Buffer.from(key, "hex")), protocolParameters as ProtectionInput),
                    );
                  } catch (e) {
                    this.logger.warn("failed to push with ECIES method to blockchain", e);
                  }
                }
              })(),
              (async () => {
                // lit protocol-based keystore which use access control conditions
                // based on rpc calls directly to the authority contract
                // regardless of Lit protocol support of the chain (should work on ESC)
                const litEncoder = new LitEncoderEOAManager(this, {
                  litClient: this.lit,
                });
                try {
                  response.psshInputs.push(
                    await litEncoder.encode(new Uint8Array(Buffer.from(key, "hex")), {
                      kid: `0x${kid}`,
                      ...(protocolParameters as ProtectionInput),
                    }),
                  );
                } catch (e) {
                  this.logger.warn("failed to push to lit", e);
                }
              })(),
              (async () => {
                // lit protocol-based keystore which use access control conditions
                // based on rpc calls directly to the authority contract
                // regardless of Lit protocol support of the chain (works only in context of smart account)
                const litEncoder = new LitEncoderSAManager(this, {
                  litClient: this.lit,
                });
                try {
                  response.psshInputs.push(
                    await litEncoder.encode(new Uint8Array(Buffer.from(key, "hex")), {
                      kid: `0x${kid}`,
                      ...(protocolParameters as ProtectionInput),
                    }),
                  );
                } catch (e) {
                  this.logger.warn("failed to push to lit", e);
                }
              })(),
            ]);

            if (response.psshInputs.length === 0) {
              throw new Errors.MoleculerError("No encoding was performed", 400, "NO_ENCODING_PERFORMED");
            }

            await ctx.emit("keystore.created", { kid, data: response.psshInputs });

            return { ...response };
          },
        },
        transfer: {
          // @todo: protect this endpoint with signature verification
          params: {
            kid: "string",
            data: "string",
            pubKey: "string",
            options: {
              type: "object",
              optional: true,
              default: {
                format: "hex",
              },
              props: {
                format: {
                  type: "string",
                  optional: true,
                },
              },
            },
          },
          async handler(ctx: Context<UnwrapRequest>) {
            const { kid, data, pubKey, options } = ctx.params;

            this.logger.info("Transfering keystore for read to", pubKey);
            const { key, guardian } = await this.unwrap(kid, data);

            return {
              kid,
              ...(await this.encodeFor(this.settings.authorizedProcessors[guardian], pubKey, kid, key, options || {})),
            };
          },
        },
      },

      methods: {
        /**
         * This methods encode a plaintext into ciphertext using ECIES scheme
         * https://cryptobook.nakov.com/asymmetric-key-ciphers/ecies-public-key-encryption
         *
         * @param privateKey - private key of the sender
         * @param remoteKey - public key of the receiver, if it's null the public key will be derived from the private key
         * @param kid - key identifier, it will be used for signature verification
         * @param key - the plaintext to encrypt
         * @returns
         */
        encodeFor: async (
          privateKey: string,
          remoteKey: string | null,
          kid: string,
          key: string,
          options?: KeyTransportOption,
        ): Promise<EncryptedKeyFormat> => {
          const opts: KeyTransportOption = {
            format: "hex",
            ...options,
          };

          // we process the signature with KID so we can recover it in
          // prior in the reverse process
          const hashedValue = hash.keccak256(kid);
          const sig = sign(privateKey, hashedValue);

          let pubKey = remoteKey ?? curve.keyFromPrivate(privateKey.slice(2)).getPublic("hex").slice(2);

          if (pubKey.length > 128) {
            pubKey = pubKey.slice(pubKey.length - 128);
          }

          let formattedKey: string = key;
          switch (opts.format) {
            case "base64":
              formattedKey = Buffer.from(key, "hex").toString("base64url");
              break;
            case "hex":
            default:
              formattedKey = key.toString();
              break;
          }

          const keystore = await encryptWithPublicKey(pubKey, formattedKey);

          return {
            // keystore,
            pubKey,
            sig,

            // sig already have 0x prefix, and cipher.strignify doesnt
            // we need to conccat both with that prefix
            // (0x + (r, s, v)[65 bytes] + cipher)
            raw: sig + cipher.stringify(keystore),
          };
        },

        unwrap: async (kid: string, data: string): Promise<PlaintextResponse> => {
          // considering format of the data which include 0x
          const siglen = data.match(/^0x/) ? 132 : 130;
          const sig = data.slice(0, siglen);

          // recover signature
          const processorAddr = recover(sig, hash.keccak256(kid)).toLowerCase();

          if (!this.settings.authorizedProcessors[processorAddr]) {
            throw new Errors.MoleculerError("unauthorized processor or invalid signature", 401, "UNAUTHORIZED_PROCESSOR");
          }

          const jsonKey = cipher.parse(data.slice(siglen));
          const pk = this.settings.authorizedProcessors[processorAddr];

          const key = await decryptWithPrivateKey(pk, jsonKey);

          // decode the raw data
          return {
            kid,
            key,
            guardian: processorAddr,
          };
        },
      },

      started() {
        if (process.env.ETH_PK) {
          // initialize wallet, prepare for ECIES encoding, unwrap and transfer
          // used for legacy workflow (backwards compatibility)
          const wallet = new ethers.Wallet(process.env.ETH_PK);
          if (!this.settings) {
            this.settings = {};
          }
          this.settings.authorizedProcessors[wallet.address.toLowerCase()] = wallet.privateKey;
        }
      },
    });
  }
}
