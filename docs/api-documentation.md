# API Documentation: Lit Keystore Moleculer Service

## Overview

The Lit Keystore Moleculer Service provides secure key management capabilities for the ELA.CITY DRM ecosystem. It supports dual encryption protocols (ECIES and Lit Protocol) while maintaining backward compatibility with legacy systems.

## Service Information

- **Service Name**: `keystore`
- **Version**: `0.1.0`
- **Protocol**: Moleculer microservice
- **Transport**: NATS (configurable)

## Actions

### `keystore.createIdentity`

Creates a new cryptographic identity for use in the ecosystem.

#### Parameters
None

#### Returns
```typescript
{
  address: string;      // Ethereum address
  privateKey: string;   // Private key (hex format)
  publicKey: string;    // Public key (hex format)
}
```

#### Example
```javascript
const identity = await broker.call("keystore.createIdentity");
console.log(identity);
// {
//   address: "0x1234...",
//   privateKey: "0xabcd...",
//   publicKey: "0x04..."
// }
```

---

### `keystore.generateLocalKey`

Generates a local key from a hash value for deterministic key generation.

#### Parameters
```typescript
{
  hash?: string;  // Optional hash value (default: random UUID)
}
```

#### Returns
```typescript
string  // 128-bit key in hex format (UUID v5 based)
```

#### Example
```javascript
const key = await broker.call("keystore.generateLocalKey", {
  hash: "content-identifier-123"
});
console.log(key); // "a1b2c3d4e5f6789012345678901234ab"
```

---

### `keystore.generateKeyPair`

Generates a cryptographic key pair (KID, CEK) for media encryption.

#### Parameters
```typescript
{
  salt?: string;  // Optional salt for key generation (default: random UUID)
}
```

#### Returns
```typescript
{
  kid: string;  // Key Identifier (128-bit, hex format)
  key: string;  // Content Encryption Key (128-bit, hex format)
}
```

#### Example
```javascript
const keyPair = await broker.call("keystore.generateKeyPair", {
  salt: "unique-content-salt"
});
console.log(keyPair);
// {
//   kid: "f47ac10b58cc4372a5670e02b2c3d479",
//   key: "6ba7b810-9dad-11d1-80b4-00c04fd430c8"
// }
```

---

### `keystore.create`

Creates and encodes a key pair using multiple encryption protocols based on the provided options.

#### Parameters
```typescript
{
  salt?: string;           // Optional salt for key generation
  privateKey?: string;     // Optional private key for ECIES encoding
  options?: {
    protocolParameters?: {
      authority: string;     // Authority contract address
      ledger: string;        // Ledger contract address
      chainId: number;       // Blockchain chain ID
      rpc: string;          // RPC endpoint URL
      keystoreUrl?: string; // Optional keystore service URL
    };
  };
}
```

#### Returns
```typescript
{
  kid: string;                    // Key Identifier
  key: string;                    // Content Encryption Key
  psshInputs: EncodingResult[];   // Array of encoding results
}

interface EncodingResult {
  keystore: string;                    // Encoded keystore data
  systemId?: KeySystemId;             // DRM system identifier
  protectionData?: Record<string, any>; // Protocol-specific protection data
}
```

#### Example
```javascript
const result = await broker.call("keystore.create", {
  salt: "content-123",
  options: {
    protocolParameters: {
      authority: "0x1234567890123456789012345678901234567890",
      ledger: "0x0987654321098765432109876543210987654321",
      chainId: 20,
      rpc: "https://api.elastos.io/eth"
    }
  }
});

console.log(result);
// {
//   kid: "f47ac10b58cc4372a5670e02b2c3d479",
//   key: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
//   psshInputs: [
//     {
//       keystore: "0x1234...",
//       systemId: "bf8ef85d2c54475d8c1ee27db60332a2",
//       protectionData: { /* ECIES protection data */ }
//     },
//     {
//       keystore: "encrypted_data...",
//       systemId: "b785554688e540f8ba99c3e33033fbee",
//       protectionData: { /* Lit Protocol protection data */ }
//     }
//   ]
// }
```

---

### `keystore.unwrap`

Unwraps an encrypted key using signature verification for authorization.

#### Parameters
```typescript
{
  kid: string;    // Key Identifier
  data: string;   // Encrypted key data (signature + ciphertext)
}
```

#### Returns
```typescript
{
  kid: string;      // Key Identifier
  key: string;      // Decrypted key
  guardian: string; // Address of the authorized processor
}
```

#### Example
```javascript
const result = await broker.call("keystore.unwrap", {
  kid: "f47ac10b58cc4372a5670e02b2c3d479",
  data: "0x1234567890abcdef..." // signature + encrypted data
});

console.log(result);
// {
//   kid: "f47ac10b58cc4372a5670e02b2c3d479",
//   key: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
//   guardian: "0x1234567890123456789012345678901234567890"
// }
```

---

### `keystore.transfer`

Transfers a key to a different public key by re-encrypting it.

#### Parameters
```typescript
{
  kid: string;     // Key Identifier
  data: string;    // Encrypted key data
  pubKey: string;  // Target public key for re-encryption
  options?: {
    format?: "hex" | "base64";  // Output format (default: "hex")
  };
}
```

