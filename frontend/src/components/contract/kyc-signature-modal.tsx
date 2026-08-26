"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import {
  ShieldCheck,
  UserCheck,
  FileCheck2,
  PenLine,
  ChevronRight,
  AlertTriangle,
  Loader2,
  CheckCircle2,
} from "lucide-react"
import { E_SIGNATURE_LEGAL_BASIS, DEFAULT_E_SIGNATURE_LEGAL_BASIS } from "@/lib/contract-templates"

interface KycSignatureModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
  contractTitle: string
  contractContent?: string
  originalHash?: string
  signerName?: string
  signerEmail?: string
  /** Country of execution, used to cite the right country's e-signature law instead of
   *  a fixed EU/eIDAS reference that doesn't apply outside the EU/EEA. */
  country?: string
}

async function computeSHA256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

const STEPS = [
  {
    id: "identity",
    icon: UserCheck,
    title: "Confirmation d'identité",
    description:
      "Confirmez que vous êtes bien la personne autorisée à signer ce contrat, via le compte et le portefeuille numérique déjà connectés à cette session. Il ne s'agit pas d'une vérification d'identité par pièce officielle.",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
  },
  {
    id: "review",
    icon: FileCheck2,
    title: "Relecture du document",
    description:
      "Assurez-vous d'avoir lu et compris l'intégralité du contrat avant de signer. Une signature numérique a la même valeur juridique qu'une signature manuscrite.",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
  },
  {
    id: "sign",
    icon: PenLine,
    title: "Signature électronique",
    description:
      "En cliquant sur « Signer », vous apposez votre signature électronique certifiée. Cette action déclenchera une transaction immuable sur la blockchain.",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
  },
]

