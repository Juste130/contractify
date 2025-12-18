"use client"

import { Wallet, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useWeb3 } from "@/contexts/web3-context"

export function WalletButton() {
  const { account, isConnected, isConnecting, connect, disconnect, chainId, balance } = useWeb3()

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const getChainName = (id: number | null) => {
    switch (id) {
      case 1:
        return "Ethereum"
      case 137:
        return "Polygon"
      case 80001:
        return "Mumbai Testnet"
      default:
        return "Unknown Network"
    }
  }

  if (!isConnected) {
    return (
      <Button onClick={connect} disabled={isConnecting} size="sm">
        <Wallet className="h-4 w-4 mr-2" />
        {isConnecting ? "Connecting..." : "Connect Wallet"}
      </Button>
    )
  }

  return (
    <div className="bg-[#3b82f6] text-white rounded-lg hover:bg-[#22c55e] transition-colors">
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="bg-transparent">
          <Wallet className="h-4 w-4 mr-2" />
          {formatAddress(account!)}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Wallet Info</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="px-2 py-2 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Address:</span>
            <span className="font-mono">{formatAddress(account!)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Network:</span>
            <span>{getChainName(chainId)}</span>
          </div>
          {balance && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Balance:</span>
              <span>{balance} ETH</span>
            </div>
          )}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={disconnect} className="cursor-pointer">
          <LogOut className="h-4 w-4 mr-2" />
          Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
    </div>
  )
}
