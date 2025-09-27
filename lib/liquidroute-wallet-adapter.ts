/**
 * LiquidRoute Passkey Wallet Adapter for Solana
 * Implements the standard Solana wallet adapter interface
 * Works with @solana/wallet-adapter-react
 */

import {
  BaseMessageSignerWalletAdapter,
  WalletName,
  WalletNotConnectedError,
  WalletNotReadyError,
  WalletPublicKeyError,
  WalletReadyState,
  isVersionedTransaction,
} from '@solana/wallet-adapter-base'
import {
  PublicKey,
  Transaction,
  TransactionSignature,
  VersionedTransaction,
  Connection,
  SendOptions,
} from '@solana/web3.js'
import { LiquidRouteWallet } from './wallet-sdk'

export interface LiquidRouteWalletAdapterConfig {
  host?: string
  preferPopup?: boolean
}

export const LiquidRouteWalletName = 'LiquidRoute Wallet' as WalletName<'LiquidRoute Wallet'>

export class LiquidRouteWalletAdapter extends BaseMessageSignerWalletAdapter {
  name = LiquidRouteWalletName
  url = 'https://wallet.liquidroute.com'
  icon = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTI4IiBoZWlnaHQ9IjEyOCIgdmlld0JveD0iMCAwIDEyOCAxMjgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMjgiIGhlaWdodD0iMTI4IiByeD0iMjQiIGZpbGw9InVybCgjZ3JhZGllbnQpIi8+CjxwYXRoIGQ9Ik00MCA2NEg4OE04OCA2NEw3MiA0OE04OCA2NEw3MiA4MCIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSI2IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPGRlZnM+CjxsaW5lYXJHcmFkaWVudCBpZD0iZ3JhZGllbnQiIHgxPSIwIiB5MT0iMCIgeDI9IjEyOCIgeTI9IjEyOCI+CjxzdG9wIHN0b3AtY29sb3I9IiM5OTQ1RkYiLz4KPHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjMTRGMTk1Ii8+CjwvbGluZWFyR3JhZGllbnQ+CjwvZGVmcz4KPC9zdmc+'
  readonly supportedTransactionVersions = null // Only legacy transactions for now
  
  private _connecting: boolean
  private _wallet: LiquidRouteWallet | null
  private _publicKey: PublicKey | null
  private _readyState: WalletReadyState =
    typeof window === 'undefined' ? WalletReadyState.Unsupported : WalletReadyState.Loadable
  private _config: LiquidRouteWalletAdapterConfig

  constructor(config: LiquidRouteWalletAdapterConfig = {}) {
    super()
    this._connecting = false
    this._wallet = null
    this._publicKey = null
    this._config = config
  }

  get publicKey() {
    return this._publicKey
  }

  get connecting() {
    return this._connecting
  }

  get connected() {
    return !!this._wallet && !!this._publicKey
  }

  get readyState() {
    return this._readyState
  }

  async connect(): Promise<void> {
    try {
      if (this.connected || this.connecting) return
      if (this._readyState !== WalletReadyState.Loadable && this._readyState !== WalletReadyState.Installed) {
        throw new WalletNotReadyError()
      }

      this._connecting = true

      // Initialize the LiquidRoute wallet if not already done
      if (!this._wallet) {
        const walletHost = this._config.host || 
          (typeof window !== 'undefined' && window.location.hostname === 'localhost' 
            ? 'http://localhost:3001'
            : 'https://wallet.liquidroute.com')

        this._wallet = new LiquidRouteWallet({
          host: walletHost,
          preferPopup: this._config.preferPopup
        })

        // Listen for wallet events
        this._wallet.on('connect', (publicKey: PublicKey) => {
          this._publicKey = publicKey
          this.emit('connect', publicKey)
        })

        this._wallet.on('disconnect', () => {
          this._publicKey = null
          this.emit('disconnect')
        })
      }

      // Connect to the wallet (opens iframe/popup with passkey auth)
      console.log('[LiquidRouteAdapter] Calling wallet.connect()')
      const publicKey = await this._wallet.connect()
      console.log('[LiquidRouteAdapter] Wallet connected with publicKey:', publicKey?.toBase58())
      
      if (!publicKey) {
        throw new WalletPublicKeyError()
      }

      this._publicKey = publicKey
      this._readyState = WalletReadyState.Installed
      
      this.emit('connect', publicKey)
    } catch (error: any) {
      this.emit('error', error)
      throw error
    } finally {
      this._connecting = false
    }
  }

  async disconnect(): Promise<void> {
    if (this._wallet) {
      await this._wallet.disconnect()
      this._wallet.destroy()
      this._wallet = null
    }

    this._publicKey = null
    this._readyState = WalletReadyState.Loadable

    this.emit('disconnect')
  }

  async signTransaction<T extends Transaction | VersionedTransaction>(
    transaction: T
  ): Promise<T> {
    if (!this.connected || !this._wallet) {
      throw new WalletNotConnectedError()
    }

    try {
      if (isVersionedTransaction(transaction)) {
        // Handle versioned transactions
        throw new Error('Versioned transactions not yet supported')
      } else {
        // Handle legacy transactions
        const signedTx = await this._wallet.signTransaction(transaction as Transaction)
        return signedTx as T
      }
    } catch (error: any) {
      this.emit('error', error)
      throw error
    }
  }

  async signAllTransactions<T extends Transaction | VersionedTransaction>(
    transactions: T[]
  ): Promise<T[]> {
    const signedTransactions: T[] = []
    for (const transaction of transactions) {
      signedTransactions.push(await this.signTransaction(transaction))
    }
    return signedTransactions
  }

  async signMessage(message: Uint8Array): Promise<Uint8Array> {
    if (!this.connected || !this._wallet) {
      throw new WalletNotConnectedError()
    }

    try {
      const signature = await this._wallet.signMessage(message)
      return signature
    } catch (error: any) {
      this.emit('error', error)
      throw error
    }
  }

  async sendTransaction<T extends Transaction | VersionedTransaction>(
    transaction: T,
    connection: Connection,
    options: SendOptions = {}
  ): Promise<TransactionSignature> {
    if (!this.connected || !this._wallet) {
      throw new WalletNotConnectedError()
    }

    try {
      // Sign the transaction
      const signed = await this.signTransaction(transaction)
      
      // Send the signed transaction
      const signature = await connection.sendRawTransaction(
        signed.serialize(),
        options
      )

      return signature
    } catch (error: any) {
      this.emit('error', error)
      throw error
    }
  }
}
