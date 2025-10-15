## Overview

This document provides a comprehensive view of the complete content protection ecosystem, combining the **CEK encoding process** from the lit-keystore-moleculer service with the **decryption workflow** from the media-player, showing how encrypted content flows from creation to consumption.

## Complete System Architecture

```mermaid
graph TD
    subgraph "Content Creation & Encoding"
        A[Content Creator] --> B[Media Encoding Service]
        B --> C[lit-keystore-moleculer]
        C --> D[CEK Encoding]
        D --> E[Lit Protocol Storage]
    end

    subgraph "Content Distribution"
        E --> F[CDN/Storage]
        F --> G[Encrypted Media Stream]
    end

    subgraph "Content Consumption & Decryption"
        G --> H[Media Player]
        H --> I[License Request System]
        I --> J[Lit Protocol Decryption]
        J --> K[CEK Recovery]
        K --> L[CEK Transfer]
        L --> M[Media Playback]
    end

    subgraph "Access Control"
        N[Smart Contract Authority]
        O[User Wallet/Account]
        P[Access Permissions]
    end

    I --> N
    O --> I
    N --> P
    P --> J
```

## Encoding to Decryption Flow

### Phase 1: Content Encoding (Case of Lit Protocol encoding process)

```mermaid
sequenceDiagram
    participant Creator as Content Creator
    participant Encoder as lit-keystore-moleculer
    participant LitNodes as Lit Protocol Nodes
    participant Authority as Authority Contract
    participant Storage as Content Storage

    Creator->>Encoder: Encode content with protection
    Encoder->>Encoder: Generate random CEK
    Encoder->>Encoder: Encrypt content with CEK

    Note over Encoder: CEK Encoding Process
    Encoder->>Encoder: Build access control conditions
    Encoder->>Encoder: Validate protection parameters
    Encoder->>LitNodes: encryptString(CEK, conditions)

    LitNodes->>LitNodes: Encrypt CEK with access controls
    LitNodes->>Encoder: Return ciphertext + hash

    Encoder->>Encoder: Build protection data
    Encoder->>Storage: Store encrypted content + metadata
    Encoder->>Creator: Encoding complete

    Note over Storage: Content now protected with Lit Protocol
```

### Phase 2: Content Access & Decryption (media-player)

```mermaid
sequenceDiagram
    participant User as User/Viewer
    participant Player as Media Player
    participant Wallet as User Wallet
    participant LitNodes as Lit Protocol Nodes
    participant Authority as Authority Contract

    User->>Player: Request to play content
    Player->>Player: Parse PSSH metadata
    Player->>Player: Identify protection type

    alt EOA Flow
        Player->>Wallet: Connect (cenc:lit-drm-v1)
    else Smart Account Flow
        Player->>Wallet: Connect (cenc:lit-drm-sa-v1)
    end

    Player->>Authority: Check supportsLitProtocol()
    Authority->>Player: Confirm support

    Player->>LitNodes: Initialize Lit client
    Player->>LitNodes: Create session with SIWE

    Player->>LitNodes: Execute Lit Action
    LitNodes->>Authority: hasAccessByContentId(user, contentId)

    alt Access Granted
        Authority->>LitNodes: Return true
        LitNodes->>LitNodes: Decrypt CEK using access controls
        LitNodes->>LitNodes: Generate license for player
        LitNodes->>Player: Return encrypted license
        Player->>Player: Decrypt license and extract CEK
        Player->>Player: Decrypt content with CEK
        Player->>User: Play decrypted content
    else Access Denied
        Authority->>LitNodes: Return false
        LitNodes->>Player: Access denied error
        Player->>User: Show access error
    end
```

## Account Type Handling

### EOA (Externally Owned Account) Flow

```mermaid
graph TD
    subgraph "Encoding (EOA)"
        A1[Content Creator] --> B1[lit-keystore-moleculer]
        B1 --> C1[LitEncoderEOA Factory]
        C1 --> D1[CencDRM_LitV1 Config]
        D1 --> E1[EOA Access Control Template]
        E1 --> F1[Lit CEK Encryption]
    end

    subgraph "Decryption (EOA)"
        G1[Media Player] --> H1[cenc:lit-drm-v1 Detection]
        H1 --> I1[Direct Wallet Connection]
        I1 --> J1[EOA Access Check Script]
        J1 --> K1["hasAccessByContentId(userAddress)"]
        K1 --> L1[CEK Decryption & License]
    end

    F1 --> M1[Encrypted Content Storage]
    M1 --> G1
```

### Smart Account Flow

