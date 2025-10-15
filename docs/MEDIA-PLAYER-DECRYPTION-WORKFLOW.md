# Media Player Decryption Workflow Documentation

## Overview

This document provides a comprehensive technical overview of the decryption workflow in the media-player project, focusing on how encrypted content is decrypted using the Lit Protocol for both Externally Owned Accounts (EOA) and Smart Accounts.

## Architecture Overview

The media player implements a sophisticated DRM system that supports multiple protection types:

- **`cenc:web3-drm-v1`**: Web3-based DRM protection
- **`cenc:lit-drm-v1`**: Lit Protocol DRM for Externally Owned Accounts (EOA)
- **`cenc:lit-drm-sa-v1`**: Lit Protocol DRM for Smart Accounts

## Complete Decryption Flow

```mermaid
graph TD
    A[Media Player Starts] --> B[Encrypted Content Request]
    B --> C[Parse PSSH Box]
    C --> D[Extract Protection Data]
    D --> E{Protection Type?}
    
    E -->|cenc:web3-drm-v1| F[Web3BasedLicenseRequest]
    E -->|cenc:lit-drm-v1| G[LitLicenseRequest - EOA]
    E -->|cenc:lit-drm-sa-v1| H[LitLicenseRequest - SA]
    
    F --> I[Web3 License Processing]
    G --> J[EOA Lit Processing]
    H --> K[Smart Account Lit Processing]
    
    I --> L[Return License]
    J --> L
    K --> L
    
    L --> M[Decrypt Content]
    M --> N[Play Media]
```

## License Request System

### Main Entry Point

The `LicenseRequest` class serves as the central coordinator:

```mermaid
sequenceDiagram
    participant Player
    participant LicenseRequest
    participant Processor
    participant LitClient

    Player->>LicenseRequest: new LicenseRequest(refs, options)
    LicenseRequest->>LicenseRequest: buildRequestProcessor()
    LicenseRequest->>Processor: Create specific processor
    Player->>LicenseRequest: process(entity, payload)
    LicenseRequest->>Processor: execute(entity, payload, body)
    Processor->>LitClient: Lit Protocol operations
    LitClient->>Processor: Decrypted license
    Processor->>LicenseRequest: License data
    LicenseRequest->>Player: Return license
```

### Account Type Selection Logic

```mermaid
flowchart TD
    A[License Request] --> B{accountOverride set?}
    B -->|Yes| C[Remove cenc:lit-drm-v1]
    B -->|No| D[Remove cenc:lit-drm-sa-v1]
    
    C --> E[Use Smart Account Flow]
    D --> F[Use EOA Flow]
    
    E --> G[cenc:lit-drm-sa-v1]
    F --> H[cenc:lit-drm-v1]
    
    G --> I[LitLicenseRequest with SA config]
    H --> J[LitLicenseRequest with EOA config]
```

## Lit Protocol Decryption Workflow

### 1. Initialization Phase

```mermaid
graph TD
    A[LitLicenseRequest.execute()] --> B[Validate Protection Type]
    B --> C{Provider Available?}
    C -->|No| D[Check Certificate]
    C -->|Yes| E[Web3 Connect]
    D --> F{Certificate Valid?}
    F -->|No| G[Throw UnrecoverableError]
    F -->|Yes| H[Continue with Certificate]
    E --> I[Validate Network Chain]
    I --> J[Check Lit Protocol Support]
    J --> K{Authority Supports Lit?}
    K -->|No| L[Throw AlternatePathError]
    K -->|Yes| M[Initialize Lit Client]
    H --> M
    G --> N[End: Error]
    L --> N
    M --> O[Create Session]
```

### 2. Web3 Connection Process

```mermaid
sequenceDiagram
    participant LitRequest
    participant Provider
    participant Wallet
    participant AuthContract

    LitRequest->>Provider: Check connection type
    alt WalletConnect
        LitRequest->>Provider: provider.enable()
    else Standard Provider
        LitRequest->>Provider: eth_requestAccounts
    end
    Provider->>Wallet: Request account access
    Wallet->>Provider: Return account address
    Provider->>LitRequest: Account connected
    LitRequest->>AuthContract: authority.supportsLitProtocol()
    AuthContract->>LitRequest: Boolean response
    alt Supported
        LitRequest->>LitRequest: Continue with Lit flow
    else Not Supported
        LitRequest->>LitRequest: Throw AlternatePathError
    end
```

