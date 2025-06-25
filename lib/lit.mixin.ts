/* eslint-disable func-names */
import { LitNodeClient } from "@lit-protocol/lit-node-client";
import type { AccessControlConditions, LIT_NETWORKS_KEYS } from "@lit-protocol/types";
import type { ServiceSchema } from "moleculer";

interface LitSettings {
  litNetwork: LIT_NETWORKS_KEYS;
}

export default (settings: LitSettings): ServiceSchema<LitSettings> => ({
  name: "lit",
  settings,
  lit: null as unknown as LitNodeClient,
  actions: {},
  methods: {
    async encryptWithLit(hexData: string) {
      const dataBytes = Buffer.from(hexData, "hex");

      const accessControl: AccessControlConditions = [];

      const { ciphertext, dataToEncryptHash } = await (this.lit as LitNodeClient).encrypt({
        accessControlConditions: accessControl,
        dataToEncrypt: dataBytes,
      });

      return {
        ciphertext,
        hash: dataToEncryptHash,
      };
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