```mermaid
graph TD
    subgraph "Encoding (SA)"
        A2[Content Creator] --> B2[lit-keystore-moleculer]
        B2 --> C2[LitEncoderSA Factory]
        C2 --> D2[CencDRM_LitSAV1 Config]
        D2 --> E2[SA Access Control Template]
        E2 --> F2[Lit CEK Encryption]
    end

    subgraph "Decryption (SA)"
        G2[Media Player] --> H2[cenc:lit-drm-sa-v1 Detection]
        H2 --> I2[Smart Account Connection]
        I2 --> J2[SA Address Resolution]
        J2 --> K2[SA Access Check Script]
        K2 --> K22["hasAccessByContentId(eoaAddress,...)"]
        K22 --> L2["resolveSmartAccountAddress(eoaAddress) -> saAddress"]
        L2 --> M2[CEK Decryption & License]
    end

    F2 --> N2[Encrypted Content Storage]
    N2 --> G2
```

## Data Flow and Format Evolution

### PSSH Box Structure

The PSSH (Protection System Specific Header) box contains the protection metadata:

```mermaid
graph TD
    A[PSSH Box] --> B[System ID]
    A --> C[Protection Data]

    B --> D[Lit Protocol Identifier]
    C --> E[Network Config]
    C --> F[Authority Contract]
    C --> G[Chain ID]
    C --> H[RPC URL]
    C --> I[Action IPFS ID]
    C --> J[Access Check IPFS ID]
    C --> K[Ciphertext]
    C --> L[Data Hash]

    subgraph "EOA Configuration"
        M[KeySystemId: CencDRM_LitV1]
        N[ActionIPFS: QmQgw91...]
        O[AccessIPFS: QmVdU5MhsQ...]
    end

    subgraph "Smart Account Configuration"
        P[KeySystemId: CencDRM_LitSAV1]
        Q[ActionIPFS: QmWDBNCk1...]
        R[AccessIPFS: QmayEHFfJ...]
    end
```

### License Data Format

The media player receives a structured license format:

```mermaid
graph TD
    A[License Response] --> B[Header Section]
    A --> C[Metadata Section]
    A --> D[Body Section]

    B --> E[Format Identifier: 'raw']
    B --> F[Flags: 0x02]

    C --> G[ECDH Ephemeral Public Key]
    C --> H[ECDSA Signature]
    C --> I[Signer Public Key]

    D --> J[Encrypted CEK]
    D --> K[License Metadata]
    D --> L[Expiration Time]
```

## Security Model

### Access Control Verification

```mermaid
graph TD
    A[Access Request] --> B{Account Type?}

    B -->|EOA| C[Direct Address Check]
    B -->|Smart Account| D[Address Resolution]

    C --> E["authority.hasAccessByContentId(userAddr, contentId)"]
    D --> F[Derive SA Address from Owner]
    F --> G["authority.hasAccessByContentId(saAddr, contentId)"]

    E --> H{Access Granted?}
    G --> H

    H -->|Yes| I[Decrypt CEK]
    H -->|No| J[Access Denied]

    I --> K[Generate License]
    K --> L[Return to Player]
    J --> M[Error Response]
```

### Cryptographic Protection Layers

```mermaid
graph TD
    subgraph "Content Layer"
        A[Original Content] --> B[AES Encryption with CEK]
        B --> C[Encrypted Content Stream]
    end

    subgraph "Key Layer"
        D[Content Encryption Key] --> E[Lit Protocol Encryption]
        E --> F[Access Control Conditions]
        F --> G[Encrypted CEK Storage]
    end

    subgraph "Access Layer"
        H[User Authentication] --> I[Wallet Signature]
        I --> J[Lit Session Creation]
        J --> K[Access Verification]
        K --> L[CEK Decryption Authorization]
    end

    subgraph "Transport Layer"
        M[CEK Recovery] --> N[ECDH Key Exchange]
        N --> O[License Encryption]
        O --> P[Signed License Response]
    end

    B --> D
    L --> M
    P --> Q[Content Decryption]
    C --> Q
```

## Configuration Mapping

### System Identifiers and IPFS Mappings

| Component | EOA | Smart Account |
| --- | --- | --- |
| **KeySystemId** | `CencDRM_LitV1` | `CencDRM_LitSAV1` |
| **ProtectionType** | `cenc:lit-drm-v1` | `cenc:lit-drm-sa-v1` |
| **Action IPFS ID** | `QmQgw91ZjsT1VkhxtibNV4zMet6vQTtQwL4FK5cRA8xHim` | `QmWDBNCk1xHk8giLn1cxFrBke7aPFTuXsMDsnn9Pom1wZu` |
| **Access Check IPFS ID** | `QmVdU5MhsQg5mhZNNmp3qx3bbuGw6FPrUGws1yUycY9vsS` | `QmayEHFfJiZbryYyCsUUEu4drhhDM4FkmxM6RZMcy67zHP` |

## Error Handling Across Systems

### Error Propagation Flow

