/* eslint-disable @typescript-eslint/no-explicit-any */
import { LIT_NETWORK } from "@lit-protocol/constants";
import type { LIT_NETWORKS_KEYS } from "@lit-protocol/types";
import type { ServiceBroker, ServiceSettingSchema } from "moleculer";
import { Service } from "moleculer";
import LitRelayerMixin from "../lib/mixins/relayer.mixin.js";

export default class RelayerService extends Service<ServiceSettingSchema> {
  constructor(broker: ServiceBroker) {
    super(broker);
    this.parseServiceSchema({
      name: "relayer",
      settings: {
        authorizedProcessors: {},
      },
      mixins: [
        LitRelayerMixin({
          litNetwork: (process.env.LIT_NETWORK as LIT_NETWORKS_KEYS) ?? LIT_NETWORK.Datil,
          relayerApiKey: process.env.LIT_RELAYER_API_KEY as string,
          payerSecretKey: process.env.LIT_PAYER_SECRET_KEY as string,
        }) as any,
      ],
      actions: {},

      methods: {},
    });
  }
}
