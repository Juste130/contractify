"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

// Types pour les requêtes Ethereum
type EthereumMethod = 
  | "eth_accounts" 
  | "eth_chainId" 
  | "eth_requestAccounts" 
  | "eth_getBalance"

interface EthereumRequestParams {
  method: EthereumMethod;
  params?: string[];
}

interface EthereumProvider {
  request: (args: EthereumRequestParams) => Promise<unknown>;
  on: (event: string, callback: (...args: unknown[]) => void) => void;
  removeListener: (event: string, callback: (...args: unknown[]) => void) => void;
}

// Types pour le contexte
interface Web3ContextType {
  account: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  chainId: number | null;
  balance: string | null;
}

// Extension de l'interface Window
declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined)

export function Web3Provider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState<boolean>(false)
  const [chainId, setChainId] = useState<number | null>(null)
  const [balance, setBalance] = useState<string | null>(null)

  const isConnected: boolean = !!account

  // Types pour les gestionnaires d'événements
  const handleAccountsChanged = (accounts: unknown): void => {
    if (Array.isArray(accounts) && accounts.every(acc => typeof acc === 'string')) {
      const stringAccounts = accounts as string[]
      if (stringAccounts.length === 0) {
        disconnect()
      } else {
        setAccount(stringAccounts[0])
        if (stringAccounts[0]) {
          fetchBalance(stringAccounts[0])
        }
      }
    }
  }

  const handleChainChanged = (): void => {
    window.location.reload()
  }

  // Fonctions avec types stricts
  const checkConnection = async (): Promise<void> => {
    if (typeof window !== "undefined" && window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ 
          method: "eth_accounts" 
        }) as string[]
        
        if (accounts.length > 0 && typeof accounts[0] === 'string') {
          setAccount(accounts[0])
          await fetchChainId()
          await fetchBalance(accounts[0])
        }
      } catch (error) {
        console.error("Error checking connection:", error)
      }
    }
  }

  const fetchChainId = async (): Promise<void> => {
    if (typeof window !== "undefined" && window.ethereum) {
      try {
        const chainIdHex = await window.ethereum.request({ 
          method: "eth_chainId" 
        }) as string
        
        if (typeof chainIdHex === 'string') {
          setChainId(Number.parseInt(chainIdHex, 16))
        }
      } catch (error) {
        console.error("Error fetching chain ID:", error)
      }
    }
  }

  const fetchBalance = async (address: string): Promise<void> => {
    if (typeof window !== "undefined" && window.ethereum) {
      try {
        const balanceHex = await window.ethereum.request({
          method: "eth_getBalance",
          params: [address, "latest"],
        }) as string
        
        if (typeof balanceHex === 'string') {
          const balanceWei = Number.parseInt(balanceHex, 16)
          const balanceEth = (balanceWei / 1e18).toFixed(4)
          setBalance(balanceEth)
        }
      } catch (error) {
        console.error("Error fetching balance:", error)
      }
    }
  }

  const connect = async (): Promise<void> => {
    if (typeof window === "undefined" || !window.ethereum) {
      alert("MetaMask is not installed. Please install MetaMask to use this feature.")
      return
    }

    setIsConnecting(true)
    try {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      }) as string[]
      
      if (accounts.length > 0 && typeof accounts[0] === 'string') {
        setAccount(accounts[0])
        await fetchChainId()
        await fetchBalance(accounts[0])
      }
    } catch (error) {
      console.error("Error connecting to MetaMask:", error)
      alert("Failed to connect to MetaMask. Please try again.")
    } finally {
      setIsConnecting(false)
    }
  }

  const disconnect = (): void => {
    setAccount(null)
    setChainId(null)
    setBalance(null)
  }

  useEffect(() => {
    checkConnection()

    // Écouter les changements de compte et de réseau
    if (typeof window !== "undefined" && window.ethereum) {
      window.ethereum.on("accountsChanged", handleAccountsChanged)
      window.ethereum.on("chainChanged", handleChainChanged)

      return () => {
        window.ethereum?.removeListener("accountsChanged", handleAccountsChanged)
        window.ethereum?.removeListener("chainChanged", handleChainChanged)
      }
    }
  }, [])

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