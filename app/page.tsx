'use client'

import { useState, useCallback, useEffect } from 'react'

export default function Home() {
  const [walletConnected, setWalletConnected] = useState(false)
  const [publicKey, setPublicKey] = useState<string | null>(null)
  const [status, setStatus] = useState<string>('')
  const [iframeVisible, setIframeVisible] = useState(false)
  const [currentRequest, setCurrentRequest] = useState<string | null>(null)

  // Setup message listener for wallet responses
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Validate origin
      if (event.origin !== 'https://wallet.liquidroute.com' && 
          event.origin !== 'http://localhost:3001') {
        return
      }

      const { data } = event
      
      if (data?.topic === 'ready') {
        console.log('Wallet iframe ready')
        // Send init message
        const iframe = document.getElementById('wallet-iframe') as HTMLIFrameElement
        if (iframe?.contentWindow) {
          iframe.contentWindow.postMessage({
            type: '__internal',
            topic: 'init'
          }, '*')
        }
        return
      }

      if (data?.topic === 'rpc-response' && data?.payload) {
        const { result, error } = data.payload
        
        if (error) {
          setStatus(`Error: ${error}`)
          setIframeVisible(false)
          setCurrentRequest(null)
          return
        }

        // Handle different response types
        if (currentRequest === 'connect' && result?.publicKey) {
          setPublicKey(result.publicKey)
          setWalletConnected(true)
          setStatus('Wallet connected successfully!')
          setIframeVisible(false)
          setCurrentRequest(null)
        } else if (currentRequest === 'signMessage' && result?.signature) {
          setStatus(`Message signed! Signature: ${result.signature.slice(0, 20)}...`)
          setIframeVisible(false)
          setCurrentRequest(null)
        } else if (currentRequest === 'signTransaction' && result?.signature) {
          setStatus(`Transaction signed! Signature: ${result.signature.slice(0, 20)}...`)
          setIframeVisible(false)
          setCurrentRequest(null)
        } else if (currentRequest === 'disconnect' && result?.disconnected) {
          setPublicKey(null)
          setWalletConnected(false)
          setStatus('Wallet disconnected')
          setIframeVisible(false)
          setCurrentRequest(null)
        }
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [currentRequest])

  const sendWalletRequest = useCallback((method: string, params?: any) => {
    const iframe = document.getElementById('wallet-iframe') as HTMLIFrameElement
    if (iframe?.contentWindow) {
      const request = {
        id: Date.now().toString(),
        method,
        params
      }
      
      iframe.contentWindow.postMessage({
        topic: 'rpc-requests',
        payload: [request]
      }, '*')
      
      setCurrentRequest(method)
    }
  }, [])

  const connectWallet = useCallback(() => {
    setStatus('Connecting wallet...')
    setIframeVisible(true)
    setCurrentRequest('connect')
    
    // Wait for iframe to load then send request
    setTimeout(() => {
      sendWalletRequest('connect')
    }, 500)
  }, [sendWalletRequest])

  const disconnectWallet = useCallback(() => {
    sendWalletRequest('disconnect')
  }, [sendWalletRequest])

  const signMessage = useCallback(() => {
    if (!walletConnected) {
      setStatus('Please connect wallet first')
      return
    }
    
    setStatus('Signing message...')
    setIframeVisible(true)
    
    // Wait for iframe to be ready
    setTimeout(() => {
      sendWalletRequest('signMessage', {
        message: Buffer.from('Hello from LiquidRoute Client!').toString('base64')
      })
    }, 300)
  }, [walletConnected, sendWalletRequest])

  const signTransaction = useCallback(() => {
    if (!walletConnected) {
      setStatus('Please connect wallet first')
      return
    }
    
    setStatus('Signing transaction...')
    setIframeVisible(true)
    
    // Wait for iframe to be ready
    setTimeout(() => {
      sendWalletRequest('signTransaction', {
        // Mock transaction data for demo
        transaction: 'mock-transaction-data'
      })
    }, 300)
  }, [walletConnected, sendWalletRequest])

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f9fafb',
      padding: '2rem',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <div style={{
        maxWidth: '800px',
        margin: '0 auto'
      }}>
        <h1 style={{
          fontSize: '2.5rem',
          fontWeight: 'bold',
          marginBottom: '1rem',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>
          LiquidRoute Wallet Demo
        </h1>
        
        <p style={{ fontSize: '1.125rem', color: '#6b7280', marginBottom: '2rem' }}>
          Test the Porto-based cross-domain wallet integration with passkeys
        </p>

        {/* Wallet Status */}
        <div style={{
          padding: '1.5rem',
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          marginBottom: '2rem'
        }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>
            Wallet Status
          </h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: walletConnected ? '#22c55e' : '#ef4444'
              }} />
              <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>
                {walletConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            
            {publicKey && (
              <div style={{
                padding: '0.75rem',
                backgroundColor: '#f3f4f6',
                borderRadius: '8px',
                fontFamily: 'monospace',
                fontSize: '0.875rem',
                wordBreak: 'break-all'
              }}>
                {publicKey.slice(0, 20)}...{publicKey.slice(-20)}
              </div>
            )}
            
            {status && (
              <div style={{
                padding: '0.75rem',
                backgroundColor: status.includes('Error') ? '#fee2e2' : '#dcfce7',
                color: status.includes('Error') ? '#dc2626' : '#166534',
                borderRadius: '8px',
                fontSize: '0.875rem'
              }}>
                {status}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div style={{
          padding: '1.5rem',
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>
            Actions
          </h2>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
            {!walletConnected ? (
              <button
                onClick={connectWallet}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#6366f1',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#5558e3'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#6366f1'
                }}
              >
                Connect Wallet
              </button>
            ) : (
              <>
                <button
                  onClick={disconnectWallet}
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#dc2626'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#ef4444'
                  }}
                >
                  Disconnect
                </button>
                
                <button
                  onClick={signMessage}
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: '#22c55e',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#16a34a'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#22c55e'
                  }}
                >
                  Sign Message
                </button>
                
                <button
                  onClick={signTransaction}
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: '#f59e0b',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#d97706'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#f59e0b'
                  }}
                >
                  Sign Transaction
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Hidden iframe for wallet */}
      {iframeVisible && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <iframe
            id="wallet-iframe"
            src={`${process.env.NEXT_PUBLIC_WALLET_HOST || 'https://wallet.liquidroute.com'}/wallet`}
            style={{
              width: '100%',
              maxWidth: '500px',
              height: '600px',
              border: 'none',
              borderRadius: '24px',
              backgroundColor: 'transparent'
            }}
            allow="publickey-credentials-get; publickey-credentials-create; clipboard-write"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
          />
        </div>
      )}
    </div>
  )
}