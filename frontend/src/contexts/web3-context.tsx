"use client"

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react"
import { usePrivy, useWallets } from "@privy-io/react-auth"
import { ethers } from "ethers"

// Type du Smart Wallet Privy natif
// useSmartWallets() n'existe que dans @privy-io/react-auth >= 1.80
// Le wallet "smart" est un ConnectedWallet avec type === 'smart_wallet'
type SmartWallet = {
  address: string;
  sendTransaction: (tx: { to: string; data?: string; value?: string }) => Promise<{ hash: string }>;
} | null;

interface Web3ContextType {
  account: string | null;           // Adresse principale (Smart Wallet si dispo, sinon EOA)
  eoaAddress: string | null;        // Adresse EOA Privy (embedded wallet)
  smartWalletAddress: string | null; // Adresse du Smart Wallet Privy natif
  isConnected: boolean;
  isConnecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  chainId: number | null;
  balance: string | null;
  refreshBalance: () => Promise<void>;
  // Méthode unifiée pour envoyer une tx (smart wallet ou EOA selon dispo)
  sendTransaction: (to: string, data: string, value?: string) => Promise<{ hash: string }>;
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined)

export function Web3Provider({ children }: { children: ReactNode }) {
  const { ready, authenticated, login, logout } = usePrivy()
  const { wallets } = useWallets()

  const [balance, setBalance] = useState<string | null>(null)
  const [chainId, setChainId] = useState<number | null>(null)
  const [isInitializing, setIsInitializing] = useState(false)

  // Séparer EOA et Smart Wallet depuis la liste Privy
  const eoaWallet = wallets.find(w => w.walletClientType === 'privy') || wallets[0] || null
  const smartWalletEntry = wallets.find(w => w.walletClientType === 'smart_wallet') || null

  const eoaAddress = eoaWallet?.address || null
  const smartWalletAddress = smartWalletEntry?.address || null

  // Adresse principale : smart wallet si disponible, sinon EOA
  const account = smartWalletAddress || eoaAddress

  const isConnected = ready && authenticated && !!account
  const isConnecting = !ready || isInitializing

  const refreshBalance = useCallback(async () => {
    if (!eoaWallet || !account) {
      setBalance(null)
      return
    }
    try {
      const eip1193provider = await eoaWallet.getEthereumProvider()
      const provider = new ethers.BrowserProvider(eip1193provider)
      const rawBalance = await provider.getBalance(account)
      setBalance(parseFloat(ethers.formatEther(rawBalance)).toFixed(4))
    } catch (err) {
      console.warn('[Web3] Failed to fetch wallet balance:', err)
      setBalance('0.0000')
    }
  }, [eoaWallet, account])

  useEffect(() => {
    if (eoaWallet) {
      const cid = eoaWallet.chainId
      if (cid && cid.startsWith('eip155:')) {
        setChainId(Number(cid.split(':')[1]))
      }
      refreshBalance()
    } else {
      setChainId(null)
      setBalance(null)
    }
  }, [eoaWallet, refreshBalance])

  /**
   * Méthode unifiée pour envoyer une transaction.
   * - Si un Smart Wallet Privy est disponible → passe par lui (gasless si paymaster configuré)
   * - Sinon → passe par l'EOA Privy classique via ethers
   */
  const sendTransaction = useCallback(async (
    to: string,
    data: string,
    value?: string
  ): Promise<{ hash: string }> => {
    if (smartWalletEntry) {
      // Smart Wallet Privy natif — envoie via l'EIP-1193 provider du smart wallet
      console.log('[Privy Smart Wallet] Sending transaction via smart wallet:', smartWalletAddress)
      const eip1193provider = await smartWalletEntry.getEthereumProvider()
      const provider = new ethers.BrowserProvider(eip1193provider)
      const signer = await provider.getSigner()
      const tx = await signer.sendTransaction({
        to,
        data,
        ...(value ? { value: BigInt(value) } : {}),
      })
      console.log('[Privy Smart Wallet] Transaction sent:', tx.hash)
      return { hash: tx.hash }
    }

    if (eoaWallet) {
      // Fallback : EOA Privy classique
      console.log('[Privy EOA] Sending transaction via EOA:', eoaAddress)
      const eip1193provider = await eoaWallet.getEthereumProvider()
      const provider = new ethers.BrowserProvider(eip1193provider)
      const signer = await provider.getSigner()
      const tx = await signer.sendTransaction({
        to,
        data,
        ...(value ? { value: BigInt(value) } : {}),
      })
      console.log('[Privy EOA] Transaction sent:', tx.hash)
      return { hash: tx.hash }
    }

    throw new Error('Aucun wallet connecté')
  }, [smartWalletEntry, eoaWallet, smartWalletAddress, eoaAddress])

  const connect = async (): Promise<void> => {
    login()
  }

  const disconnect = (): void => {
    logout()
  }

  const contextValue: Web3ContextType = {
    account,
    eoaAddress,
    smartWalletAddress,
    isConnected,
    isConnecting,
    connect,
    disconnect,
    chainId,
    balance,
    refreshBalance,
    sendTransaction,
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
