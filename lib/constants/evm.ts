/**
 * @description This list is based on which EVM chains Lit Protocol supports
 * crossed with ecosystem Elacity have deployed smart contracts for.
 * @see https://developer.litprotocol.com/resources/supported-chains
 */
export const supportedChains: Record<number, string> = {
  421614: "arbitrumSepolia",
  8453: "base",
};

/**
 * @description Check if a chain is supported by Lit Protocol
 *
 * @param chainId - The chain ID to check
 * @returns True if the chain is supported, false otherwise
 */
export function isSupportedChain(chainId: number): chainId is keyof typeof supportedChains {
  return chainId in supportedChains;
}
