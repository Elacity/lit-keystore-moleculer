# Lit Keystore Moleculer Service Documentation

## Overview

This directory contains comprehensive documentation for the Lit Keystore Moleculer Service, a critical component in the ELA.CITY DRM ecosystem that provides secure key management with dual encryption protocol support.

## Documentation Structure

### Core Documentation

- **[Architecture Review](./architecture-review.md)** - Comprehensive analysis of the service architecture, strengths, and improvement areas
- **[API Documentation](./api-documentation.md)** - Complete API reference with examples and usage patterns
- **[Security Analysis](./security-analysis.md)** - Security assessment, threat model, and recommendations

## Quick Start

### Service Overview
The Lit Keystore Moleculer Service provides:
- **Dual Protocol Support**: ECIES (legacy) + Lit Protocol (modern)
- **Backward Compatibility**: Full compatibility with existing ECIES-encrypted content
- **Secure Key Management**: 128-bit CEK and KID generation for media encryption
- **Decentralized Access Control**: Programmable access conditions via Lit Protocol
- **Blockchain Integration**: Smart contract-based key registration and verification

### Key Features
- ✅ RFC4122-compliant key generation
- ✅ Multiple encryption protocol support
- ✅ Signature-based authorization
- ✅ Event-driven architecture
- ✅ Comprehensive type safety
- ✅ Modular mixin-based design

## Architecture Summary

```
┌─────────────────────────────────────────────────────────────────┐
│                    Keystore Service                             │
├─────────────────────────────────────────────────────────────────┤
│  Actions: create, unwrap, transfer, generateKeyPair            │
│  Events: keystore.created                                       │
│  Mixins: LitProtocolMixin, UtilsMixin                         │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────┐    ┌─────────────────────┐    ┌─────────────────┐
│  ECIES Encoder  │    │   Lit Encoder       │    │   Future        │
│  (Legacy)       │    │   (Modern)          │    │   Encoders      │
├─────────────────┤    ├─────────────────────┤    ├─────────────────┤
│ • ECIES crypto  │    │ • Lit Protocol      │    │ • Extensible    │
│ • Blockchain    │    │ • Access Control    │    │ • Interface     │
│ • Signatures    │    │ • Decentralized     │    │ • Driven        │
└─────────────────┘    └─────────────────────┘    └─────────────────┘
```

## Security Considerations

### Current Security Posture: MEDIUM ⚠️
- **Strengths**: Cryptographic signatures, access control, key isolation
- **Critical Issues**: Private key management, information disclosure
- **Recommendations**: Implement secure key storage, rate limiting, enhanced validation

### Priority Security Actions
1. **CRITICAL**: Implement secure private key management
2. **HIGH**: Add rate limiting and input validation
3. **MEDIUM**: Enhance error handling and audit logging

## Development Guidelines

### SOLID Principles Compliance
- **SRP**: ⚠️ Needs refactoring (service handles too many responsibilities)
- **OCP**: ✅ Good extensibility through interfaces
- **LSP**: ✅ Proper substitutability of encoders
- **ISP**: ✅ Well-segregated interfaces
- **DIP**: ⚠️ Needs dependency injection implementation

### Recommended Improvements
1. **Service Separation**: Split monolithic service into focused components
2. **Dependency Injection**: Implement DI for better testability
3. **Error Handling**: Standardize error handling patterns
4. **Testing**: Add comprehensive test coverage

## Usage Examples

### Basic Key Generation
```javascript
// Generate a key pair
const keyPair = await broker.call("keystore.generateKeyPair", {
  salt: "content-identifier"
});

// Create encoded keystore
const result = await broker.call("keystore.create", {
  salt: keyPair.kid,
  options: {
    protocolParameters: {
      authority: "0x...",
      ledger: "0x...",
      chainId: 21,
      rpc: "https://api.elastos.io/eth"
    }
  }
});
```

### Key Recovery
```javascript
// Unwrap encrypted key
const decrypted = await broker.call("keystore.unwrap", {
  kid: "key-identifier",
  data: "0x...encrypted-data"
});
```

## Integration Points

### DRM Ecosystem Integration
- **Media Encoding**: Keys used for MPEG-DASH content encryption
- **PSSH Boxes**: Encoding results embedded in protection headers
- **Player Integration**: System IDs recognized by media players
- **Blockchain**: Smart contract integration for access control

### Service Dependencies
- **Lit Protocol**: Decentralized key management network
- **Ethereum/EVM**: Blockchain for smart contract operations  
- **NATS**: Message transport (configurable)
- **Moleculer**: Microservice framework

## Monitoring and Operations

### Health Checks
- Service: `lit-healthz.check`
- Dependencies: Lit Protocol connection, blockchain RPC
- Metrics: Key generation rate, encoding success/failure

### Configuration Management
- Environment variables for sensitive data
- Mixin-based feature configuration
- Network-specific chain support

## Migration from Legacy

### Compatibility
- ✅ Same key generation algorithm
- ✅ Compatible signature verification
- ✅ Preserved transfer functionality
- ✅ Backward-compatible ECIES encoding

### Migration Strategy
1. **Parallel Deployment**: Run alongside legacy service
2. **Gradual Migration**: Route new content to new service
3. **Full Migration**: Deprecate legacy service

## Contributing

### Development Setup
```bash
npm install
npm run dev          # Development mode with hot reload
npm run test         # Run tests
npm run lint         # Code linting
npm run typecheck    # TypeScript validation
```

### Code Standards
- TypeScript with strict mode
- ESLint with Airbnb configuration
- Prettier code formatting
- Comprehensive JSDoc documentation

## Support and Resources

### Documentation Files
- **Architecture**: Detailed system design and patterns
- **API**: Complete endpoint documentation
- **Security**: Threat analysis and recommendations
- **Comparison**: Legacy vs new implementation analysis
- **SOLID**: Design principles evaluation

### External Resources
- [Moleculer Framework](https://moleculer.services/)
- [Lit Protocol Documentation](https://developer.litprotocol.com/)
- [ECIES Cryptography](https://cryptobook.nakov.com/asymmetric-key-ciphers/ecies-public-key-encryption)
- [RFC4122 UUID Specification](https://www.ietf.org/rfc/rfc4122.txt)

---

For specific implementation details, API usage, or security considerations, please refer to the individual documentation files in this directory.
