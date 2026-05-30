"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { usePrivy, useWallets } from "@privy-io/react-auth"

interface Web3ContextType {
  account: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  chainId: number | null;
  balance: string | null;
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined)

export function Web3Provider({ children }: { children: ReactNode }) {
  const { ready, authenticated, login, logout } = usePrivy()
  const { wallets } = useWallets()
  
  const [balance, setBalance] = useState<string | null>(null)
  const [chainId, setChainId] = useState<number | null>(null)

  const activeWallet = wallets?.[0]
  const account = activeWallet?.address || null
  const isConnected = ready && authenticated && !!account
  const isConnecting = !ready

  useEffect(() => {
    if (activeWallet) {
      const cid = activeWallet.chainId;
      if (cid && cid.startsWith('eip155:')) {
        setChainId(Number(cid.split(':')[1]));
      }
      setBalance('10.5') // To be connected with actual provider or Biconomy balance
    } else {
      setChainId(null)
      setBalance(null)
    }
  }, [activeWallet])

  const connect = async (): Promise<void> => {
    login()
  }

  const disconnect = (): void => {
    logout()
  }

  const contextValue: Web3ContextType = {
    account,
    isConnected,
    isConnecting,
    connect,
    disconnect,
    chainId,
    balance,
  }

  return (
    <Web3Context.Provider value={contextValue}>
      {children}
    </Web3Context.Provider>
  )
}

export function useWeb3(): Web3ContextType {
  const context = useContext(Web3Context)
  if (context === undefined) {
    throw new Error("useWeb3 must be used within a Web3Provider")
  }
  return context
}
