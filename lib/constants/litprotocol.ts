export interface NetworkConfig {
  relayerBaseUrl: string;
  payer: string;
  delegationContract: string;
}

export const ecosystem: Record<string, NetworkConfig> = {
  datil: {
    relayerBaseUrl: "https://datil-relayer.getlit.dev",
    payer: "0x581D4bca99709c1E0cB6f07c9D05719818AA6e49", // sec. "L9LwH..."
    delegationContract: "0xF19ea8634969730cB51BFEe2E2A5353062053C14",
  },
  "datil-test": {
    relayerBaseUrl: "https://datil-test-relayer.getlit.dev",
    payer: "0x16BA0779c9e099F9fb7396992Cb3722220EA7385", // sec. "xjDfx..."
    delegationContract: "0xd7188e0348F1dA8c9b3d6e614844cbA22329B99E",
  },
};

export const delegationContractAbi = [
  {
    name: "getPayers",
    type: "function",
    stateMutability: "view",
    inputs: [
      {
        name: "user",
        type: "address",
      },
    ],
    outputs: [
      {
        name: "payers",
        type: "address[]",
      },
    ],
  },
  {
    name: "getPayersAndRestrictions",
    type: "function",
    stateMutability: "view",
    inputs: [
      {
        name: "users",
        type: "address[]",
      },
    ],
    outputs: [
      {
        name: "payers",
        type: "address[][]",
      },
      {
        name: "restrictions",
        type: "tuple[][]",
        components: [
          {
            name: "requestsPerPeriod",
            type: "uint256",
          },
          {
            name: "periodSeconds",
            type: "uint256",
          },
        ],
      },
    ],
  },
];
