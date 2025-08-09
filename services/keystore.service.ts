/* eslint-disable @typescript-eslint/no-explicit-any */
import { LIT_NETWORK } from "@lit-protocol/constants";
import type { LIT_NETWORKS_KEYS } from "@lit-protocol/types";
import elliptic from "elliptic";
import { cipher, createIdentity, decryptWithPrivateKey, encryptWithPublicKey, hash, recover, sign } from "eth-crypto";
import type { Context, ServiceBroker } from "moleculer";
import { Errors, Service } from "moleculer";
import { v5 as fromString, v4 as uuid } from "uuid";
import LitProtocolMixin, { type KeystoreOptions } from "../lib/lit.mixin.js";
import UtilsMixin from "../lib/utils.mixin.js";

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
  hash: string;
  useLegacy?: boolean;
  options?: KeystoreOptions;
}

export default class KeystoreService extends Service {
  constructor(broker: ServiceBroker) {
    super(broker);
    this.parseServiceSchema({
      name: "keystore",
      description: "Keystore service",
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
        create: {
          handler: async (ctx: Context<KeystoreCreateRequest>): Promise<Record<string, any> & { store?: any }> => {
            const { hash: hashValue, useLegacy = false, options = { protocolVersion: "3.0" } } = ctx.params;

            // Generate keys pair, generate from hash will ensure unicity,
            // Given the hash is uniquely calculated
            let kid = uuid();
            const key = this.sanitizeUUID(fromString(hashValue, kid));
            kid = this.sanitizeUUID(kid);

            const privateKeys = Object.values(this.settings.authorizedProcessors);

            const response = {
              kid,
              ...(useLegacy && privateKeys.length > 0
                ? {
                    // in the future we should be able to choose among a list of privateKey
                    // anyway, in the reverse process (decrypting) we already support another
                    // processor as flow there is basically an address recovering + private key decrypting
                    ...(await this.encodeFor(privateKeys[0], null, kid, key)),
                  }
                : {
                    ...(await this.encryptWithLit(key, {
                      ...options,
                      parameters: {
                        // kid: `0x${kid}`,
                        // ...options?.parameters,
                        kid: `0xd38f0d640a6e4bf58db5cdf4cd44edb6`,
                        authority: "0x2Ba1151b5bc5B39500fF8d3b277ec6d217CB33eE",
                      },
                    })),
                  }),
            };

            await ctx.emit("keystore.created", { kid, data: response });

            return { ...response, key };
          },
        },
        unwrap: {
          // @todo: protect this endpoint with signature verification
          handler: async (ctx: Context<UnwrapRequest>): Promise<PlaintextResponse> => {
            const { data, kid } = ctx.params;

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
            const { key, guardian } = await ctx.call<PlaintextResponse, { kid: string; data: string }>(`${this.name}.unwrap`, {
              kid,
              data,
            });

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

          const pubKey = remoteKey ?? curve.keyFromPrivate(privateKey.slice(2)).getPublic("hex").slice(2);

          if (pubKey.length > 128) {
            pubKey.slice(pubKey.length - 128, 128);
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
      },
    });
  }
}
