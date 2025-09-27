'use client'

import { useState } from 'react'
import { LiquidRouteWallet } from '@/lib/wallet-sdk'
import { PublicKey } from '@solana/web3.js'

// Demo scenarios for different transaction contexts
const DEMO_SCENARIOS = {
  swap: {
    name: 'Token Swap',
    description: 'Swap SOL for USDC on Jupiter',
    icon: '🔄',
    color: 'linear-gradient(135deg, #9945FF 0%, #14F195 100%)',
    params: {
      method: 'wallet_sendCalls',
      metadata: {
        type: 'swap',
        fromToken: {
          symbol: 'SOL',
          amount: '1.5',
          icon: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
          usdValue: '247.50'
        },
        toToken: {
          symbol: 'USDC',
          amount: '247.50',
          icon: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png',
          usdValue: '247.50'
        },
        rate: '165.00',
        priceImpact: '0.12%',
        route: 'Jupiter',
        slippage: '0.5%'
      },
      calls: [
        {
          programId: 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4',
          accounts: []
        }
      ]
    }
  },
  
  nftMint: {
    name: 'NFT Mint',
    description: 'Mint a Mad Lads NFT',
    icon: '🖼️',
    color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    params: {
      method: 'wallet_sendCalls',
      metadata: {
        type: 'nft-mint',
        collection: {
          name: 'Mad Lads',
          image: 'https://madlads.s3.us-west-2.amazonaws.com/images/logo.png',
          creator: 'J1S9H3QjnW8JxfPpXCk5qNs9B5b5z6Yt3Ys1234567',
          verified: true
        },
        nft: {
          name: 'Mad Lad #4269',
          image: 'https://madlads.s3.us-west-2.amazonaws.com/images/4269.png',
          description: 'A rebellious Mad Lad ready to take on the world',
          attributes: [
            { trait: 'Background', value: 'Purple Haze' },
            { trait: 'Head', value: 'Cap' },
            { trait: 'Eyes', value: 'Laser' },
            { trait: 'Rarity', value: 'Rare' }
          ],
          rarity: 'Rare'
        },
        price: {
          amount: '2.5',
          currency: 'SOL',
          usdValue: '412.50'
        },
        supply: {
          current: 8732,
          max: 10000
        }
      },
      calls: [
        {
          programId: 'CndyV3LdqHUfDLmE5naZjVN8rBZz4tqhdefbAnjHG3JR',
          accounts: []
        }
      ]
    }
  },
  
  payment: {
    name: 'E-commerce Payment',
    description: 'Purchase items from SolStore',
    icon: '🛒',
    color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    params: {
      method: 'wallet_sendCalls',
      metadata: {
        type: 'payment',
        merchant: {
          name: 'SolStore',
          logo: 'https://example.com/solstore-logo.png',
          verified: true,
          website: 'solstore.com'
        },
        items: [
          {
            name: 'Solana Hoodie',
            quantity: 1,
            price: '0.3',
            image: 'https://example.com/hoodie.png'
          },
          {
            name: 'Validator Sticker Pack',
            quantity: 2,
            price: '0.05',
            image: 'https://example.com/stickers.png'
          }
        ],
        summary: {
          subtotal: '0.35',
          tax: '0.028',
          shipping: '0.02',
          total: '0.398',
          currency: 'SOL',
          usdValue: '65.67'
        },
        shippingAddress: {
          name: 'Satoshi Nakamoto',
          address: '123 Blockchain Ave',
          city: 'San Francisco',
          country: 'USA'
        }
      },
      calls: [
        {
          programId: 'Pay11111111111111111111111111111111111111111',
          accounts: []
        }
      ]
    }
  },
  
  transfer: {
    name: 'Send SOL',
    description: 'Send SOL to another wallet',
    icon: '💸',
    color: 'linear-gradient(135deg, #14F195 0%, #9945FF 100%)',
    params: {
      method: 'signTransaction',
      metadata: {
        type: 'transfer',
        to: 'HN7cABqLq46Es1jh92dQQisAq662SmxELLTPsB3xhrb5',
        amount: '0.1',
        token: { symbol: 'SOL' }
      }
    }
  },
  
  signMessage: {
    name: 'Sign Message',
    description: 'Sign a verification message',
    icon: '✍️',
    color: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    params: {
      method: 'signMessage',
      params: {
        message: Buffer.from('Welcome to LiquidRoute! Sign this message to verify your wallet ownership.\n\nTimestamp: ' + new Date().toISOString()).toString('base64'),
        display: 'utf8'
      }
    }
  },
  
  defi: {
    name: 'DeFi Lending',
    description: 'Supply SOL to earn yield',
    icon: '🏦',
    color: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    params: {
      method: 'wallet_sendCalls',
      metadata: {
        type: 'defi',
        protocol: 'Solend',
        action: 'supply',
        amount: '5.0',
        apy: '6.2%'
      },
      calls: [
        {
          programId: 'So1endDq2YkqhipRh3WViPa8hdiSpxWy6z3Z6tMCpAo',
          accounts: []
        }
      ]
    }
  },
  
  stake: {
    name: 'Stake SOL',
    description: 'Stake SOL with a validator',
    icon: '🎯',
    color: 'linear-gradient(135deg, #f83600 0%, #f9d423 100%)',
    params: {
      method: 'wallet_sendCalls',
      metadata: {
        type: 'stake',
        action: 'stake',
        amount: '10.0',
        validator: 'J1to3PQfXidUUhprQWgdKkQAMWPJAEqSJ7amkBDE9qhF',
        apy: '7.5%'
      },
      calls: [
        {
          programId: 'Stake11111111111111111111111111111111111111',
          accounts: []
        }
      ]
    }
  }
}