### 3. Lit Protocol Session Creation

```mermaid
flowchart TD
    A[createSession()] --> B[Initialize Lit Client]
    B --> C[Connect to Lit Network]
    C --> D[Get Signer from Provider]
    D --> E[Get Network Chain ID]
    E --> F[Create Resource Ability Requests]
    F --> G[Generate Session Signatures]
    
    G --> H[authNeededCallback]
    H --> I[Create SIWE Message]
    I --> J[Sign Message with Wallet]
    J --> K[Generate Auth Signature]
    K --> L[Return Session Signatures]
    
    L --> M[Store Current Session]
    M --> N{Session Valid?}
    N -->|Yes| O[Session Ready]
    N -->|No| P[Throw Session Error]
```

### 4. License Issuance Process

```mermaid
graph TD
    A[issueLicenseFor()] --> B[Check Current Session]
    B --> C{Session Exists?}
    C -->|No| D[Create Session]
    C -->|Yes| E[Extract Protection Data]
    D --> E
    
    E --> F[Parse Body Data]
    F --> G[Execute Lit Action]
    G --> H[Lit Action: Decrypt CEK]
    H --> I[Lit Action: Access Check]
    I --> J[Lit Action: Generate License]
    J --> K[Return Base64 License]
    K --> L[Convert to Binary Buffer]
```

## Access Control Verification

### EOA Access Control

```mermaid
graph TD
    A[EOA Access Check] --> B[hasAccessByContentId Call]
    B --> C[Authority Contract]
    C --> D[Direct Address Check]
    D --> E{Has Access?}
    E -->|Yes| F[Return True]
    E -->|No| G[Return False]
    
    subgraph "Contract Parameters"
        H[userAddress: Direct EOA]
        I[contentId: KID]
        J[authority: Contract Address]
        K[rpcUrl: Blockchain RPC]
    end
    
    B --> H
    B --> I
    B --> J
    B --> K
```

### Smart Account Access Control

```mermaid
flowchart TD
    A[Smart Account Access Check] --> B[resolveSmartAccountAddress()]
    B --> C[Get Network Chain ID]
    C --> D[Lookup Factory & EntryPoint]
    D --> E{Contracts Available?}
    E -->|No| F[Use Owner Address Directly]
    E -->|Yes| G[Build Init Data]
    
    G --> H[Create Call Data]
    H --> I[Make eth_call to Factory]
    I --> J[Extract Derived Address]
    J --> K[hasAccessByContentId Call]
    F --> K
    
    K --> L[Authority Contract Check]
    L --> M{Smart Account Has Access?}
    M -->|Yes| N[Return True]
    M -->|No| O[Return False]
    
    subgraph "Smart Account Resolution"
        P[Owner Address]
        Q[Factory Contract]
        R[EntryPoint Contract]
        S[Derived SA Address]
    end
```

## Lit Action Execution Flow

The core decryption logic happens in the Lit Action (`lit-action-transfer.js`):

```mermaid
sequenceDiagram
    participant Player
    participant LitRequest
    participant LitAction
    participant LitNodes
    participant AuthContract

    Player->>LitRequest: issueLicenseFor()
    LitRequest->>LitNodes: executeJs(actionIpfsId, params)
    LitNodes->>LitAction: Execute with parameters
    
    Note over LitAction: Step 1: Decrypt CEK
    LitAction->>LitNodes: decryptAndCombine()
    LitNodes->>LitAction: Access control verification
    LitAction->>AuthContract: hasAccessByContentId()
    AuthContract->>LitAction: Access granted/denied
    
    alt Access Granted
        LitNodes->>LitAction: Decrypted CEK
        Note over LitAction: Step 2: Generate License
        LitAction->>LitAction: foldCEK() - ECDH key exchange
        LitAction->>LitAction: Encrypt license for player
        LitAction->>LitAction: Sign response
        LitAction->>LitNodes: Return base64 license
    else Access Denied
        LitAction->>LitNodes: Throw access error
    end
    
    LitNodes->>LitRequest: License response
    LitRequest->>Player: Binary license data
```

