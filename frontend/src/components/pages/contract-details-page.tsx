"use client"

import { useState, useEffect } from "react"
import { AppSidebar } from "../layout/app-sidebar"
import { Button } from "../ui/button"
import { Card } from "../ui/card"
import { Badge } from "../ui/badge"
import { contractsApi, type Contract } from "@/lib/api/contracts"
import { useWeb3 } from "@/contexts/web3-context"
import { useContract } from "@/hooks/useContract"
import {
  FileText,
  Users,
  Calendar,
  Shield,
  Download,
  ExternalLink,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2
} from "lucide-react"
import { AiBadge } from "../ui/ai-badge"

interface ContractDetailsPageProps {
  id: string
  created?: boolean
}

export function ContractDetailsPage({ id, created }: ContractDetailsPageProps) {
  const [contract, setContract] = useState<Contract | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { account, isConnected } = useWeb3()
  const { signContract, loading: isSigning } = useContract()

  const fetchDetails = async () => {
    try {
      setLoading(true)
      const response = await contractsApi.getContractDetails(parseInt(id))
      setContract(response.contract)
    } catch (err: any) {
      setError("Impossible de charger les détails du contrat.")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDetails()
  }, [id])

  const handleSign = async () => {
    try {
      await signContract(id)
      await fetchDetails() // Refresh data after signing
    } catch (err) {
      // Error is handled by useContract and displayed if needed
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Actif</Badge>
      case 'PENDING_SIGNATURES':
        return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">En attente de signatures</Badge>
      case 'DRAFT':
        return <Badge variant="outline">Brouillon</Badge>
      case 'COMPLETED':
        return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">Terminé</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen bg-muted">
        <AppSidebar />
        <main className="flex-1 flex items-center justify-center" style={{ marginLeft: 'var(--sidebar-width, 256px)' }}>
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </main>
      </div>
    )
  }

  if (error || !contract) {
    return (
      <div className="flex min-h-screen bg-muted">
        <AppSidebar />
        <main className="flex-1 p-8" style={{ marginLeft: 'var(--sidebar-width, 256px)' }}>
          <Card className="p-8 text-center max-w-2xl mx-auto">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Une erreur est survenue</h2>
            <p className="text-muted-foreground mb-6">{error || "Contrat introuvable"}</p>
            <Button onClick={() => window.location.reload()}>Réessayer</Button>
          </Card>
        </main>
      </div>
    )
  }

  const signers = contract.metadata?.signers || []
  const currentUserSigner = signers.find((s: any) => s.address.toLowerCase() === account?.toLowerCase())
  const canSign = currentUserSigner && !currentUserSigner.hasSigned && contract.status === 'PENDING_SIGNATURES'

  return (
    <div className="flex min-h-screen bg-muted">
      <AppSidebar />

      <main className="flex-1 py-8 px-8 transition-all duration-300" style={{ marginLeft: 'var(--sidebar-width, 256px)' }}>
        {created && (
          <div className="max-w-6xl mx-auto mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            <p className="text-sm font-medium text-green-700">Votre contrat a été créé et ancré sur la blockchain avec succès !</p>
          </div>
        )}

        <div className="max-w-6xl mx-auto">
          {/* Header Actions */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold">{contract.title}</h1>
                {getStatusBadge(contract.status)}
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  Créé le {new Date(contract.createdAt).toLocaleDateString()}
                </span>
                <span className="flex items-center gap-1">
                  <FileText className="w-4 h-4" />
                  ID Blockchain: #{contract.contractId}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-2">
                <Download className="w-4 h-4" />
                PDF
              </Button>
              <Button variant="outline" size="sm" className="gap-2" asChild>
                <a href={`${process.env.NEXT_PUBLIC_BLOCK_EXPLORER}/address/${contract.metadata?.creator}`} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4" />
                  Explorer
                </a>
              </Button>
              {canSign && (
                <Button
                  className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 px-6"
                  onClick={handleSign}
                  disabled={isSigning}
                >
                  {isSigning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                  Signer le contrat
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content: Document Preview */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="p-0 overflow-hidden shadow-lg border-none bg-white">
                <div className="p-4 bg-muted border-b flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Document Officiel</span>
                  </div>
                  <AiBadge />
                </div>
                <div className="p-10 font-serif text-gray-800 leading-relaxed min-h-[800px] whitespace-pre-wrap">
                  {contract.metadata?.content || "Chargement du contenu..."}
                </div>
              </Card>
            </div>

            {/* Sidebar: Metadata & Signers */}
            <div className="space-y-6">
              <Card className="p-6">
                <h3 className="font-bold flex items-center gap-2 mb-6">
                  <Users className="w-5 h-5 text-primary" />
                  Signataires
                </h3>
                <div className="space-y-4">
                  {signers.map((signer: any, idx: number) => (
                    <div key={idx} className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${signer.hasSigned ? 'bg-green-500/20 text-green-500' : 'bg-yellow-500/20 text-yellow-500'}`}>
                        {signer.hasSigned ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold truncate">{signer.address}</p>
                        <p className="text-[10px] text-muted-foreground uppercase">{signer.role === 0 ? 'Créateur' : 'Signataire'}</p>
                        {signer.hasSigned && (
                          <p className="text-[10px] text-green-500 mt-1 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Signé le {new Date(signer.signedAt * 1000).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="font-bold flex items-center gap-2 mb-4">
                  <Shield className="w-5 h-5 text-primary" />
                  Détails Blockchain
                </h3>
                <div className="space-y-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Statut</span>
                    <span className="font-medium text-xs font-mono">{contract.status}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Type</span>
                    <span className="font-medium">Contrat NFT</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">IPFS Hash</span>
                    <span className="font-medium text-[10px] font-mono truncate max-w-[120px]">{contract.ipfsHash}</span>
                  </div>
                  <div className="pt-4 border-t">
                    <p className="text-[10px] text-muted-foreground mb-4">
                      Ce contrat est immuable et ancré sur le réseau Polygon. Chaque signature est une transaction vérifiable.
                    </p>
                    <Button variant="outline" className="w-full text-xs gap-2" asChild>
                      <a href={`https://gateway.pinata.cloud/ipfs/${contract.ipfsHash}`} target="_blank" rel="noopener noreferrer">
                        <Download className="w-3 h-3" />
                        Voir sur IPFS
                      </a>
                    </Button>
                  </div>
                </div>
              </Card>

              <Card className="p-6 bg-primary/5 border-primary/20">
                <h4 className="text-xs font-bold uppercase tracking-wider text-primary mb-3">Historique IA</h4>
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <div className="w-1 h-full bg-primary/20 rounded"></div>
                    <div>
                      <p className="text-[11px] font-bold">Génération initiale</p>
                      <p className="text-[10px] text-muted-foreground">Modèle GPT-4 optimisé pour le droit français.</p>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
