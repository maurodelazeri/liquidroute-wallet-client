# LiquidRoute Wallet Client

This is the client application that demonstrates how to integrate with the LiquidRoute Porto-based wallet.

## Features

- **Connect Wallet**: Initiate connection with passkey authentication
- **Sign Messages**: Request message signatures from the wallet
- **Sign Transactions**: Request transaction signatures 
- **Disconnect**: Cleanly disconnect the wallet

## How It Works

The client communicates with the wallet server (`wallet.liquidroute.com`) through a cross-domain iframe using `postMessage` API:

1. **Connection Flow**:
   - Client opens iframe pointing to wallet server
   - Wallet sends `ready` signal
   - Client sends `connect` request
   - User authenticates with passkey
   - Wallet returns public key
   - Client closes iframe

2. **Signing Flow**:
   - Client opens iframe with request
   - User reviews and approves/rejects
   - Wallet returns signature
   - Client closes iframe

## Setup

1. Install dependencies:
```bash
yarn install
```

2. Create `.env.local` file:
```bash
NEXT_PUBLIC_WALLET_HOST=https://wallet.liquidroute.com
```

For local development with wallet server on port 3001:
```bash
NEXT_PUBLIC_WALLET_HOST=http://localhost:3001
```

3. Run the development server:
```bash
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) to see the demo.

## Message Protocol

The client and wallet communicate using structured messages:

### Client → Wallet
```javascript
{
  topic: 'rpc-requests',
  payload: [{
    id: 'unique-id',
    method: 'connect' | 'signMessage' | 'signTransaction' | 'disconnect',
    params: { /* method-specific params */ }
  }]
}
```

### Wallet → Client
```javascript
{
  topic: 'rpc-response',
  payload: {
    id: 'request-id',
    result: { /* response data */ },
    error: 'error message if failed'
  }
}
```

## Deployment

Deploy to Vercel:

```bash
vercel
```

The client will automatically connect to the production wallet at `wallet.liquidroute.com`.

## Architecture

```
┌─────────────────────────┐     postMessage     ┌─────────────────────────┐
│                         │◄────────────────────►│                         │
│    Client App           │                      │    Wallet Server        │
│  (solanavalidators.xyz) │     Cross-Domain     │ (wallet.liquidroute.com)│
│                         │       iframe         │                         │
└─────────────────────────┘                      └─────────────────────────┘
```

The wallet runs in an iframe with appropriate security permissions:
- `publickey-credentials-get/create` for passkey authentication
- Sandboxed with specific permissions
- Origin validation for security