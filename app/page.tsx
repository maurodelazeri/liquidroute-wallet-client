'use client'

import { useState, useEffect } from 'react'
import { LiquidRouteWallet } from '@/lib/wallet-sdk'

export default function HomePage() {
  const [wallet, setWallet] = useState<LiquidRouteWallet | null>(null)
  const [publicKey, setPublicKey] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [message, setMessage] = useState('')
  const [signature, setSignature] = useState<string | null>(null)
  
  // Initialize wallet on mount
  useEffect(() => {
    // In production, the wallet will be on a COMPLETELY DIFFERENT domain
    // Examples:
    // - Your app: https://app.uniswap.org
    // - Wallet: https://wallet.liquidroute.com
    const walletHost = process.env.NEXT_PUBLIC_WALLET_HOST || 
      (typeof window !== 'undefined' && window.location.hostname === 'localhost' 
        ? 'http://localhost:3001'  // Development: different port
        : 'https://wallet.liquidroute.com') // Production: completely different domain
    
    console.log('Initializing wallet connection to:', walletHost)
    
    const walletInstance = new LiquidRouteWallet({
      host: walletHost,
      network: 'devnet',
      preferPopup: false // Use iframe by default
    })
    
    // Listen for wallet events
    walletInstance.on('connect', (pubKey: any) => {
      console.log('Wallet connected:', pubKey.toString())
      setPublicKey(pubKey.toString())
    })
    
    walletInstance.on('disconnect', () => {
      console.log('Wallet disconnected')
      setPublicKey(null)
    })
    
    setWallet(walletInstance)
    
    return () => {
      walletInstance.destroy()
    }
  }, [])
  
  async function handleConnect() {
    if (!wallet) return
    
    setIsConnecting(true)
    try {
      const pubKey = await wallet.connect()
      setPublicKey(pubKey.toString())
    } catch (error) {
      console.error('Failed to connect:', error)
    } finally {
      setIsConnecting(false)
    }
  }
  
  async function handleDisconnect() {
    if (!wallet) return
    
    try {
      await wallet.disconnect()
      setPublicKey(null)
      setSignature(null)
    } catch (error) {
      console.error('Failed to disconnect:', error)
    }
  }
  
  async function handleSignMessage() {
    if (!wallet || !message) return
    
    try {
      const messageBytes = new TextEncoder().encode(message)
      const sig = await wallet.signMessage(messageBytes)
      setSignature(Buffer.from(sig).toString('base64'))
    } catch (error) {
      console.error('Failed to sign message:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">
            LiquidRoute Cross-Domain Wallet Demo
          </h1>
          <p className="text-xl text-white/80">
            This app is on <span className="font-mono bg-white/10 px-2 py-1 rounded">localhost:3000</span>
          </p>
          <p className="text-xl text-white/80 mt-2">
            Wallet is on <span className="font-mono bg-white/10 px-2 py-1 rounded">localhost:3001</span>
          </p>
          <p className="text-sm text-white/60 mt-4">
            In production, these would be completely different domains (e.g., app.uniswap.org and wallet.liquidroute.com)
          </p>
        </div>
        
        {/* Main Card */}
        <div className="max-w-2xl mx-auto bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl p-8">
          {/* Connection Status */}
          <div className="flex items-center justify-between mb-8 pb-6 border-b border-white/20">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${publicKey ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
              <span className="text-white font-semibold">
                {publicKey ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            
            {publicKey && (
              <button
                onClick={handleDisconnect}
                className="text-white/70 hover:text-white transition-colors"
              >
                Disconnect
              </button>
            )}
          </div>
          
          {!publicKey ? (
            // Connect Section
            <div className="text-center py-12">
              <div className="w-24 h-24 mx-auto mb-6 bg-white/20 rounded-full flex items-center justify-center">
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              
              <h2 className="text-2xl font-bold text-white mb-3">
                Connect Your Wallet
              </h2>
              
              <p className="text-white/70 mb-8">
                Click below to connect your wallet via secure cross-domain iframe
              </p>
              
              <button
                onClick={handleConnect}
                disabled={isConnecting}
                className="px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isConnecting ? 'Connecting...' : 'Connect Wallet'}
              </button>
              
              <p className="text-white/50 text-xs mt-6">
                This will open an iframe to the wallet domain and communicate via postMessage
              </p>
            </div>
          ) : (
            // Connected Section
            <div className="space-y-6">
              {/* Wallet Info */}
              <div className="bg-white/10 rounded-xl p-4">
                <p className="text-white/70 text-sm mb-2">Connected Address</p>
                <p className="text-white font-mono text-sm break-all">
                  {publicKey}
                </p>
              </div>
              
              {/* Sign Message */}
              <div className="bg-white/10 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Sign Message
                </h3>
                
                <div className="space-y-4">
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Enter message to sign..."
                    className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-white/40"
                    rows={3}
                  />
                  
                  <button
                    onClick={handleSignMessage}
                    disabled={!message}
                    className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Sign Message
                  </button>
                  
                  {signature && (
                    <div className="mt-4 p-3 bg-green-500/20 border border-green-500/30 rounded-lg">
                      <p className="text-green-400 text-sm mb-2">Signature:</p>
                      <p className="text-white font-mono text-xs break-all">
                        {signature}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Architecture Info */}
        <div className="max-w-2xl mx-auto mt-12 bg-white/5 backdrop-blur-lg rounded-xl p-6">
          <h3 className="text-white font-semibold mb-4">🏗️ Cross-Domain Architecture</h3>
          <div className="space-y-2 text-white/70 text-sm">
            <p>✅ App Domain: <span className="font-mono">{typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}</span></p>
            <p>✅ Wallet Domain: <span className="font-mono">http://localhost:3001</span></p>
            <p>✅ Communication: Secure postMessage API</p>
            <p>✅ No CORS issues - using iframe + postMessage</p>
            <p>✅ Production ready for completely different domains</p>
          </div>
        </div>
        
        {/* Technical Details */}
        <div className="max-w-2xl mx-auto mt-8 text-center">
          <p className="text-white/60 text-sm">
            This architecture allows the wallet to be hosted on a completely different domain
            (like Porto&apos;s id.porto.sh) and be used by any trusted application.
          </p>
        </div>
      </div>
    </div>
  )
}