export default function DemoPage() {
  const [wallet] = useState(() => new LiquidRouteWallet())
  const [isConnected, setIsConnected] = useState(false)
  const [publicKey, setPublicKey] = useState<string | null>(null)
  const [lastResult, setLastResult] = useState<any>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null)

  // Connect wallet
  const handleConnect = async () => {
    try {
      const result = await wallet.connect()
      setIsConnected(true)
      setPublicKey(result.publicKey)
      setLastResult({ type: 'connect', result })
    } catch (error) {
      console.error('Connection failed:', error)
      setLastResult({ type: 'error', error: (error as any).message })
    }
  }

  // Execute demo scenario
  const executeScenario = async (scenarioKey: string) => {
    if (!isConnected) {
      await handleConnect()
      if (!isConnected) return
    }

    setIsProcessing(true)
    setSelectedScenario(scenarioKey)
    
    const scenario = DEMO_SCENARIOS[scenarioKey as keyof typeof DEMO_SCENARIOS]
    
    try {
      let result
      
      // Send request based on scenario method
      switch (scenario.params.method) {
        case 'signMessage':
          result = await wallet.sendRequest({
            method: 'signMessage',
            params: scenario.params.params
          })
          break
        
        case 'signTransaction':
          // Create a simple transfer transaction
          const tx = {
            // Simplified - would need actual transaction building
            transaction: Buffer.from(new Uint8Array(100)).toString('base64')
          }
          result = await wallet.sendRequest({
            method: 'signTransaction',
            params: { ...tx, ...scenario.params }
          })
          break
        
        case 'wallet_sendCalls':
          result = await wallet.sendRequest({
            method: 'wallet_sendCalls',
            params: [scenario.params]
          })
          break
        
        default:
          result = await wallet.sendRequest({
            method: scenario.params.method,
            params: scenario.params
          })
      }
      
      setLastResult({ type: 'success', scenario: scenarioKey, result })
    } catch (error) {
      console.error(`${scenarioKey} failed:`, error)
      setLastResult({ type: 'error', scenario: scenarioKey, error: (error as any).message })
    } finally {
      setIsProcessing(false)
      setSelectedScenario(null)
    }
  }

  // Disconnect wallet
  const handleDisconnect = async () => {
    try {
      await wallet.disconnect()
      setIsConnected(false)
      setPublicKey(null)
      setLastResult({ type: 'disconnect' })
    } catch (error) {
      console.error('Disconnect failed:', error)
    }
  }

  return (
    <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '36px', marginBottom: '16px' }}>
          LiquidRoute Wallet Demo
        </h1>
        <p style={{ fontSize: '18px', opacity: 0.8, marginBottom: '24px' }}>
          Experience context-aware wallet UI for different transaction types
        </p>
        
        {/* Connection Status */}
        <div style={{
          padding: '16px',
          borderRadius: '12px',
          background: isConnected ? 'rgba(20, 241, 149, 0.1)' : 'rgba(153, 69, 255, 0.1)',
          border: isConnected ? '1px solid rgba(20, 241, 149, 0.3)' : '1px solid rgba(153, 69, 255, 0.3)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <div style={{ fontSize: '14px', opacity: 0.7, marginBottom: '4px' }}>
              {isConnected ? 'Connected' : 'Not Connected'}
            </div>
            {publicKey && (
              <div style={{ fontFamily: 'monospace', fontSize: '14px' }}>
                {publicKey.slice(0, 8)}...{publicKey.slice(-6)}
              </div>
            )}
          </div>
          <button
            onClick={isConnected ? handleDisconnect : handleConnect}
            style={{
              padding: '8px 20px',
              borderRadius: '8px',
              border: 'none',
              background: isConnected ? '#ef4444' : '#9945FF',
              color: 'white',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            {isConnected ? 'Disconnect' : 'Connect Wallet'}
          </button>
        </div>
      </div>

      {/* Demo Scenarios Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '20px',
        marginBottom: '40px'
      }}>
        {Object.entries(DEMO_SCENARIOS).map(([key, scenario]) => (
          <div
            key={key}
            style={{
              background: 'white',
              borderRadius: '16px',
              border: '1px solid rgba(0, 0, 0, 0.1)',
              overflow: 'hidden',
              transition: 'transform 0.2s, box-shadow 0.2s',
              cursor: 'pointer',
              transform: selectedScenario === key ? 'scale(0.98)' : 'scale(1)'
            }}
            onClick={() => !isProcessing && executeScenario(key)}
            onMouseEnter={(e) => {
              if (!isProcessing) {
                e.currentTarget.style.transform = 'translateY(-4px)'
                e.currentTarget.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.1)'
              }
            }}
            onMouseLeave={(e) => {
              if (!isProcessing && selectedScenario !== key) {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'none'
              }
            }}
          >
            {/* Scenario Header */}
            <div style={{
              height: '100px',
              background: scenario.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '48px'
            }}>
              {scenario.icon}
            </div>
            
            {/* Scenario Details */}
            <div style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>
                {scenario.name}
              </h3>
              <p style={{ fontSize: '14px', opacity: 0.7, marginBottom: '16px' }}>
                {scenario.description}
              </p>
              
              <button
                disabled={isProcessing}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '8px',
                  border: 'none',
                  background: isProcessing && selectedScenario === key 
                    ? 'linear-gradient(90deg, #9945FF 0%, #14F195 50%, #9945FF 100%)' 
                    : '#9945FF',
                  backgroundSize: isProcessing && selectedScenario === key ? '200% 100%' : '100% 100%',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: isProcessing ? 'not-allowed' : 'pointer',
                  opacity: isProcessing && selectedScenario !== key ? 0.5 : 1,
                  animation: isProcessing && selectedScenario === key ? 'shimmer 2s linear infinite' : 'none'
                }}
              >
                {isProcessing && selectedScenario === key ? 'Processing...' : 'Try Demo'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Result Display */}
      {lastResult && (
        <div style={{
          padding: '20px',
          borderRadius: '12px',
          background: lastResult.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(20, 241, 149, 0.1)',
          border: lastResult.type === 'error' ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(20, 241, 149, 0.3)'
        }}>
          <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>
            {lastResult.type === 'error' ? '❌ Error' : '✅ Success'}
          </h3>
          <pre style={{
            fontSize: '12px',
            overflow: 'auto',
            background: 'rgba(0, 0, 0, 0.05)',
            padding: '12px',
            borderRadius: '8px'
          }}>
            {JSON.stringify(lastResult, null, 2)}
          </pre>
        </div>
      )}

      {/* Animation Styles */}
      <style jsx>{`
        @keyframes shimmer {
          0% {
            background-position: -200% center;
          }
          100% {
            background-position: 200% center;
          }
        }
      `}</style>
    </div>
  )
}
