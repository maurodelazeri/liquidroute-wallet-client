/**
 * LiquidRoute Wallet SDK for Solana
 * Client SDK for integrating the wallet into applications on different domains
 */

import { PublicKey, Transaction } from '@solana/web3.js'
import type { RpcRequest, RpcResponse } from './types'

export interface WalletConfig {
  /**
   * URL of the wallet host (e.g., https://wallet.liquidroute.com)
   * This will be on a COMPLETELY DIFFERENT domain than your app
   */
  host?: string
  /**
   * Whether to use popup instead of iframe
   */
  preferPopup?: boolean
}

interface Dialog {
  open(): void
  close(): void
  destroy(): void
  sendRequest(request: RpcRequest): void
}

export class LiquidRouteWallet {
  private dialog: Dialog | null = null
  private config: Required<WalletConfig>
  private publicKey: PublicKey | null = null
  private connected = false
  private requestId = 0
  private listeners = new Map<string, Set<Function>>()
  private responseHandlers = new Map<string, (response: RpcResponse) => void>()

  constructor(config: WalletConfig = {}) {
    // Determine the wallet host URL
    const defaultHost = this.getDefaultHost()
    
    this.config = {
      host: config.host || defaultHost,
      preferPopup: config.preferPopup || false
    }

    // Don't create dialog in constructor - create it lazily when needed
    // this.setupDialog()
  }
  
  private getDefaultHost(): string {
    // Production configuration:
    // - App domain: solanavalidators.xyz
    // - Wallet domain: wallet.liquidroute.com (completely different domain)
    if (typeof window !== 'undefined') {
      const isLocalhost = window.location.hostname === 'localhost' || 
                         window.location.hostname === '127.0.0.1'
      
      if (isLocalhost) {
        // Development: wallet server on different port
        return 'http://localhost:3001'
      }
    }
    
    // Production: wallet at wallet.liquidroute.com
    // This app will be at solanavalidators.xyz
    return process.env.NEXT_PUBLIC_WALLET_HOST || 'https://wallet.liquidroute.com'
  }

  private setupDialog() {
    const usePopup = this.config.preferPopup || !this.isIframeSupported()
    const walletUrl = `${this.config.host}/wallet`
    
    if (usePopup) {
      this.dialog = this.createPopupDialog(walletUrl)
    } else {
      this.dialog = this.createIframeDialog(walletUrl)
    }
  }

  private isIframeSupported(): boolean {
    if (typeof window === 'undefined') return false
    
    // Safari doesn't support WebAuthn in iframes
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
    if (isSafari) return false
    
    // Check for secure context (HTTPS)
    if (!window.isSecureContext && !this.config.host.includes('localhost')) {
      return false
    }
    
    return true
  }

