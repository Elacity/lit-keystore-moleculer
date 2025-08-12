# Create New Keypair Workflow (KID, CEK)

## Overview

This workflow describes the process of creating a new cryptographic key pair consisting of a Key Identifier (KID) and Content Encryption Key (CEK) for media encryption in the ELA.CITY DRM ecosystem.

## Key Requirements

Both keys are 128-bits long in compliance with [RFC4122](https://www.ietf.org/rfc/rfc4122.txt) as required for:
- Media track identification
- License setup in [Media Source Extension](https://www.w3.org/TR/encrypted-media-2/#clear-key-license-format) context
- MPEG-DASH content protection

## Implementation Details

The service uses the `uuid()` package for cryptographically secure key generation with deterministic properties based on input salt values.

## Workflow Steps

### 1. Key Pair Generation

```javascript
// Call the key generation service
const keyPair = await broker.call("keystore.generateKeyPair", {
  salt: "unique-content-identifier" // Optional, defaults to random UUID
});

// Returns:
// {
//   kid: "f47ac10b58cc4372a5670e02b2c3d479", // 128-bit Key Identifier
//   key: "6ba7b810-9dad-11d1-80b4-00c04fd430c8"  // 128-bit Content Encryption Key
// }
```

### 2. Key Encoding and Storage

```javascript
// Create encoded keystore with multiple protocols
const encodedKeystore = await broker.call("keystore.create", {
  salt: keyPair.kid,
  options: {
    protocolParameters: {
      authority: "0x...", // Authority contract address
      ledger: "0x...",    // Ledger contract address
      chainId: 20,        // Elastos Smart Chain mainnet
      rpc: "https://api.elastos.io/eth"
    }
  }
});

// Returns multiple encodings:
// {
//   kid: "...",
//   key: "...",
//   psshInputs: [
//     { /* ECIES encoding */ },
//     { /* Lit Protocol encoding */ }
//   ]
// }
```

### 3. PSSH Box Integration

The generated `psshInputs` are embedded into MPEG-DASH Protection System Specific Header (PSSH) boxes:

```xml
<!-- DASH MPD with PSSH boxes -->
<ContentProtection schemeIdUri="urn:uuid:bf8ef85d-2c54-475d-8c1e-e27db60332a2">
  <pssh>base64_encoded_ecies_data</pssh>
</ContentProtection>
<ContentProtection schemeIdUri="urn:uuid:b7855546-88e5-40f8-ba99-c3e33033fbee">
  <pssh>base64_encoded_lit_data</pssh>
</ContentProtection>
```

## Key Generation Algorithm

### Deterministic Generation
```typescript
// UUID v5 generation for deterministic keys
let kid = uuid(); // Random UUID v4 for KID
const key = sanitizeUUID(uuidFromString(salt, kid)); // UUID v5 from salt and KID
kid = sanitizeUUID(kid); // Remove hyphens for consistency
```

### UUID Sanitization
```typescript
// Remove hyphens and convert to lowercase
sanitizeUUID(id: string): string {
  return id.replace(/-/g, "").toLowerCase();
}
```

## Protocol-Specific Encoding

### ECIES Encoding (Legacy Compatibility)
- Uses elliptic curve cryptography (secp256k1)
- Signature-based authentication
- Blockchain registration via smart contracts
- System ID: `bf8ef85d2c54475d8c1ee27db60332a2`

### Lit Protocol Encoding (Modern)
- Decentralized threshold cryptography
- Programmable access control conditions
- Smart contract-based permissions
- System ID: `b785554688e540f8ba99c3e33033fbee`

## Security Considerations

### Key Properties
- **Uniqueness**: Salt-based generation ensures unique keys per content
- **Deterministic**: Same salt produces same key pair (for reproducibility)
- **Cryptographically Secure**: Uses secure random number generation
- **Standard Compliant**: RFC4122 UUID format

### Access Control
- Keys are protected by cryptographic signatures
- Access control enforced through smart contracts
- Multiple authorization mechanisms (ECIES signatures + Lit conditions)

## Error Handling

### Common Error Scenarios
```javascript
// No encoding performed
if (psshInputs.length === 0) {
  throw new Error("NO_ENCODING_PERFORMED");
}

// Unsupported chain
if (!isSupportedChain(chainId)) {
  throw new Error("UNSUPPORTED_CHAIN");
}

// Invalid parameters
if (!authority || !ledger) {
  throw new Error("MISSING_PROTOCOL_PARAMETERS");
}
```

## Integration Examples

### Media Encoder Integration
```javascript
// 1. Generate keys for new content
const keys = await broker.call("keystore.generateKeyPair", {
  salt: contentHash
});

// 2. Create encoded keystore
const keystore = await broker.call("keystore.create", {
  salt: keys.kid,
  options: { protocolParameters }
});

// 3. Use keys for media encryption
const encryptedMedia = await encryptContent(mediaData, keys.key);

// 4. Embed PSSH data in DASH manifest
const manifest = createDashManifest(encryptedMedia, keystore.psshInputs);
```

### Media Player Integration
```javascript
// Player receives PSSH boxes and extracts system-specific data
const systemId = extractSystemId(psshBox);
const keystoreData = extractKeystoreData(psshBox);

// Request key from appropriate system
if (systemId === KeySystemId.CencDRM_LitV1) {
  // Use Lit Protocol for key retrieval
  const key = await litProtocol.decrypt(keystoreData);
} else if (systemId === KeySystemId.CencDRM_V1) {
  // Use ECIES for key retrieval
  const key = await eciesDecrypt(keystoreData);
}
```

## Monitoring and Metrics

### Key Generation Metrics
- Keys generated per second
- Encoding success/failure rates
- Protocol distribution (ECIES vs Lit)
- Error rates by type

### Performance Considerations
- Key generation: ~1ms per key pair
- ECIES encoding: ~10-50ms (includes blockchain call)
- Lit Protocol encoding: ~100-500ms (network dependent)
- Total creation time: ~200-600ms for dual encoding

## Best Practices

### Salt Selection
- Use content-specific identifiers as salt
- Ensure salt uniqueness across content
- Avoid predictable salt patterns
- Consider content versioning in salt

### Key Management
- Rotate keys for long-lived content
- Monitor key usage patterns
- Implement key lifecycle management
- Maintain audit trails for key operations

## Troubleshooting

### Common Issues
1. **Blockchain Connection**: Ensure RPC endpoint is accessible
2. **Lit Protocol**: Verify network connectivity and configuration
3. **Key Collisions**: Use unique salts to prevent duplicate keys
4. **Performance**: Monitor encoding times and optimize as needed