## Cryptographic Operations in Lit Action

### CEK Decryption and License Generation

```mermaid
graph TD
    A[Lit Action Execution] --> B[Validate Input Parameters]
    B --> C[Decrypt CEK via Lit Protocol]
    C --> D[Access Control Verification]
    D --> E{Access Granted?}
    E -->|No| F[Throw Access Error]
    E -->|Yes| G[Import Player's Public Key]
    
    G --> H[Generate Ephemeral ECDH Key Pair]
    H --> I[Derive Shared Secret]
    I --> J[Format License Data]
    J --> K[Encrypt License with Shared Secret]
    K --> L[Export Ephemeral Public Key]
    L --> M[Sign Encrypted Response]
    M --> N[Build Final License Response]
    N --> O[Return Base64 Encoded License]
    
    F --> P[End: Error]
    O --> Q[End: Success]
    
    subgraph "License Format Structure"
        R[Header: Format + Flags]
        S[Metadata: ECDH Key + Signature]
        T[Body: Encrypted CEK]
    end
```

### ECDH Key Exchange Process

```mermaid
sequenceDiagram
    participant Player
    participant LitAction
    participant CryptoAPI

    Note over Player: Has X25519/P-256 key pair
    Player->>LitAction: publicKey (in hex)
    
    LitAction->>CryptoAPI: importKey(player's public key)
    LitAction->>CryptoAPI: generateKey(ephemeral key pair)
    LitAction->>CryptoAPI: deriveKey(shared secret)
    
    Note over LitAction: Encrypt CEK with shared secret
    LitAction->>CryptoAPI: encrypt(CEK, shared secret)
    
    LitAction->>CryptoAPI: exportKey(ephemeral public key)
    LitAction->>LitAction: Sign encrypted response
    
    LitAction->>Player: Encrypted license + ephemeral public key + signature
    
    Note over Player: Uses ephemeral public key to derive same shared secret and decrypt CEK
```

## Error Handling and Fallback Mechanisms

```mermaid
flowchart TD
    A[License Request Processing] --> B[Try Primary Method]
    B --> C{Success?}
    C -->|Yes| D[Return License]
    C -->|No| E{Error Type?}
    
    E -->|AlternatePathError| F[Try Next Processor]
    E -->|UnrecoverableError| G[Throw to Player]
    E -->|Other| H[Log and Throw]
    
    F --> I[Next Protection Type]
    I --> J{More Processors?}
    J -->|Yes| B
    J -->|No| K[All Methods Failed]
    
    G --> L[Player Shows Error]
    H --> L
    K --> M[Show Fallback Message]
    D --> N[Content Decryption Success]
```

## Network and Chain Support

### Supported Networks

```mermaid
graph LR
    A[Chain ID Mapping] --> B[421614: Arbitrum Sepolia]
    A --> C[8453: Base]
    A --> D[1: Ethereum - Default]
    
    B --> E[Lit Network Support]
    C --> E
    D --> E
    
    E --> F[Session Signature Creation]
```

### Smart Account Contract Addresses

| Chain ID | Network | Factory Contract | EntryPoint Contract |
|----------|---------|------------------|-------------------|
| 8453 | Base | `0xb3f15a44f91a08a93a11c6fbf6a4933c623275fe` | `0xba418fa699622de824b258c61eb150ed7a13967b` |

## Performance Characteristics

### Typical Operation Timing

```mermaid
gantt
    title Media Player Decryption Timeline
    dateFormat X
    axisFormat %s

    section Initialization
    PSSH Parsing        :0, 50
    Protection Type ID  :50, 100
    
    section Web3 Connection
    Wallet Connection   :100, 2000
    Network Validation  :2000, 2200
    Authority Check     :2200, 3000
    
    section Lit Protocol
    Client Initialization :3000, 4000
    Session Creation    :4000, 6000
    
    section License Generation
    Lit Action Execution :6000, 8000
    CEK Decryption      :8000, 9000
    License Encryption  :9000, 9500
    
    section Completion
    License Return      :9500, 10000
    Content Decryption  :10000, 10500
```

### Memory Usage Patterns

- **License Request Instance**: ~1-2KB
- **Lit Client**: ~5-10MB (includes network connectivity)
- **Session Data**: ~2-5KB
- **Cryptographic Operations**: ~1-3KB temporary allocations
- **License Data**: ~500B-2KB depending on key size