  private createIframeDialog(url: string): Dialog {
    let iframe: HTMLIFrameElement | null = null
    let container: HTMLElement | null = null
    let isOpen = false
    let messenger: any = null // Porto-style messenger
    let isReady = false
    const readyCallbacks: Function[] = []
    const targetOrigin = new URL(url).origin
    const walletInstance = this // Capture wallet instance

    const setup = () => {
      // Create container
      container = document.createElement('div')
      container.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 2147483647;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(4px);
        display: none;
      `

      // Create iframe pointing to wallet on different domain
      iframe = document.createElement('iframe')
      iframe.setAttribute('data-testid', 'liquidroute-wallet')
      
      // Configure WebAuthn permissions exactly like Porto
      const walletOrigin = new URL(url).origin
      const iframeAllow = [
        `publickey-credentials-get ${walletOrigin}`,
        `publickey-credentials-create ${walletOrigin}`,
      ]
      
      // Add clipboard-write for non-Firefox browsers (like Porto)
      const isFirefox = navigator.userAgent.toLowerCase().indexOf('firefox') > -1
      if (!isFirefox) iframeAllow.push('clipboard-write')
      
      iframe.setAttribute('allow', iframeAllow.join('; '))
      iframe.setAttribute('tabindex', '0')
      iframe.setAttribute(
        'sandbox',
        'allow-forms allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox',
      )
      iframe.setAttribute('src', url)
      iframe.setAttribute('title', 'LiquidRoute Wallet')
      
      iframe.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 440px;
        max-width: 95vw;
        height: 680px;
        max-height: 95vh;
        border: none;
        border-radius: 16px;
        background: white;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
      `

      container.appendChild(iframe)
      document.body.appendChild(container)

      // Porto pattern: Create messenger bridge AFTER iframe loads
      iframe.addEventListener('load', () => {
        console.log('[WalletSDK] Iframe loaded, creating messenger bridge')
        
        // Create messengers matching Porto's Dialog.ts pattern
        const fromMessenger = {
          on(topic: string, handler: Function) {
            const listener = (event: MessageEvent) => {
              if (event.origin !== targetOrigin) return
              if (event.data?.topic === topic) {
                handler(event.data.payload, event)
              }
            }
            window.addEventListener('message', listener)
            return () => window.removeEventListener('message', listener)
          },
          send(topic: string, payload: any) {
            // Parent sends to itself - not used
          }
        }
        
        const toMessenger = {
          send(topic: string, payload: any) {
            console.log(`[WalletSDK] Sending ${topic} to iframe:`, payload)
            iframe?.contentWindow?.postMessage(
              { topic, payload },
              targetOrigin
            )
          }
        }
        
        // Listen for ready signal
        fromMessenger.on('ready', (payload: any) => {
          console.log('[WalletSDK] Wallet is ready:', payload)
          isReady = true
          // Execute any pending callbacks
          readyCallbacks.forEach(cb => cb())
          readyCallbacks.length = 0
        })
        
        // Listen for RPC responses
        fromMessenger.on('rpc-response', (payload: any) => {
          console.log('[WalletSDK] Received rpc-response:', payload)
          walletInstance.handleResponse(payload)
        })
        
        messenger = { from: fromMessenger, to: toMessenger }
      })

      // Close on backdrop click
      container.addEventListener('click', (e) => {
        if (e.target === container) {
          container!.style.display = 'none'
          isOpen = false
        }
      })
    }

    return {
      open() {
        if (!container) setup()
        isOpen = true
        container!.style.display = 'block'
      },
      close() {
        console.log('[WalletSDK] Dialog close() called, isOpen:', isOpen)
        if (!isOpen) return
        isOpen = false
        if (container) {
          container.style.display = 'none'
          console.log('[WalletSDK] Dialog closed - container hidden')
        }
      },
      destroy() {
        container?.remove()
      },
      sendRequest(request: RpcRequest) {
        if (!iframe) setup()
        if (!isOpen) this.open()
        
        // Wait for ready signal before sending request (Porto pattern)
        const send = () => {
          console.log('[WalletSDK] Sending rpc-request to wallet:', request)
          messenger?.to.send('rpc-request', request)
        }
        
        if (isReady) {
          send()
        } else {
          console.log('[WalletSDK] Waiting for wallet ready signal...')
          readyCallbacks.push(send)
        }
      }
    }
  }

  private createPopupDialog(url: string): Dialog {
    let popup: Window | null = null
    let messenger: any = null
    let isReady = false
    const readyCallbacks: Function[] = []
    const targetOrigin = new URL(url).origin
    const walletInstance = this // Capture wallet instance

    return {
      open() {
        if (popup && !popup.closed) {
          popup.focus()
          return
        }

        popup = window.open(
          url,
          'liquidroute-wallet',
          'width=440,height=680,resizable,scrollbars=yes'
        )

        if (popup) {
          // Porto pattern: Create messenger for popup
          const fromMessenger = {
            on(topic: string, handler: Function) {
              const listener = (event: MessageEvent) => {
                if (event.origin !== targetOrigin) return
                if (event.data?.topic === topic) {
                  handler(event.data.payload, event)
                }
              }
              window.addEventListener('message', listener)
              return () => window.removeEventListener('message', listener)
            },
            send(topic: string, payload: any) {
              // Parent sends to itself - not used
            }
          }
          
          const toMessenger = {
            send(topic: string, payload: any) {
              console.log(`[WalletSDK] Sending ${topic} to popup:`, payload)
              popup?.postMessage(
                { topic, payload },
                targetOrigin
              )
            }
          }
          
          // Listen for ready signal
          fromMessenger.on('ready', (payload: any) => {
            console.log('[WalletSDK] Wallet popup is ready:', payload)
            isReady = true
            // Execute any pending callbacks
            readyCallbacks.forEach(cb => cb())
            readyCallbacks.length = 0
          })
          
          // Listen for RPC responses
          fromMessenger.on('rpc-response', (payload: any) => {
            console.log('[WalletSDK] Received rpc-response from popup:', payload)
            walletInstance.handleResponse(payload)
          })
          
          messenger = { from: fromMessenger, to: toMessenger }
        }
      },
      close() {
        popup?.close()
      },
      destroy() {
        popup?.close()
      },
      sendRequest(request: RpcRequest) {
        if (!popup || popup.closed) this.open()
        
        // Wait for ready signal before sending request (Porto pattern)
        const send = () => {
          console.log('[WalletSDK] Sending rpc-request to popup:', request)
          messenger?.to.send('rpc-request', request)
        }
        
        if (isReady) {
          send()
        } else {
          console.log('[WalletSDK] Waiting for popup ready signal...')
          readyCallbacks.push(send)
        }
      }
    }
  }

