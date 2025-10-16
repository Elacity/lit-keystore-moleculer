# Lit Relayer Service Documentation

## Overview

The Relayer Service is a new addition to the lit-keystore-moleculer project that provides proxy functionality for Lit Protocol's relayer capabilities. It enables internal services to interact with Lit Protocol's relayer infrastructure for managing payer registration and user management in a decentralized manner.

## Architecture

The service is built using:
- **RelayerService**: Main service class that extends Moleculer Service
- **LitRelayerMixin**: Core mixin providing relayer functionality
- **Network Configuration**: Environment-specific configurations for different Lit networks

## Supported Networks

The service supports two Lit Protocol networks:

### Datil (Production)
- Relayer URL: `https://datil-relayer.getlit.dev`
- Payer Address: `0x581D4bca99709c1E0cB6f07c9D05719818AA6e49`
- Delegation Contract: `0xF19ea8634969730cB51BFEe2E2A5353062053C14`

### Datil-Test (Development)
- Relayer URL: `https://datil-test-relayer.getlit.dev`
- Payer Address: `0x16BA0779c9e099F9fb7396992Cb3722220EA7385`
- Delegation Contract: `0xd7188e0348F1dA8c9b3d6e614844cbA22329B99E`

## Environment Configuration

Required environment variables:

```bash
LIT_NETWORK=datil                    # or 'datil-test'
LIT_RELAYER_API_KEY=your_api_key    # Required for all operations
LIT_PAYER_SECRET_KEY=your_secret    # Required for adding users
```

## Available Actions

### 1. Register New Payer

Registers a new payer with the Lit relayer network.

```javascript
const result = await ctx.call("relayer.registerNewPayer");
```

**Returns**: Registration response from the relayer service

### 2. Add Single User

Adds a single user account to the relayer's authorized users list.

```javascript
const result = await ctx.call("relayer.addUser", {
  account: "0x1234567890123456789012345678901234567890"
});
```

**Parameters**:
- `account` (string): Ethereum address of the user to add
- `preCheck` (boolean, optional): Whether to perform pre-validation

### 3. Add Multiple Users

Adds multiple user accounts in a single operation for better efficiency.

```javascript
const result = await ctx.call("relayer.addUsers", {
  accounts: [
    "0x1234567890123456789012345678901234567890",
    "0x0987654321098765432109876543210987654321"
  ]
});
```

**Parameters**:
- `accounts` (array): Array of Ethereum addresses to add

## Error Handling

The service includes proper error handling for common scenarios:

- **Missing API Key**: Service throws `ServiceSchemaError` if `relayerApiKey` is not provided
- **Empty Payees**: Throws `MoleculerClientError` when trying to add empty accounts array
- **Network Connectivity**: Handles connection failures to Lit Protocol nodes

## Internal Methods

### resolveRelayerURL(path?)

Resolves the correct relayer URL based on the current network configuration.

```javascript
// Internal usage only
const url = this.resolveRelayerURL("/add-users");
```

## Service Lifecycle

### Started
- Initializes Lit Node Client with the configured network
- Establishes connection to Lit Protocol
- Creates Lit Relay instance with API key

### Stopped  
- Cleanly disconnects from Lit Node Client
- Releases network resources

## Security Considerations

- **API Key Protection**: The relayer API key is required for all operations and should be kept secure
- **Payer Secret**: The payer secret key is only required for user management operations
- **Internal Use Only**: This service is designed for internal proxy use within the moleculer ecosystem

## Integration Example

```javascript
// In another service
class MyService extends Service {
  async addNewUser(userAddress) {
    try {
      const result = await this.broker.call("relayer.addUser", {
        account: userAddress
      });
      
      this.logger.info("User added successfully", result);
      return result;
    } catch (error) {
      this.logger.error("Failed to add user", error);
      throw error;
    }
  }
}
```

## Dependencies

The relayer service depends on:
- `@lit-protocol/lit-auth-client`: For LitRelay functionality
- `@lit-protocol/lit-node-client`: For Lit Protocol node communication
- `@lit-protocol/types`: For TypeScript interfaces
- `moleculer`: For service framework functionality

## Configuration Settings

The service accepts the following settings through the mixin:

- `litNetwork`: Target Lit Protocol network
- `relayerApiKey`: API key for relayer authentication
- `payerSecretKey`: Secret key for payer operations (optional)

Network-specific settings are automatically resolved based on the `litNetwork` parameter.