## Security Considerations

### Input Validation
1. **Protection Type Validation**: Ensures only supported DRM types are processed
2. **Network Chain Validation**: Verifies wallet is on correct network
3. **Authority Contract Verification**: Confirms contract supports Lit Protocol
4. **Public Key Format Validation**: Validates cryptographic key formats

### Access Control Security
1. **Double Verification**: Both Lit access control and authority contract check
2. **Session Expiration**: Sessions expire after 100 minutes
3. **Chain-Specific Validation**: Network-specific contract addresses
4. **Smart Account Resolution**: Secure derivation of SA addresses from owner

### Cryptographic Security
1. **ECDH Key Exchange**: Secure key agreement for license encryption
2. **Ephemeral Keys**: Fresh key pair for each license request
3. **Digital Signatures**: All responses are cryptographically signed
4. **Secure Random Generation**: High-quality entropy for key generation

## Troubleshooting Guide

### Common Issues

1. **"Authority does not support lit protocol"**
   ```javascript
   // Check authority contract implementation
   const authority = new ethers.Contract(authorityAddr, [
     "function supportsLitProtocol() pure returns (bool)"
   ], provider);
   const supported = await authority.supportsLitProtocol(); // Should return true
   ```

2. **"Wrong network" error**
   ```javascript
   // Ensure wallet is on correct chain
   const { chainId: providerChainId } = await provider.getNetwork();
   if (chainId !== Number(providerChainId)) {
     // Switch network or show error
   }
   ```

3. **"Session creation failed"**
   ```javascript
   // Check capacity delegation and session parameters
   const sessionSigs = await client.getSessionSigs({
     chain: chainSupportedMap[chainId] || "ethereum",
     expiration: new Date(Date.now() + 1000 * 60 * 100).toISOString(),
     // ... ensure all required parameters are present
   });
   ```

4. **Smart Account address resolution fails**
   ```javascript
   // Verify factory and entry point contracts are available
   const { factory, entryPoint } = contractsAddr[Number(chainId)] || {};
   if (!factory || !entryPoint) {
     // Fallback to owner address
   }
   ```

### Debug Information

Enable comprehensive logging:
```javascript
// In media player
player.options.debug = true;

// In Lit client
const client = new LitNodeClient({
  litNetwork: network,
  debug: true
});
```

Expected log sequence:
```
[LIT] executing license request
[LIT] checking lit protocol support
[LIT] creating lit session
[LIT] executing lit action
[LIT] license generation complete
```

## Integration with Media Player

### Content Decryption Flow

```mermaid
graph TD
    A[Encrypted Media Stream] --> B[Media Player]
    B --> C[Parse Encryption Metadata]
    C --> D[Request License]
    D --> E[License System Processing]
    E --> F[Return CEK License]
    F --> G[Decrypt Media Chunks]
    G --> H[Present Decrypted Content]
    
    subgraph "License System"
        I[PSSH Box Parsing]
        J[Protection Type Detection]
        K[Account Type Resolution]
        L[Lit Protocol Processing]
        M[License Generation]
    end
    
    E --> I
    I --> J
    J --> K
    K --> L
    L --> M
    M --> F
```

## Future Enhancements

### Potential Improvements

1. **Caching Layer**: Cache Lit sessions and authority validations
2. **Batch Processing**: Support multiple license requests simultaneously
3. **Offline Support**: Pre-generated licenses for offline playback
4. **Multi-Chain**: Extended support for additional blockchain networks
5. **Performance Optimization**: Reduce session creation overhead

### Extensibility Points

1. **Custom Access Control**: Pluggable access verification logic
2. **Additional Key Algorithms**: Support for more cryptographic algorithms
3. **License Format Extensions**: Support for additional DRM formats
4. **Provider Abstraction**: Support for additional wallet providers

## Conclusion

The media player's decryption workflow provides a comprehensive, secure, and extensible solution for content protection using the Lit Protocol. The architecture successfully handles both EOA and Smart Account scenarios while maintaining strong security guarantees and providing robust error handling. The system's modular design allows for easy extension and customization while ensuring compatibility with existing DRM standards.