  private async sendRequest<T = unknown>(
    method: string,
    params?: unknown
  ): Promise<T> {
    const id = String(++this.requestId)
    const request: RpcRequest = { id, method, params }
    
    return new Promise((resolve, reject) => {
      // Create and open dialog if not exists
      if (!this.dialog) {
        this.setupDialog()
      }
      
      // Open dialog for connect, signMessage, signTransaction
      const requiresUserInteraction = ['connect', 'signMessage', 'signTransaction'].includes(method)
      if (requiresUserInteraction && this.dialog) {
        this.dialog.open()
      }
      
      // Set up one-time response handler
      this.responseHandlers.set(id, (response: RpcResponse) => {
        console.log(`[WalletSDK] Response handler called for ${method}, requiresUserInteraction: ${requiresUserInteraction}`)
        this.responseHandlers.delete(id)
        
        // Close dialog after user interaction is complete
        if (requiresUserInteraction && this.dialog) {
          console.log('[WalletSDK] Closing dialog after user interaction')
          this.dialog.close()
        }
        
        if (response.error) {
          reject(new Error(response.error.message))
        } else {
          resolve(response.result as T)
        }
      })
      
      // Send request to wallet
      this.dialog?.sendRequest(request)
    })
  }

  private handleResponse(response: RpcResponse) {
    console.log('[WalletSDK] handleResponse called with:', response)
    
    // Handle specific response handler
    const handler = this.responseHandlers.get(response.id)
    if (handler) {
      console.log('[WalletSDK] Found handler for response ID:', response.id)
      handler(response)
    } else {
      console.warn('[WalletSDK] No handler found for response ID:', response.id)
    }
    
    // Handle events
    switch (response._request?.method) {
      case 'connect':
        if (response.result) {
          const { publicKey } = response.result as { publicKey: string }
          this.publicKey = new PublicKey(publicKey)
          this.connected = true
          this.emit('connect', this.publicKey)
        }
        break
        
      case 'disconnect':
        this.publicKey = null
        this.connected = false
        this.emit('disconnect')
        break
    }
  }

  private emit(event: string, ...args: any[]) {
    const handlers = this.listeners.get(event)
    if (handlers) {
      handlers.forEach(handler => handler(...args))
    }
  }

  on(event: string, handler: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(handler)
  }

  off(event: string, handler: Function) {
    this.listeners.get(event)?.delete(handler)
  }

  /**
   * Connect to the wallet
   */
  async connect(): Promise<PublicKey> {
    if (this.connected && this.publicKey) {
      return this.publicKey
    }

    const result = await this.sendRequest<{ publicKey: string }>('connect')

    this.publicKey = new PublicKey(result.publicKey)
    this.connected = true
    
    return this.publicKey
  }

  /**
   * Disconnect from the wallet
   */
  async disconnect(): Promise<void> {
    if (!this.connected) return
    
    await this.sendRequest('disconnect')
    this.publicKey = null
    this.connected = false
  }

  /**
   * Sign a message
   */
  async signMessage(message: Uint8Array): Promise<Uint8Array> {
    if (!this.connected) {
      throw new Error('Wallet not connected')
    }

    const result = await this.sendRequest<{ signature: string }>('signMessage', {
      message: Buffer.from(message).toString('base64'),
      display: 'utf8'
    })

    return Buffer.from(result.signature, 'base64')
  }

  /**
   * Sign a transaction
   */
  async signTransaction(transaction: Transaction): Promise<Transaction> {
    if (!this.connected) {
      throw new Error('Wallet not connected')
    }

    // Serialize the transaction
    const serialized = transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false
    })

    const result = await this.sendRequest<{ signedTransaction: string }>('signTransaction', {
      transaction: Buffer.from(serialized).toString('base64')
    })

    // Deserialize the signed transaction
    return Transaction.from(Buffer.from(result.signedTransaction, 'base64'))
  }

  /**
   * Sign multiple transactions
   */
  async signAllTransactions(transactions: Transaction[]): Promise<Transaction[]> {
    const signedTransactions: Transaction[] = []
    for (const transaction of transactions) {
      signedTransactions.push(await this.signTransaction(transaction))
    }
    return signedTransactions
  }

  /**
   * Check if wallet is connected
   */
  isConnected(): boolean {
    return this.connected
  }

  /**
   * Get wallet public key
   */
  getPublicKey(): PublicKey | null {
    return this.publicKey
  }

  /**
   * Destroy the wallet instance
   */
  destroy() {
    this.disconnect()
    this.dialog?.destroy()
    this.listeners.clear()
    this.responseHandlers.clear()
  }
}