#### Returns
```typescript
{
  kid: string;      // Key Identifier
  pubKey: string;   // Target public key
  sig: string;      // New signature
  raw: string;      // Re-encrypted data (signature + ciphertext)
}
```

#### Example
```javascript
const result = await broker.call("keystore.transfer", {
  kid: "f47ac10b58cc4372a5670e02b2c3d479",
  data: "0x1234567890abcdef...",
  pubKey: "0x04abcdef...",
  options: { format: "hex" }
});

console.log(result);
// {
//   kid: "f47ac10b58cc4372a5670e02b2c3d479",
//   pubKey: "0x04abcdef...",
//   sig: "0x1234...",
//   raw: "0x1234...encrypted_data"
// }
```

## Events

### `keystore.created`

Emitted when a new keystore is successfully created.

#### Payload
```typescript
{
  kid: string;                  // Key Identifier
  data: EncodingResult[];       // Array of encoding results
}
```

#### Example
```javascript
broker.on("keystore.created", (payload) => {
  console.log(`New keystore created: ${payload.kid}`);
  console.log(`Encodings: ${payload.data.length}`);
});
```

## Error Codes

### `UNAUTHORIZED_PROCESSOR`
- **Code**: 401
- **Message**: "unauthorized processor or invalid signature"
- **Cause**: Invalid signature or unauthorized processor address

### `NO_ENCODING_PERFORMED`
- **Code**: 400
- **Message**: "No encoding was performed"
- **Cause**: No suitable encoding method available for the given parameters

### `INVALID_CHAIN`
- **Code**: 400
- **Message**: "cannot map requested chain {chainId}"
- **Cause**: Unsupported or invalid blockchain chain ID

## System Identifiers

The service uses specific system identifiers for different DRM systems:

```typescript
enum KeySystemId {
  Clearkey = "e2719d58a985b3c9781ab030af78d30e",
  CencDRM_V1 = "bf8ef85d2c54475d8c1ee27db60332a2",      // ECIES-based
  CencDRM_LitV1 = "b785554688e540f8ba99c3e33033fbee",   // Lit Protocol-based
}
```

## Protection Types

```typescript
enum ProtectionType {
  Clearkey = "clearkey",
  CencDRM_V1 = "cenc:web3-drm-v1",      // ECIES-based DRM
  CencDRM_LitV1 = "cenc:lit-drm-v1",    // Lit Protocol-based DRM
}
```

## Configuration

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `ETH_PK` | Private key for ECIES operations | No | - |
| `LIT_NETWORK` | Lit Protocol network | No | `datil` |
| `NAMESPACE` | Moleculer namespace | No | `""` |
| `TRANSPORTER` | Moleculer transporter | No | `null` |
| `LOG_LEVEL` | Logging level | No | `info` |

### Supported Chains

The service supports the following blockchain networks:

```typescript
const supportedChains: Record<number, string> = {
  1: "ethereum",
  20: "elastos", // Elastos Smart Chain mainnet
  21: "elastosTestnet", // Elastos Smart Chain testnet
  421614: "arbitrumSepolia",
  8453: "baseSepolia",
};
```

## Security Considerations

### Authentication
- All key unwrapping operations require valid ECDSA signatures
- Signature verification uses the KID as the message to prevent replay attacks
- Only authorized processor addresses can perform key operations

### Access Control
- Lit Protocol integration provides programmable access control
- Smart contract-based permission verification
- Decentralized access control conditions

### Key Management
- Keys are generated using cryptographically secure random number generation
- Private keys should be stored securely (not in environment variables in production)
- Key rotation should be implemented for long-term deployments

## Usage Examples

### Basic Key Creation
```javascript
// Generate a simple key pair
const keyPair = await broker.call("keystore.generateKeyPair");

// Create encoded keystore with ECIES only
const keystore = await broker.call("keystore.create", {
  salt: keyPair.kid,
  privateKey: "0x1234..." // Your private key
});
```

### Lit Protocol Integration
```javascript
// Create keystore with Lit Protocol support
const keystore = await broker.call("keystore.create", {
  salt: "unique-content-id",
  options: {
    protocolParameters: {
      authority: "0x...", // Authority contract
      ledger: "0x...",    // Ledger contract
      chainId: 21,        // Elastos Smart Chain
      rpc: "https://api.elastos.io/eth"
    }
  }
});
```

### Key Recovery
```javascript
// Unwrap a key for decryption
const unwrapped = await broker.call("keystore.unwrap", {
  kid: "f47ac10b58cc4372a5670e02b2c3d479",
  data: "0x..." // Signed encrypted data
});

// Transfer key to another party
const transferred = await broker.call("keystore.transfer", {
  kid: unwrapped.kid,
  data: "0x...", // Original encrypted data
  pubKey: "0x04..." // Target public key
});
```

## Integration Notes

### PSSH Box Integration
The `psshInputs` returned by the `create` action are designed to be embedded in PSSH (Protection System Specific Header) boxes for MPEG-DASH content protection.

### Media Player Integration
The generated system IDs correspond to specific DRM implementations that media players can recognize and handle appropriately.

### Blockchain Integration
ECIES-encoded keys are automatically registered on the blockchain when protection parameters are provided, enabling decentralized key management and access control.
