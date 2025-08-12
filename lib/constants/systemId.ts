/* eslint-disable @typescript-eslint/naming-convention */
export enum ProtectionType {
  Clearkey = "clearkey",

  // This use the pssh box and inject data needed to connect to the blockchain
  // To retrieve license data including decryption key, technically this protection
  // Method is a variant of clearkey but rely on PSSH box instead of license server
  CencDRM_V1 = "cenc:web3-drm-v1",

  // This DRM system use Lit Protocol to store license data
  // which is bound to the (KID, CEK) pair
  CencDRM_LitV1 = "cenc:lit-drm-v1",
}

export enum KeySystemId {
  Clearkey = "e2719d58a985b3c9781ab030af78d30e",
  CencDRM_V1 = "bf8ef85d2c54475d8c1ee27db60332a2",
  CencDRM_LitV1 = "b785554688e540f8ba99c3e33033fbee",
}
