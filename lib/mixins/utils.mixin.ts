import type { ServiceSchema } from "moleculer";
import { v4 as uuid } from "uuid";

export default (): ServiceSchema => ({
  name: "utils",
  methods: {
    sanitizeUUID: (id: string): string => id.replace(/-/g, "").toLowerCase(),
    randomUUID() {
      return this.sanitizeUUID(uuid());
    },
    randomBytes(size: number) {
      // assume randomUUID produce a 128-bits long
      const uuids = Math.ceil(size / 16); // 16 bytes = 128 bits
      let hex = "";
      for (let i = 0; i < uuids; i++) {
        hex += this.randomUUID();
      }
      return this.toBytes(hex.slice(0, size * 2)); // Each byte needs 2 hex chars
    },
    toBytes(value: string) {
      return new Uint8Array(
        value
          ?.replace(/^0x/, "")
          ?.match(/\w{1,2}/g)
          ?.map((h: string) => parseInt(h, 16)) ?? [],
      );
    },
    toBuffer(value: string | Uint8Array) {
      if (typeof value === "string") {
        return Buffer.from(this.toBytes(value));
      }

      return Buffer.from(value);
    },
  },
});
