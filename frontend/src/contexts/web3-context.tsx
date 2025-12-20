"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

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


const Web3Context = createContext<Web3ContextType | undefined>(undefined)

const MOCK_MODE = process.env.NEXT_PUBLIC_MOCK_BLOCKCHAIN === 'true';

export function Web3Provider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState<boolean>(false)
  const [chainId, setChainId] = useState<number | null>(null)
  const [balance, setBalance] = useState<string | null>(null)

  const isConnected: boolean = !!account

  const handleAccountsChanged = (accounts: unknown): void => {
    if (Array.isArray(accounts)) {
      if (accounts.length === 0) {
        disconnect()
      } else {
        setAccount(accounts[0])
        if (accounts[0]) {
          fetchBalance(accounts[0])
        }
      }
    }
  }

  const handleChainChanged = (): void => {
    window.location.reload()
  }

  const checkConnection = async (): Promise<void> => {
    if (MOCK_MODE) {
      const savedAccount = localStorage.getItem('mock_account')
      if (savedAccount) {
        setAccount(savedAccount)
        setChainId(80001)
        setBalance('10.5')
      }
      return
    }

    if (typeof window !== "undefined" && window.ethereum) {
      try {
        const accounts = await window.ethereum.request({
          method: "eth_accounts"
        }) as string[]

        if (accounts.length > 0) {
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
    if (MOCK_MODE) {
      setChainId(80001)
      return
    }

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
    if (MOCK_MODE) {
      setBalance('10.5')
      return
    }

    if (typeof window !== "undefined" && window.ethereum) {
      try {
        const balanceHex = await window.ethereum.request({
          method: "eth_getBalance",
          params: [address, "latest"],
        }) as string

        if (typeof balanceHex === 'string') {
          const balanceWei = BigInt(balanceHex);
          const balanceEth = (Number(balanceWei) / 1e18).toFixed(4)
          setBalance(balanceEth)
        }
      } catch (error) {
        console.error("Error fetching balance:", error)
      }
    }
  }

  const connect = async (): Promise<void> => {
    if (MOCK_MODE) {
      setIsConnecting(true)
      setTimeout(() => {
        const mockAcc = '0x' + Math.random().toString(16).slice(2, 42).padStart(40, '0')
        setAccount(mockAcc)
        setChainId(80001)
        setBalance('10.5')
        localStorage.setItem('mock_account', mockAcc)
        setIsConnecting(false)
      }, 1000)
      return
    }

    if (typeof window === "undefined" || !window.ethereum) {
      alert("MetaMask is not installed. Please install MetaMask to use this feature.")
      return
    }

    setIsConnecting(true)
    try {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      }) as string[]

      if (accounts.length > 0) {
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
    if (MOCK_MODE) {
      localStorage.removeItem('mock_account')
    }
  }

  useEffect(() => {
    checkConnection()

    if (typeof window !== "undefined" && window.ethereum && !MOCK_MODE) {
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
