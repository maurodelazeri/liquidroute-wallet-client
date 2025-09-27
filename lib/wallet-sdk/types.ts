/**
 * Types for LiquidRoute Wallet SDK
 */

export type MessageTopic = 
  | 'ready'
  | 'close'
  | 'rpc-request'
  | 'rpc-response'
  | 'success'
  | '__internal'

export type RpcRequest = {
  id: string
  method: string
  params?: unknown
}

export type RpcResponse = {
  id: string
  result?: unknown
  error?: {
    code: number
    message: string
    data?: unknown
  }
  _request: RpcRequest
}
