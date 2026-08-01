"use client"

import { useState, useEffect } from "react"
import { AppSidebar } from "../layout/app-sidebar"
import { Button } from "../ui/button"
import { Card } from "../ui/card"
import { Badge } from "../ui/badge"
import { contractsApi, type Contract } from "@/lib/api/contracts"
import { ipfsApi } from "@/lib/api/ipfs"
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
  Loader2,
  Send
} from "lucide-react"
import { KycSignatureModal } from "@/components/contract/kyc-signature-modal"
import { AiBadge } from "../ui/ai-badge"
import { ContractMarkdownRenderer } from "@/components/contract/contract-markdown-renderer"

interface ContractDetailsPageProps {
  id: string
  created?: boolean
}

export function ContractDetailsPage({ id, created }: ContractDetailsPageProps) {
  const [contract, setContract] = useState<Contract | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showKycModal, setShowKycModal] = useState(false)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
  const { account, isConnected } = useWeb3()
  const { signContract, createContract, loading: isSigning } = useContract()

  const handleDownloadPDF = async () => {
    if (!contract) return;
    setIsGeneratingPdf(true);
    try {
      const { generateCertifiedPDF } = await import("@/lib/utils/pdfGenerator");
      
      const signersForPdf = contract.status === 'DRAFT_WAITING_SIGNERS' || contract.status === 'READY_TO_DEPLOY'
        ? (contract as any).signatories.map((s: any) => ({ name: s.name || s.email, email: s.email, isRegistered: s.isRegistered }))
        : (contract.metadata?.signers || []).map((s: any) => ({ name: s.name || s.address, address: s.address, hasSigned: s.hasSigned }));

      await generateCertifiedPDF({
        title: contract.title,
        content: contract.metadata?.content || "",
        sha256Hash: contract.metadata?.sha256Hash || contract.ipfsHash || "Non généré",
        contractId: typeof contract.id === 'number' ? contract.id : undefined,
        draftId: typeof contract.id === 'string' ? contract.id : undefined,
        parties: {
          partyA: contract.metadata?.parties?.partyA || { name: "Partie A", email: "" },
          partyB: contract.metadata?.parties?.partyB || { name: "Partie B", email: "" }
        },
        signatories: signersForPdf,
        status: contract.status,
        createdAt: contract.createdAt
      });
    } catch (err) {
      console.error("Erreur génération PDF:", err);
    } finally {
      setIsGeneratingPdf(false);
    }
  }

  const fetchDetails = async () => {
    try {
      setLoading(true)
      if (isNaN(Number(id))) {
        // C'est un brouillon (UUID)
        const response = await contractsApi.getDraftDetails(id)
        setContract(response.contract)
      } else {
        // C'est un contrat déployé (Int)
        const response = await contractsApi.getContractDetails(parseInt(id))
        setContract(response.contract)
      }
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

  const handleDeployDraft = async () => {
    if (!contract || !isConnected) return;
    try {
      setLoading(true);
      const metadata = contract.metadata;
      const signatories = (contract as any).signatories || [];
      
      const signersWithRoles = signatories.map((s: any) => ({
         signer: s.walletAddress,
         role: s.role,
         customRole: "",
         hasSignedContract: false,
         signedAt: 0,
      }));

      const expiresAt = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;
      
      const tx = await createContract(
        contract.ipfsHash,
        metadata.sha256Hash,
        signersWithRoles,
        expiresAt,
        metadata.options?.allowTermination || true,
        metadata.options?.allowDispute || true,
        "0",
        0,
        "Contrat déployé depuis un brouillon ContracTify"
      );
      
      // Update DB
      await contractsApi.markDraftDeployed(contract.id, { contractId: tx.id, transactionHash: tx.transactionHash || "" });
      window.location.href = `/contract-details/${tx.id}`;
    } catch(err: any) {
      setError("Erreur lors du déploiement : " + (err.message || "Erreur inconnue"));
      setLoading(false);
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Actif</Badge>
      case 'PENDING_SIGNATURES':
        return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">En attente de signatures</Badge>
      case 'DRAFT_WAITING_SIGNERS':
        return <Badge className="bg-orange-500/10 text-orange-500 border-orange-500/20">En attente d'inscriptions</Badge>
      case 'READY_TO_DEPLOY':
        return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">Prêt à être déployé</Badge>
      case 'COMPLETED':
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Terminé</Badge>
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
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2"
                onClick={handleDownloadPDF}
                disabled={isGeneratingPdf}
              >
                {isGeneratingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
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
                  onClick={() => setShowKycModal(true)}
                  disabled={isSigning}
                >
                  {isSigning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                  Signer le contrat
                </Button>
              )}
              {contract.status === 'READY_TO_DEPLOY' && contract.userId === account /* assuming creator */ && (
                 <Button
                 className="bg-[#FFC107] text-[#212121] hover:bg-[#FFB300] gap-2 px-6 font-bold"
                 onClick={handleDeployDraft}
                 disabled={loading}
               >
                 {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                 Déployer sur la blockchain
               </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content: Document Preview */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="p-0 overflow-hidden shadow-lg border-none bg-white">
                {/* Document toolbar */}
                <div className="p-3 bg-gray-50 border-b flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-400" />
                      <div className="w-3 h-3 rounded-full bg-yellow-400" />
                      <div className="w-3 h-3 rounded-full bg-green-400" />
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-2">Document Officiel — ContracTify</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {!contract.metadata?.isExternalPdf && <AiBadge />}
                    <span className="text-[10px] text-muted-foreground">PDF certifié blockchain</span>
                  </div>
                </div>

                {contract.metadata?.isExternalPdf ? (
                  <div className="w-full h-[800px] bg-gray-100">
                    <iframe 
                      src={ipfsApi.getPublicUrl(contract.ipfsHash)} 
                      className="w-full h-full border-0" 
                      title="Contrat PDF"
                    />
                  </div>
                ) : (
                  /* A4-style paper with shadow for premium feel */
                  <div className="bg-gray-100 p-6 min-h-[900px]">
                    <div className="max-w-[800px] mx-auto bg-white shadow-xl rounded-sm border border-gray-200">
                      {/* Watermark header */}
                      <div className="px-16 pt-10 pb-4 border-b border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4 text-purple-400" />
                          <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">ContracTify</span>
                        </div>
                        <span className="text-[10px] text-gray-400">
                          Créé le {new Date(contract.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </span>
                      </div>

                      {/* Contract body with markdown rendering */}
                      <div className="px-16 py-10 min-h-[700px]">
                        <ContractMarkdownRenderer content={contract.metadata?.content || ""} />
                      </div>

                      {/* Footer */}
                      <div className="px-16 pb-8 pt-4 border-t border-gray-100">
                        <p className="text-[9px] text-gray-400 text-center">
                          Document généré et certifié par ContracTify • Ancré sur Polygon Blockchain
                          {contract.ipfsHash && ` • IPFS: ${contract.ipfsHash.slice(0, 16)}...`}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
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
                  {(contract as any).signatories ? (
                    // Mode Draft
                    (contract as any).signatories.map((signer: any, idx: number) => (
                      <div key={idx} className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${signer.isRegistered ? 'bg-green-500/20 text-green-500' : 'bg-orange-500/20 text-orange-500'}`}>
                          {signer.isRegistered ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold truncate">{signer.name || signer.email}</p>
                          <p className="text-[10px] text-muted-foreground uppercase">
                            {signer.role === 1 ? 'Co-Signataire' : signer.role === 2 ? 'Témoin' : 'Représentant'}
                          </p>
                          <p className={`text-[10px] mt-1 flex items-center gap-1 ${signer.isRegistered ? 'text-green-500' : 'text-orange-500'}`}>
                            {signer.isRegistered ? 'Inscrit (Wallet prêt)' : 'En attente d\'inscription'}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    // Mode Blockchain
                    signers.map((signer: any, idx: number) => (
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
                    ))
                  )}
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
                    <span className="font-medium text-[10px] font-mono truncate max-w-[120px]">{contract.ipfsHash || 'N/A'}</span>
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
                <h4 className="text-xs font-bold uppercase tracking-wider text-primary mb-3">Génération IA</h4>
                <div className="space-y-3">
                  <div className="flex gap-3 items-start">
                    <div className="w-1 self-stretch bg-primary/20 rounded shrink-0"></div>
                    <div>
                      <p className="text-[11px] font-bold">Contrat généré par IA</p>
                      <p className="text-[10px] text-muted-foreground mt-1">Modèle Llama 3.3 (70B) via Groq — optimisé pour la rédaction juridique.</p>
                    </div>
                  </div>
                  <div className="flex gap-3 items-start">
                    <div className="w-1 self-stretch bg-green-500/20 rounded shrink-0"></div>
                    <div>
                      <p className="text-[11px] font-bold text-green-700">Certifié & ancré</p>
                      <p className="text-[10px] text-muted-foreground mt-1">Hash SHA-256 calculé et stocké sur IPFS + Polygon.</p>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </main>

      {/* KYC Signature Modal */}
      {contract && (
        <KycSignatureModal
          open={showKycModal}
          onClose={() => setShowKycModal(false)}
          onConfirm={handleSign}
          contractTitle={contract.title}
          contractContent={contract.metadata?.content || ""}
          originalHash={contract.metadata?.sha256Hash || ""}
          signerName={contract.metadata?.signers?.find((s: any) => s.address?.toLowerCase() === account?.toLowerCase())?.name || account || "Signataire"}
          signerEmail={contract.metadata?.signers?.find((s: any) => s.address?.toLowerCase() === account?.toLowerCase())?.email}
        />
      )}
    </div>
  )
}