export function KycSignatureModal({
  open,
  onClose,
  onConfirm,
  contractTitle,
  contractContent,
  originalHash,
  signerName,
  signerEmail,
  country,
}: KycSignatureModalProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [agreed, setAgreed] = useState(false)
  const [signing, setSigning] = useState(false)
  const [done, setDone] = useState(false)
  const [calculatedHash, setCalculatedHash] = useState<string>("")

  useEffect(() => {
    if (open && contractContent) {
      computeSHA256(contractContent).then(setCalculatedHash);
    }
  }, [open, contractContent]);

  const step = STEPS[currentStep]
  const isLastStep = currentStep === STEPS.length - 1
  // A warning that doesn't actually stop the signature isn't a safeguard — if the displayed
  // text doesn't match the hash the platform itself certified, signing it is blocked
  // outright rather than left to a checkbox the user might click past without reading.
  const hasHashMismatch =
    contractContent !== "CONTRAT_PDF_EXTERNE" &&
    calculatedHash !== "" &&
    calculatedHash !== originalHash

  const handleNext = async () => {
    if (isLastStep) {
      if (!agreed || hasHashMismatch) return
      try {
        setSigning(true)
        await onConfirm()
        setDone(true)
      } catch {
        // error handled upstream
      } finally {
        setSigning(false)
      }
    } else {
      setCurrentStep((s) => s + 1)
    }
  }

  const handleClose = () => {
    // Reset state on close
    setCurrentStep(0)
    setAgreed(false)
    setSigning(false)
    setDone(false)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg p-0 overflow-hidden rounded-2xl border border-border/50 shadow-2xl">
        {/* Header gradient */}
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent px-8 pt-8 pb-6 border-b border-border/30">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold leading-tight">
                Signature sécurisée
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Processus de vérification en {STEPS.length} étapes
              </DialogDescription>
            </div>
          </div>

          {/* Contract info */}
          <div className="bg-background/60 backdrop-blur rounded-xl px-4 py-3 border border-border/40">
            <p className="text-[11px] text-muted-foreground uppercase tracking-widest mb-1 font-medium">
              Contrat à signer
            </p>
            <p className="text-sm font-bold text-foreground truncate">{contractTitle}</p>
            {(signerName || signerEmail) && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {signerName && <span className="font-medium">{signerName} · </span>}
                {signerEmail}
              </p>
            )}
          </div>
        </div>

        {/* Step progress */}
        <div className="flex gap-1.5 px-8 py-4 bg-muted/30">
          {STEPS.map((s, i) => (
            <div
              key={s.id}
              className={`h-1 flex-1 rounded-full transition-all duration-500 ${
                i < currentStep
                  ? "bg-primary"
                  : i === currentStep
                  ? "bg-primary/50"
                  : "bg-muted"
              }`}
            />
          ))}
        </div>

        {/* Body */}
        <div className="px-8 pb-8 pt-2">
          {done ? (
            // Success state
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              </div>
              <h3 className="text-lg font-bold mb-2">Contrat signé avec succès !</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Votre signature a été enregistrée sur la blockchain. Le contrat a été mis à
                jour automatiquement.
              </p>
              <Button onClick={handleClose} className="w-full">
                Fermer
              </Button>
            </div>
          ) : (
            <>
              {/* Current step card */}
              <div
                className={`rounded-xl border ${step.border} ${step.bg} p-5 mb-5 transition-all duration-300`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-full bg-background/70 flex items-center justify-center shrink-0 ${step.color}`}>
                    <step.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-sm">{step.title}</h3>
                      <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0">
                        {currentStep + 1}/{STEPS.length}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              </div>

              {/* Legal warning on review step */}
              {currentStep === 1 && (
                <>
                  <div className="flex flex-col gap-2 p-3 rounded-lg bg-muted/40 border border-border/50 mb-3">
                    <div className="flex items-center gap-2 mb-1">
                      <ShieldCheck className="w-4 h-4 text-emerald-500" />
                      <p className="text-xs font-bold">Vérification de l'intégrité {contractContent !== "CONTRAT_PDF_EXTERNE" && "(SHA-256)"}</p>
                    </div>
                    {contractContent === "CONTRAT_PDF_EXTERNE" ? (
                      <div className="text-[10px] font-mono break-all space-y-1">
                        <p className="text-emerald-500 font-bold">Intégrité du fichier PDF garantie par IPFS</p>
                        <p><span className="text-muted-foreground">CID (Hash) :</span> {originalHash || "N/A"}</p>
                      </div>
                    ) : (
                      <>
                        <div className="text-[10px] font-mono break-all space-y-1">
                          <p><span className="text-muted-foreground">Texte affiché :</span> <span className={calculatedHash === originalHash ? "text-emerald-500" : "text-amber-500"}>{calculatedHash || "Calcul en cours..."}</span></p>
                          <p><span className="text-muted-foreground">Original (IPFS) :</span> {originalHash || "N/A"}</p>
                        </div>
                        {hasHashMismatch && (
                          <p className="text-[10px] text-destructive mt-1 font-bold">⚠ Le texte affiché diffère de la version originale certifiée — la signature est bloquée tant que cet écart n'est pas résolu.</p>
                        )}
                      </>
                    )}
                  </div>

                  <div className="flex gap-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 mb-4">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      <span className="text-amber-600 font-semibold">Attention :</span> Toute
                      signature est définitive et ne peut être annulée qu'avec l'accord de
                      toutes les parties impliquées.
                    </p>
                  </div>
                </>
              )}

              {/* Agreement checkbox on last step */}
              {isLastStep && (
                <div
                  className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all mb-5 ${
                    agreed
                      ? "bg-emerald-500/5 border-emerald-500/30"
                      : "bg-muted/40 border-border/50"
                  }`}
                  onClick={() => setAgreed((v) => !v)}
                >
                  <Checkbox
                    id="kyc-agree"
                    checked={agreed}
                    onCheckedChange={(v) => setAgreed(Boolean(v))}
                    className="mt-0.5"
                  />
                  <label htmlFor="kyc-agree" className="text-xs cursor-pointer leading-relaxed">
                    Je confirme avoir lu et compris le contrat dans son intégralité. Je
                    consens à apposer ma signature électronique ayant valeur légale, au sens
                    de {(country && E_SIGNATURE_LEGAL_BASIS[country]) || DEFAULT_E_SIGNATURE_LEGAL_BASIS}.
                  </label>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleClose}
                  disabled={signing}
                >
                  Annuler
                </Button>
                <Button
                  className="flex-1 gap-2"
                  onClick={handleNext}
                  disabled={(isLastStep && (!agreed || hasHashMismatch)) || signing}
                >
                  {signing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Signature en cours...
                    </>
                  ) : isLastStep ? (
                    <>
                      <PenLine className="w-4 h-4" />
                      Signer le contrat
                    </>
                  ) : (
                    <>
                      Continuer
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
