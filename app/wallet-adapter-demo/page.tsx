'use client'

import { useState, useMemo, FC } from 'react'
import { 
  ConnectionProvider, 
  WalletProvider,
  useWallet,
} from '@solana/wallet-adapter-react'
import { 
  WalletModalProvider,
  WalletMultiButton,
  WalletDisconnectButton,
} from '@solana/wallet-adapter-react-ui'
import { 
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from '@solana/wallet-adapter-wallets'
import { Connection, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from '@solana/web3.js'
import { LiquidRouteWalletAdapter } from '@/lib/liquidroute-wallet-adapter'

// Import wallet adapter styles
import '@solana/wallet-adapter-react-ui/styles.css'

const WalletContent: FC = () => {
  const { publicKey, signMessage, sendTransaction, connected, connecting } = useWallet()
  const [signature, setSignature] = useState<string>('')
  const [txSignature, setTxSignature] = useState<string>('')
  const [isProcessing, setIsProcessing] = useState(false)

  const handleSignMessage = async () => {
    if (!publicKey || !signMessage) return

    try {
      setIsProcessing(true)
      const message = new TextEncoder().encode('Hello from LiquidRoute Cross-Domain Wallet!')
      const sig = await signMessage(message)
      setSignature(Buffer.from(sig).toString('base64'))
    } catch (error) {
      console.error('Error signing message:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSendTransaction = async () => {
    if (!publicKey || !sendTransaction) return

    try {
      setIsProcessing(true)
      
      // Create connection
      const connection = new Connection(
        process.env.NEXT_PUBLIC_RPC_ENDPOINT || 
        'https://sparkling-attentive-replica.solana-mainnet.quiknode.pro/b83cf5c147d67a45906264e195574aa2a0150568/'
      )
      
      // Create a simple transfer transaction
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: publicKey, // Send to self for demo
          lamports: 0.001 * LAMPORTS_PER_SOL,
        })
      )
      
      // Get recent blockhash
      const { blockhash } = await connection.getLatestBlockhash()
      transaction.recentBlockhash = blockhash
      transaction.feePayer = publicKey
      
      // Send transaction
      const signature = await sendTransaction(transaction, connection)
      setTxSignature(signature)
      
      // Wait for confirmation
      await connection.confirmTransaction(signature)
      console.log('Transaction confirmed:', signature)
      
    } catch (error) {
      console.error('Error sending transaction:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex flex-col items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl p-8 w-full max-w-2xl">
        <div className="flex flex-col items-center gap-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-white mb-4">
              Solana Wallet Adapter Demo
            </h1>
            <p className="text-white/70">
              LiquidRoute Passkey Wallet integrated with standard wallet adapter
            </p>
          </div>

          <div className="flex gap-4">
            <WalletMultiButton className="!bg-gradient-to-r !from-purple-500 !to-indigo-500 hover:!from-purple-600 hover:!to-indigo-600" />
            {connected && (
              <WalletDisconnectButton className="!bg-white/20 hover:!bg-white/30" />
            )}
          </div>

          {connected && publicKey && (
            <div className="w-full space-y-6">
              <div className="bg-white/5 rounded-xl p-4">
                <p className="text-white/70 text-sm mb-2">Connected Wallet</p>
                <p className="text-white font-mono text-sm break-all">
                  {publicKey.toBase58()}
                </p>
              </div>

              <div className="space-y-4">
                <button
                  onClick={handleSignMessage}
                  disabled={isProcessing}
                  className="w-full py-3 bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-semibold rounded-xl hover:from-purple-600 hover:to-indigo-600 transition-all duration-200 shadow-lg disabled:opacity-50"
                >
                  {isProcessing ? '🔄 Processing...' : '✍️ Sign Message'}
                </button>

                {signature && (
                  <div className="bg-white/5 rounded-xl p-4">
                    <p className="text-white/70 text-sm mb-2">Message Signature</p>
                    <p className="text-white font-mono text-xs break-all">
                      {signature}
                    </p>
                  </div>
                )}

                <button
                  onClick={handleSendTransaction}
                  disabled={isProcessing}
                  className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold rounded-xl hover:from-indigo-600 hover:to-purple-600 transition-all duration-200 shadow-lg disabled:opacity-50"
                >
                  {isProcessing ? '🔄 Processing...' : '💸 Send Test Transaction'}
                </button>

                {txSignature && (
                  <div className="bg-white/5 rounded-xl p-4">
                    <p className="text-white/70 text-sm mb-2">Transaction Signature</p>
                    <p className="text-white font-mono text-xs break-all">
                      {txSignature}
                    </p>
                    <a 
                      href={`https://solscan.io/tx/${txSignature}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-400 hover:text-purple-300 text-sm mt-2 inline-block"
                    >
                      View on Solscan →
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {connecting && (
            <div className="text-white/70 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
              Connecting to wallet...
            </div>
          )}

          {!connected && !connecting && (
            <div className="text-white/50 text-center max-w-md">
              <p className="mb-4">
                Click "Select Wallet" above to connect using:
              </p>
              <ul className="text-left space-y-2">
                <li className="flex items-center gap-2">
                  <span className="text-green-400">✓</span>
                  <strong>LiquidRoute Wallet</strong> - Passkey-based (no seed phrase!)
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-400">✓</span>
                  Phantom Wallet
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-400">✓</span>
                  Solflare Wallet
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 text-center text-white/50 text-sm">
        <p>
          LiquidRoute Wallet works with any Solana dApp that uses wallet-adapter
        </p>
        <p className="mt-2">
          Just like Phantom, but with passkeys instead of seed phrases 🔐
        </p>
      </div>
    </div>
  )
}

export default function WalletAdapterDemo() {
  // QuickNode RPC endpoint
  const endpoint = useMemo(
    () => process.env.NEXT_PUBLIC_RPC_ENDPOINT || 
         'https://sparkling-attentive-replica.solana-mainnet.quiknode.pro/b83cf5c147d67a45906264e195574aa2a0150568/',
    []
  )

  // Configure wallets
  const wallets = useMemo(
    () => [
      // LiquidRoute Passkey Wallet (our custom adapter)
      new LiquidRouteWalletAdapter({
        host: typeof window !== 'undefined' && window.location.hostname === 'localhost' 
          ? 'http://localhost:3001'
          : 'https://wallet.liquidroute.com',
        preferPopup: false // Use iframe by default
      }),
      // Standard wallets
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ],
    []
  )

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <WalletContent />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  )
}