```mermaid
graph TD
    A[Content Encoding Error] --> B[Encoding Service]
    C[Access Control Error] --> D[Authority Contract]
    E[Lit Protocol Error] --> F[Lit Nodes]
    G[Decryption Error] --> H[Media Player]

    B --> I[Log & Alert Content Creator]
    D --> J[Return Access Denied]
    F --> K[Session/Action Error]
    H --> L[Show User Error Message]

    subgraph "Error Types"
        M[ValidationError: Invalid parameters]
        N[NetworkError: Connectivity issues]
        O[AuthError: Authentication failure]
        P[AccessError: Permission denied]
        Q[CryptoError: Cryptographic failure]
    end
```

### Error Recovery Mechanisms

```mermaid
flowchart TD
    A[Error Detected] --> B{Error Type?}

    B -->|Transient| C[Retry with Backoff]
    B -->|Network| D[Switch RPC Provider]
    B -->|Access| E[Check Alternative Auth]
    B -->|Crypto| F[Regenerate Keys]
    B -->|Fatal| G[Fail Gracefully]

    C --> H[Max Retries Reached?]
    H -->|No| I[Try Again]
    H -->|Yes| G

    D --> J[Test New Connection]
    J --> K{Connected?}
    K -->|Yes| L[Continue Operation]
    K -->|No| G

    E --> M[Try Next Protection Type]
    F --> N[Restart Session]
    G --> O[Show User Error]
```

## Monitoring and Observability

### Key Metrics to Track

```mermaid
graph TD
    subgraph "Encoding Metrics"
        A[CEK Encoding Success Rate]
        B[Encoding Duration]
        C[Lit Storage Success Rate]
    end

    subgraph "Decryption Metrics"
        D[License Request Success Rate]
        E[Session Creation Time]
        F[Access Control Response Time]
        G[Overall Decryption Time]
    end

    subgraph "System Health"
        H[Lit Network Connectivity]
        I[Authority Contract Availability]
        J[Error Rate by Type]
        K[User Experience Score]
    end

    A --> L[Overall System Health]
    D --> L
    H --> L
```

## Security Best Practices

### Development Guidelines

1. **Input Validation**: Always validate all parameters before processing
2. **Error Handling**: Never expose sensitive information in error messages
3. **Key Management**: Use secure random generation and proper key rotation
4. **Access Control**: Implement defense in depth with multiple verification layers
5. **Monitoring**: Log security events and monitor for suspicious activities

### Deployment Considerations

1. **Network Security**: Use HTTPS/WSS for all communications
2. **Contract Verification**: Verify all smart contract addresses before deployment
3. **Rate Limiting**: Implement rate limiting to prevent abuse
4. **Backup Systems**: Maintain fallback mechanisms for critical components
5. **Update Management**: Keep all dependencies and protocols up to date

## Testing Strategy

### Integration Testing Approach

```mermaid
graph TD
    A[End-to-End Testing] --> B[Content Encoding Tests]
    A --> C[Access Control Tests]
    A --> D[Decryption Flow Tests]
    A --> E[Error Handling Tests]

    B --> F[CEK Generation & Encryption]
    B --> G[Metadata Storage]

    C --> H[EOA Access Verification]
    C --> I[Smart Account Resolution]

    D --> J[Session Creation]
    D --> K[License Generation]
    D --> L[Content Decryption]

    E --> M[Network Failures]
    E --> N[Invalid Parameters]
    E --> O[Access Denied Scenarios]
```

### Test Scenarios

1. **Happy Path Tests**
    - EOA content encoding and decryption
    - Smart Account content encoding and decryption
    - Multi-chain scenarios
2. **Error Scenarios**
    - Network connectivity issues
    - Invalid access control parameters
    - Expired sessions
    - Unsupported protection types
3. **Performance Tests**
    - High-throughput encoding
    - Concurrent decryption requests
    - Large content handling
4. **Security Tests**
    - Unauthorized access attempts
    - Parameter injection attempts
    - Session hijacking scenarios

## Future Roadmap

### Planned Enhancements

1. **Performance Improvements**
    - Session caching and reuse
    - Batch license generation
    - Optimized cryptographic operations
2. **Feature Extensions**
    - Additional blockchain network support
    - Enhanced access control conditions
    - Offline license generation
3. **Developer Experience**
    - Improved documentation and examples
    - SDKs for popular programming languages
    - Enhanced debugging tools
4. **Enterprise Features**
    - Advanced analytics and reporting
    - Multi-tenant support
    - Custom integration options

## Conclusion

The end-to-end content protection flow represents a sophisticated, secure, and scalable solution for digital content protection. By combining the robust CEK encoding capabilities of lit-keystore-moleculer with the flexible decryption workflow of the media-player, the system provides comprehensive protection while maintaining usability and performance. The architecture’s support for both EOA and Smart Account scenarios, combined with strong error handling and monitoring capabilities, makes it suitable for production deployment across various use cases and blockchain networks.