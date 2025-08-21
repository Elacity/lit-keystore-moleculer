/* eslint-disable no-console */
/* eslint-disable import/prefer-default-export */
import { ethers } from "ethers";

export class AuthorityGateway {
  private readonly contract: ethers.Contract;

  constructor(address: string, signer: ethers.Signer) {
    this.contract = new ethers.Contract(
      address,
      [
        {
          inputs: [
            {
              internalType: "address",
              name: "ledger",
              type: "address",
            },
            {
              internalType: "bytes16",
              name: "_contentId",
              type: "bytes16",
            },
            {
              internalType: "bytes",
              name: "_ipKey",
              type: "bytes",
            },
          ],
          name: "registerIPWithKey",
          outputs: [
            {
              internalType: "bytes32",
              name: "",
              type: "bytes32",
            },
            {
              internalType: "bytes",
              name: "",
              type: "bytes",
            },
          ],
          stateMutability: "nonpayable",
          type: "function",
        },
      ],
      signer,
    );
  }

  async registerIPWithKey(ledger: string, contentId: string, ipKey: string): Promise<void> {
    const tx = await this.contract.registerIPWithKey(ledger, contentId, ipKey);
    try {
      await tx.wait();
    } catch (error) {
      console.warn(error);
    }
  }
}
