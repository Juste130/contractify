"use client";

import { useState, useEffect } from "react";
import { AppSidebar } from "../layout/app-sidebar";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { AIInput } from "../ui/ai-input";
import { Label } from "../ui/label";
import { Card } from "../ui/card";
import { Textarea } from "../ui/textarea";
import { AiBadge } from "../ui/ai-badge";
import { aiApi } from "@/lib/api/ai";
import { ipfsApi } from "@/lib/api/ipfs";
import { useWeb3 } from "@/contexts/web3-context";
import { useContract } from "@/hooks/useContract";
import { contractsApi } from "@/lib/api/contracts";
import {
  FileText,
  Users,
  Home,
  FileSignature,
  Briefcase,
  ChevronRight,
  ChevronLeft,
  Brain,
  Send,
  Eye,
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
  Shield,
  CheckCircle2,
  Scale,
  Wallet,
  Info,
  Building,
  User,
} from "lucide-react";
import { Checkbox } from "../ui/checkbox";
import { useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import {
  CONTRACT_TEMPLATES,
  CLAUSE_LIBRARY,
  getContractTemplate,
  E_SIGNATURE_LEGAL_BASIS,
  DEFAULT_E_SIGNATURE_LEGAL_BASIS,
} from "@/lib/contract-templates";
import { SIGNATORY_ROLE_LABELS } from "@/lib/contract-roles";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Signatory {
  name: string;
  email: string;
  role: number;          // 1 = CoSigner, 2 = Witness, 3 = LegalRepresentative
}

interface ValidationErrors {
  [key: string]: string;
}

// ─── Utils ────────────────────────────────────────────────────────────────────

async function computeSHA256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function isValidEthAddress(addr: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(addr);
}

const ROLE_LABELS = SIGNATORY_ROLE_LABELS;

const DRAFT_STORAGE_KEY = "contractify:create-contract-draft";

// ─── Component ───────────────────────────────────────────────────────────────

// Purely cosmetic — the actual fields/prompt content per contract type live in
// @/lib/contract-templates and are shared with the template gallery.
const TEMPLATE_ICONS: Record<string, typeof FileText> = {
  cdi: Briefcase,
  cdd: Briefcase,
  freelance: Users,
  location: Home,
  nda: FileSignature,
  commercial: Briefcase,
  custom: FileText,
};

interface DraftSnapshot {
  selectedTemplate: string;
  formData: any;
  contractText: string;
  signatories: Signatory[];
  currentStep: number;
}

interface CreateContractPageProps {
  /** Contract type id preselected from the template gallery (/templates -> ?template=cdi). */
  template?: string;
}

export function CreateContractPage({ template }: CreateContractPageProps = {}) {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSimplifying, setIsSimplifying] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generationFailed, setGenerationFailed] = useState(false);
  const [hasValidated, setHasValidated] = useState(false);
  const [acknowledgeIssues, setAcknowledgeIssues] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [aiValidationResult, setAiValidationResult] = useState<{ issues: string[]; suggestions: string[] } | null>(null);
  const [consentChecked, setConsentChecked] = useState(false);
  const router = useRouter();
  const { isConnected, connect } = useWeb3();
  const { createContract } = useContract();

  // ─── Form State ─────────────────────────────────────────────────────────────

  const [formData, setFormData] = useState({
    partyA: { type: "company", name: "", email: "", address: "", phone: "", rccm: "", ifu: "", legalRepName: "", legalRepTitle: "" },
    partyB: { type: "individual", name: "", email: "", address: "", phone: "", rccm: "", ifu: "", legalRepName: "", legalRepTitle: "" },
    details: {
      duration: "",
      amount: "",
      paymentTerms: "",
      startDate: new Date().toISOString().split("T")[0],
      description: "",
      country: "Bénin",
      city: "Cotonou",
      escrowAmount: "",
      escrowDeadline: "",
      penaltyPercent: "",
    },
    options: {
      confidentiality: false,
      nonCompete: false,
      probation: false,
      allowTermination: true,
      allowDispute: true,
    },
  });

  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const [contractText, setContractText] = useState("");
  const [signatories, setSignatories] = useState<Signatory[]>([]);
  const [newSignatory, setNewSignatory] = useState<Signatory>({
    name: "",
    email: "",
    role: 1,
  });

  // Preselect the template chosen from the gallery (/templates -> ?template=cdi), and
  // restore a locally-saved draft if the user left mid-way through a previous session.
  useEffect(() => {
    if (template && (template === "pdf_upload" || getContractTemplate(template))) {
      setSelectedTemplate(template);
      return; // A deliberate gallery choice takes priority over a stale local draft.
    }

    try {
      const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
      if (!raw) return;
      const snapshot: DraftSnapshot = JSON.parse(raw);
      if (!snapshot.selectedTemplate) return;
      setSelectedTemplate(snapshot.selectedTemplate);
      setFormData((prev) => ({ ...prev, ...snapshot.formData }));
      setContractText(snapshot.contractText || "");
      setSignatories(snapshot.signatories || []);
      setCurrentStep(snapshot.currentStep || 1);
      setDraftRestored(true);
    } catch {
      // Corrupted or unreadable snapshot — ignore, start fresh.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template]);

  // Best-effort autosave: losing a contract someone spent time filling in (and possibly
  // already paid an AI generation call for) just because a tab got closed is a bad time to
  // find out there was no draft persistence between steps.
  useEffect(() => {
    if (!selectedTemplate) return;
    const snapshot: DraftSnapshot = { selectedTemplate, formData, contractText, signatories, currentStep };
    try {
      window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(snapshot));
    } catch {
      // localStorage unavailable (private mode, quota) — autosave is a convenience, not critical.
    }
  }, [selectedTemplate, formData, contractText, signatories, currentStep]);

  function clearSavedDraft() {
    try { window.localStorage.removeItem(DRAFT_STORAGE_KEY); } catch { /* ignore */ }
  }

  const activeTemplate = getContractTemplate(selectedTemplate);

  // ─── UI Templates ───────────────────────────────────────────────────────────

  const contractTemplatesUI = [
    { id: "pdf_upload", name: "Importer PDF", icon: FileSignature, description: "Uploader un contrat existant" },
    ...CONTRACT_TEMPLATES.filter((t) => t.id !== "custom").map((t) => ({
      id: t.id,
      name: t.name,
      icon: TEMPLATE_ICONS[t.id] ?? FileText,
      description: t.description,
    })),
    { id: "custom", name: "Personnalisé", icon: FileText, description: "Créer un contrat sur mesure" },
  ];

  const steps = [
    { number: 1, title: "Type de contrat" },
    { number: 2, title: "Informations" },
    { number: 3, title: "Aperçu & Édition" },
    { number: 4, title: "Signataires" },
  ];

  // ─── Validation ─────────────────────────────────────────────────────────────

  function validateStep2(): boolean {
    if (selectedTemplate === "pdf_upload") {
      if (!uploadedFile) {
        setError("Veuillez sélectionner un fichier PDF.");
        return false;
      }
      return true;
    }
    const errors: ValidationErrors = {};
    if (!formData.partyA.name.trim()) errors["partyA.name"] = "Le nom de la Partie A est requis.";
    if (!formData.partyA.email.trim()) errors["partyA.email"] = "L'email de la Partie A est requis.";
    if (formData.partyA.type === "company") {
      if (!formData.partyA.rccm?.trim()) errors["partyA.rccm"] = "Le RCCM est requis pour une entreprise.";
      if (!formData.partyA.legalRepName?.trim()) errors["partyA.legalRepName"] = "Le représentant légal est requis pour une entreprise.";
    }
    if (!formData.partyB.name.trim()) errors["partyB.name"] = "Le nom de la Partie B est requis.";
    if (!formData.partyB.email.trim()) errors["partyB.email"] = "L'email de la Partie B est requis.";
    if (formData.partyB.type === "company") {
      if (!formData.partyB.rccm?.trim()) errors["partyB.rccm"] = "Le RCCM est requis pour une entreprise.";
      if (!formData.partyB.legalRepName?.trim()) errors["partyB.legalRepName"] = "Le représentant légal est requis pour une entreprise.";
    }
    if (!formData.details.description.trim()) errors["details.description"] = "La description / objet du contrat est requis.";
    if (!formData.details.city.trim()) errors["details.city"] = "La ville de signature / exécution est requise.";
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function validateStep3(): boolean {
    if (selectedTemplate === "pdf_upload") return true;
    if (!contractText.trim()) {
      setError("Le contrat est vide. Générez ou saisissez du contenu avant de continuer.");
      return false;
    }
    if (!hasValidated) {
      setError("Veuillez lancer la vérification de conformité avant de continuer.");
      return false;
    }
    if (aiValidationResult && aiValidationResult.issues.length > 0 && !acknowledgeIssues) {
      setError("Des points de conformité ont été relevés : cochez la case ci-contre pour continuer malgré tout, ou corrigez le contrat.");
      return false;
    }
    return true;
  }

  function validateStep4(): boolean {
    const errors: ValidationErrors = {};
    if (signatories.length === 0) errors["signatories"] = "Ajoutez au moins un signataire.";
    if (!consentChecked) errors["consent"] = "Vous devez cocher la case de consentement pour continuer.";
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const handleGenerateWithAI = async () => {
    if (!validateStep2()) return;
    setError(null);
    setGenerationFailed(false);

    if (selectedTemplate === "pdf_upload") {
      setCurrentStep(4);
      return;
    }

    setIsGenerating(true);
    setCurrentStep(3);
    setHasValidated(false);
    setAcknowledgeIssues(false);
    setAiValidationResult(null);

    try {
      const readableClauses = Object.entries(formData.options)
        .filter(([key, val]) => val && (activeTemplate?.clauseOptions.includes(key as any) ?? true))
        .map(([key]) => CLAUSE_LIBRARY[key as keyof typeof CLAUSE_LIBRARY]?.promptText || key);

      const partyALine = formData.partyA.type === 'company'
        ? `Société, RCCM: ${formData.partyA.rccm}, IFU: ${formData.partyA.ifu}, représentée par ${formData.partyA.legalRepName || 'un représentant légal'}${formData.partyA.legalRepTitle ? `, en qualité de ${formData.partyA.legalRepTitle}` : ''}`
        : 'Particulier/Freelance';
      const partyBLine = formData.partyB.type === 'company'
        ? `Société, RCCM: ${formData.partyB.rccm}, IFU: ${formData.partyB.ifu}, représentée par ${formData.partyB.legalRepName || 'un représentant légal'}${formData.partyB.legalRepTitle ? `, en qualité de ${formData.partyB.legalRepTitle}` : ''}`
        : 'Particulier/Freelance';

      const response = await aiApi.generateContract({
        templateType: selectedTemplate,
        partyAData: formData.partyA,
        partyBData: formData.partyB,
        additionalClauses: readableClauses,
        context: `Tu es un expert juridique. Rédige un contrat de type "${activeTemplate?.name || selectedTemplate}" professionnel, structuré et équilibré.
        Objet du contrat: ${formData.details.description}. Durée: ${formData.details.duration}. Rémunération: ${formData.details.amount}. Date: ${formData.details.startDate}.
        Lieu d'exécution: ${formData.details.city}, ${formData.details.country}.
        Partie A (${activeTemplate?.partyALabel || 'Partie A'}): ${partyALine}.
        Partie B (${activeTemplate?.partyBLabel || 'Partie B'}): ${partyBLine}.
        Important : Le contrat doit impérativement inclure une clause stipulant que le droit applicable est le droit du/de la ${formData.details.country} et que le tribunal compétent est celui de la ville de ${formData.details.city}.`
      });
      setContractText(response.contract);

      // Pre-fill signatories from party emails
      const initial: Signatory[] = [];
      if (formData.partyB.email) {
        initial.push({ name: formData.partyB.name, email: formData.partyB.email, role: 1 });
      }
      setSignatories(initial);
    } catch (err: any) {
      setError("Échec de la génération du contrat. Veuillez réessayer.");
      setGenerationFailed(true);
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSimplify = async () => {
    if (!contractText) return;
    setIsSimplifying(true);
    try {
      const response = await aiApi.improveClause({ clause: contractText, context: "Simplifier le langage juridique pour le rendre compréhensible par un non-juriste, sans en changer le sens légal." });
      setContractText(response.improved);
      setHasValidated(false); // Content changed — the previous compliance check no longer covers it.
    } catch {
      setError("Impossible de simplifier le contrat. Réessayez.");
    } finally {
      setIsSimplifying(false);
    }
  };

  const handleValidateCompliance = async () => {
    if (!contractText) return;
    setIsValidating(true);
    setAiValidationResult(null);
    setAcknowledgeIssues(false);
    try {
      const response = await aiApi.validateContract(contractText);
      setAiValidationResult({ issues: response.issues, suggestions: response.suggestions });
      setHasValidated(true);
    } catch {
      setError("Impossible de vérifier la conformité. Réessayez.");
    } finally {
      setIsValidating(false);
    }
  };

  const handleAddSignatory = () => {
    if (!newSignatory.email) {
      setValidationErrors((e) => ({ ...e, newSignatory: "L'email est requis pour notifier le signataire." }));
      return;
    }
    if (signatories.find((s) => s.email === newSignatory.email)) {
      setValidationErrors((e) => ({ ...e, newSignatory: "Cet email est déjà dans la liste." }));
      return;
    }
    setSignatories([...signatories, { ...newSignatory }]);
    setNewSignatory({ name: "", email: "", role: 1 });
    setValidationErrors((e) => { const { newSignatory: _, ...rest } = e; return rest; });
  };

  const removeSignatory = (email: string) => {
    setSignatories(signatories.filter((s) => s.email !== email));
  };

  const handleFinalSubmit = async () => {
    if (!validateStep4()) return;
    if (selectedTemplate !== "pdf_upload" && !contractText.trim()) {
      setError("Le contrat est vide. Retournez à l'étape précédente pour le générer ou le rédiger avant de continuer.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      let ipfsHash = "";
      let sha256Hash = "";
      let content = "";

      if (selectedTemplate === "pdf_upload" && uploadedFile) {
        // Upload the PDF directly to IPFS
        const uploadResult = await ipfsApi.uploadDocument(uploadedFile);
        ipfsHash = uploadResult.cid;
        sha256Hash = ipfsHash; // For external files, CID serves as integrity proof temporarily
        content = "CONTRAT_PDF_EXTERNE";
      } else {
        // AI Generated Contract
        sha256Hash = await computeSHA256(contractText);
        content = contractText;
        const ipfsResult = await ipfsApi.uploadJSON({
          data: {
            title: contractTemplatesUI.find((t) => t.id === selectedTemplate)?.name || "Nouveau Contrat",
            content: contractText,
            sha256Hash,
            parties: { partyA: formData.partyA, partyB: formData.partyB },
            signatories: signatories.map((s) => ({ name: s.name, email: s.email })),
            country: formData.details.country,
            city: formData.details.city,
            createdAt: new Date().toISOString(),
          },
          name: `contract_${Date.now()}`,
        });
        ipfsHash = ipfsResult.cid;
      }

      // Save draft in database
      const draftResult = await contractsApi.saveDraft({
        title: contractTemplatesUI.find((t) => t.id === selectedTemplate)?.name || "Nouveau Contrat",
        ipfsHash: ipfsHash,
        metadata: {
          content: content,
          sha256Hash,
          isExternalPdf: selectedTemplate === "pdf_upload",
          parties: { partyA: formData.partyA, partyB: formData.partyB },
          country: formData.details.country,
          city: formData.details.city,
          options: formData.options,
          escrow: {
            amount: formData.details.escrowAmount || "0",
            deadline: formData.details.escrowDeadline || null,
            penaltyPercent: formData.details.penaltyPercent || "0",
          },
        },
        signatories: signatories
      });

      clearSavedDraft();
      router.push(`/contract-details?id=${draftResult.contract.id}&created=true`);
    } catch (err: any) {
      setError(err.message || "Erreur lors de la sauvegarde du brouillon.");
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateFormData = (section: keyof typeof formData, field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [section]:
        section === "options"
          ? { ...prev.options, [field]: value }
          : { ...(prev[section] as any), [field]: value },
    }));
    // Clear validation error on change
    const key = `${section}.${field}`;
    if (validationErrors[key]) {
      setValidationErrors((e) => { const { [key]: _, ...rest } = e; return rest; });
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-screen bg-muted">
      <AppSidebar />

      <main className="flex-1 transition-all duration-300" style={{ marginLeft: "var(--sidebar-width, 256px)", padding: "2rem" }}>
        {/* Header */}
        <div className="mb-8">
          <h1 className="mb-2">Créer un nouveau contrat</h1>
          <p className="text-muted-foreground">Laissez notre IA vous guider pour créer un contrat professionnel sécurisé.</p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center gap-4 max-w-4xl mx-auto">
            {/* The "PDF importé" path never visits step 3 (Aperçu & Édition) — hide that node
                rather than showing a step that will never light up as active. */}
            {steps.filter((s) => !(selectedTemplate === "pdf_upload" && s.number === 3)).map((step, index, arr) => (
              <div key={step.number} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors font-bold ${
                      currentStep > step.number
                        ? "bg-green-500 text-white"
                        : currentStep === step.number
                        ? "bg-[#FFC107] text-[#212121]"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {currentStep > step.number ? <CheckCircle2 className="w-5 h-5" /> : step.number}
                  </div>
                  <p className={`text-xs mt-2 font-medium ${currentStep >= step.number ? "text-foreground" : "text-muted-foreground"}`}>
                    {step.title}
                  </p>
                </div>
                {index < arr.length - 1 && (
                  <div className={`w-24 h-0.5 mx-2 mb-6 transition-colors ${currentStep > step.number ? "bg-green-500" : "bg-muted"}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {draftRestored && (
          <div className="max-w-4xl mx-auto mb-6 p-3 bg-primary/5 border border-primary/20 rounded-lg flex items-center justify-between gap-3 text-sm">
            <span className="text-muted-foreground">Un brouillon précédent a été restauré.</span>
            <button
              type="button"
              className="text-primary font-medium hover:underline shrink-0"
              onClick={() => { clearSavedDraft(); window.location.reload(); }}
            >
              Effacer et recommencer
            </button>
          </div>
        )}

        {error && (
          <div className="max-w-4xl mx-auto mb-6 p-4 bg-destructive/10 text-destructive border border-destructive/20 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Step Content */}
        <div className="max-w-4xl mx-auto">

          {/* ── STEP 1: Template ── */}
          {currentStep === 1 && (
            <Card className="p-8">
              <div className="text-center mb-8">
                <h2 className="mb-2 font-bold text-2xl">Comment souhaitez-vous procéder ?</h2>
                <p className="text-muted-foreground">Importez un document existant ou utilisez notre IA juridique pour le rédiger.</p>
              </div>

              {/* PDF Upload Option */}
              <div className="mb-8">
                <h3 className="font-semibold text-lg mb-4 text-[#FFC107]">1. Importer un contrat existant</h3>
                <Card
                  className={`p-6 cursor-pointer transition-all hover:shadow-lg border-2 ${
                    selectedTemplate === "pdf_upload" ? "border-[#FFC107] bg-[#FFC107]/5" : "border-border hover:border-[#FFC107]/50"
                  }`}
                  onClick={() => setSelectedTemplate("pdf_upload")}
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-4 rounded-xl shrink-0 ${selectedTemplate === "pdf_upload" ? "bg-[#FFC107]" : "bg-muted"}`}>
                      <FileSignature className={`w-8 h-8 ${selectedTemplate === "pdf_upload" ? "text-[#212121]" : "text-muted-foreground"}`} />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-lg mb-1">J'ai déjà un contrat (PDF)</h4>
                      <p className="text-sm text-muted-foreground">Importez directement votre fichier PDF pour le signer et l'ancrer sur la blockchain.</p>
                    </div>
                    {selectedTemplate === "pdf_upload" && (
                      <CheckCircle2 className="w-6 h-6 text-[#FFC107]" />
                    )}
                  </div>
                </Card>
              </div>

              <div className="relative mb-8">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground font-bold">OU</span>
                </div>
              </div>

              {/* AI Templates */}
              <div className="mb-8">
                <h3 className="font-semibold text-lg mb-4 text-[#9C27B0]">2. Créer avec notre IA Juridique</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {contractTemplatesUI.filter(t => t.id !== "pdf_upload").map((template) => {
                    const Icon = template.icon;
                    return (
                      <Card
                        key={template.id}
                        className={`p-5 cursor-pointer transition-all hover:shadow-lg border-2 ${
                          selectedTemplate === template.id ? "border-[#9C27B0] bg-[#9C27B0]/5" : "border-transparent hover:border-[#9C27B0]/30 bg-muted/30"
                        }`}
                        onClick={() => setSelectedTemplate(template.id)}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className={`p-2 rounded-lg ${selectedTemplate === template.id ? "bg-[#9C27B0]/20" : "bg-background"}`}>
                            <Icon className={`w-5 h-5 ${selectedTemplate === template.id ? "text-[#9C27B0]" : "text-muted-foreground"}`} />
                          </div>
                          {selectedTemplate === template.id ? (
                            <CheckCircle2 className="w-5 h-5 text-[#9C27B0]" />
                          ) : (
                            <AiBadge />
                          )}
                        </div>
                        <h4 className="font-semibold mb-1">{template.name}</h4>
                        <p className="text-xs text-muted-foreground">{template.description}</p>
                      </Card>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t">
                <Button
                  className={`${selectedTemplate === "pdf_upload" ? "bg-[#FFC107] text-[#212121] hover:bg-[#FFB300]" : "bg-[#9C27B0] text-white hover:bg-[#7B1FA2]"} px-8 py-6 text-lg font-bold`}
                  onClick={() => setCurrentStep(2)}
                  disabled={!selectedTemplate}
                >
                  Suivant
                  <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </Card>
          )}

          {/* ── STEP 2: Form ── */}
          {currentStep === 2 && (
            <Card className="p-8">
              {selectedTemplate === "pdf_upload" && (
                <div className="space-y-6 text-center mb-10">
                   <h2 className="text-2xl font-black tracking-tight">Importez votre contrat</h2>
                   <div className="border-2 border-dashed border-[#9C27B0]/30 rounded-xl p-10 bg-muted/20 hover:bg-muted/40 transition-colors">
                     <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                     <p className="text-sm font-medium mb-2">Glissez-déposez votre contrat PDF ici</p>
                     <p className="text-xs text-muted-foreground mb-4">Formats acceptés : .pdf (Max 10Mo)</p>
                     <Input type="file" accept=".pdf" className="max-w-xs mx-auto" onChange={(e) => setUploadedFile(e.target.files?.[0] || null)} />
                   </div>
                   {uploadedFile && (
                     <div className="mt-4 p-4 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center justify-center gap-2 text-green-700 dark:text-green-400">
                       <CheckCircle2 className="w-5 h-5" />
                       <span className="font-semibold text-sm">{uploadedFile.name}</span>
                     </div>
                   )}
                </div>
              )}

              <div className="space-y-8 text-left">
                {selectedTemplate === "pdf_upload" ? (
                  <h3 className="text-xl font-bold border-b pb-2">Informations des signataires</h3>
                ) : (
                  <div className="text-center mb-8">
                    <h2 className="text-2xl font-black tracking-tight">Informations du contrat</h2>
                  </div>
                )}
                {/* Partie A */}
                <Card className="p-6 bg-muted/30 border-0 shadow-none mb-6">
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-lg flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#FFC107] text-[#212121] flex items-center justify-center text-sm font-black">A</div>
                        Partie A{activeTemplate ? ` (${activeTemplate.partyALabel})` : ""}
                      </h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <FieldGroup label="Type d'entité" className="md:col-span-2">
                        <div className="flex bg-muted/50 p-1 rounded-xl w-full max-w-md border">
                          <button
                            type="button"
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-all ${formData.partyA.type === 'company' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                            onClick={() => updateFormData("partyA", "type", "company")}
                          >
                            <Building className="w-4 h-4" /> Entreprise
                          </button>
                          <button
                            type="button"
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-all ${formData.partyA.type === 'individual' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                            onClick={() => updateFormData("partyA", "type", "individual")}
                          >
                            <User className="w-4 h-4" /> Particulier
                          </button>
                        </div>
                      </FieldGroup>
                      
                      <FieldGroup label={formData.partyA.type === 'company' ? "Nom de l'entreprise *" : "Nom complet *"} error={validationErrors["partyA.name"]}>
                        <Input
                          placeholder={formData.partyA.type === 'company' ? "Ma Société SAS" : "Jean Dupont"}
                          className="bg-background"
                          value={formData.partyA.name}
                          onChange={(e) => updateFormData("partyA", "name", e.target.value)}
                        />
                      </FieldGroup>
                      
                      <FieldGroup label="Email *" error={validationErrors["partyA.email"]}>
                        <Input
                          type="email"
                          placeholder="jean@exemple.com"
                          className="bg-background"
                          value={formData.partyA.email}
                          onChange={(e) => updateFormData("partyA", "email", e.target.value)}
                        />
                      </FieldGroup>

                      {formData.partyA.type === "company" && (
                        <>
                          <FieldGroup label="Numéro RCCM *" error={validationErrors["partyA.rccm"]}>
                            <Input
                              placeholder="RB/COT/23 B 12345"
                              className="bg-background"
                              value={formData.partyA.rccm || ""}
                              onChange={(e) => updateFormData("partyA", "rccm", e.target.value)}
                            />
                            <p className="text-[11px] text-muted-foreground mt-1">Obligatoire pour les entreprises commerciales.</p>
                          </FieldGroup>
                          <FieldGroup label="Numéro IFU">
                            <Input
                              placeholder="3202312345678"
                              className="bg-background"
                              value={formData.partyA.ifu || ""}
                              onChange={(e) => updateFormData("partyA", "ifu", e.target.value)}
                            />
                          </FieldGroup>
                          <FieldGroup label="Représentant légal (nom) *" error={validationErrors["partyA.legalRepName"]}>
                            <Input
                              placeholder="Jean Dupont"
                              className="bg-background"
                              value={formData.partyA.legalRepName || ""}
                              onChange={(e) => updateFormData("partyA", "legalRepName", e.target.value)}
                            />
                            <p className="text-[11px] text-muted-foreground mt-1">Personne physique habilitée à engager la société.</p>
                          </FieldGroup>
                          <FieldGroup label="Qualité du représentant">
                            <Input
                              placeholder="Gérant, Directeur Général..."
                              className="bg-background"
                              value={formData.partyA.legalRepTitle || ""}
                              onChange={(e) => updateFormData("partyA", "legalRepTitle", e.target.value)}
                            />
                          </FieldGroup>
                        </>
                      )}

                      <FieldGroup label="Adresse postale" className="md:col-span-2">
                        <Input
                          placeholder="123 Rue de la Paix, Cotonou, Bénin"
                          className="bg-background"
                          value={formData.partyA.address}
                          onChange={(e) => updateFormData("partyA", "address", e.target.value)}
                        />
                      </FieldGroup>
                      
                      <FieldGroup label="Téléphone">
                        <Input
                          placeholder="+229 90 00 00 00"
                          className="bg-background"
                          value={formData.partyA.phone}
                          onChange={(e) => updateFormData("partyA", "phone", e.target.value)}
                        />
                      </FieldGroup>
                    </div>
                  </div>
                </Card>

                {/* Partie B */}
                <Card className="p-6 bg-muted/30 border-0 shadow-none mb-6">
                  <div className="space-y-6">
                    <h3 className="font-bold text-lg flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#4CAF50] text-white flex items-center justify-center text-sm font-black">B</div>
                      Partie B{activeTemplate ? ` (${activeTemplate.partyBLabel})` : ""}
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <FieldGroup label="Type d'entité" className="md:col-span-2">
                        <div className="flex bg-muted/50 p-1 rounded-xl w-full max-w-md border">
                          <button
                            type="button"
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-all ${formData.partyB.type === 'company' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                            onClick={() => updateFormData("partyB", "type", "company")}
                          >
                            <Building className="w-4 h-4" /> Entreprise
                          </button>
                          <button
                            type="button"
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-all ${formData.partyB.type === 'individual' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                            onClick={() => updateFormData("partyB", "type", "individual")}
                          >
                            <User className="w-4 h-4" /> Particulier
                          </button>
                        </div>
                      </FieldGroup>
                      
                      <FieldGroup label={formData.partyB.type === 'company' ? "Nom de l'entreprise *" : "Nom complet *"} error={validationErrors["partyB.name"]}>
                        <Input
                          placeholder={formData.partyB.type === 'company' ? "Consulting SARL" : "Sophie Martin"}
                          className="bg-background"
                          value={formData.partyB.name}
                          onChange={(e) => updateFormData("partyB", "name", e.target.value)}
                        />
                      </FieldGroup>
                      
                      <FieldGroup label="Email *" error={validationErrors["partyB.email"]}>
                        <Input
                          type="email"
                          placeholder="sophie@exemple.com"
                          className="bg-background"
                          value={formData.partyB.email}
                          onChange={(e) => updateFormData("partyB", "email", e.target.value)}
                        />
                      </FieldGroup>

                      {formData.partyB.type === "company" && (
                        <>
                          <FieldGroup label="Numéro RCCM *" error={validationErrors["partyB.rccm"]}>
                            <Input
                              placeholder="RB/COT/23 B 12345"
                              className="bg-background"
                              value={formData.partyB.rccm || ""}
                              onChange={(e) => updateFormData("partyB", "rccm", e.target.value)}
                            />
                          </FieldGroup>
                          <FieldGroup label="Numéro IFU">
                            <Input
                              placeholder="3202312345678"
                              className="bg-background"
                              value={formData.partyB.ifu || ""}
                              onChange={(e) => updateFormData("partyB", "ifu", e.target.value)}
                            />
                          </FieldGroup>
                          <FieldGroup label="Représentant légal (nom) *" error={validationErrors["partyB.legalRepName"]}>
                            <Input
                              placeholder="Sophie Martin"
                              className="bg-background"
                              value={formData.partyB.legalRepName || ""}
                              onChange={(e) => updateFormData("partyB", "legalRepName", e.target.value)}
                            />
                            <p className="text-[11px] text-muted-foreground mt-1">Personne physique habilitée à engager la société.</p>
                          </FieldGroup>
                          <FieldGroup label="Qualité du représentant">
                            <Input
                              placeholder="Gérante, Directrice Générale..."
                              className="bg-background"
                              value={formData.partyB.legalRepTitle || ""}
                              onChange={(e) => updateFormData("partyB", "legalRepTitle", e.target.value)}
                            />
                          </FieldGroup>
                        </>
                      )}
                    </div>
                  </div>
                </Card>

                {selectedTemplate !== "pdf_upload" && (
                  <>
                    {/* Détails */}
                    <Card className="p-6 bg-muted/30 border-0 shadow-none mb-6">
                  <div className="space-y-6">
                    <h3 className="font-bold text-lg flex items-center gap-3">
                      <FileText className="w-6 h-6 text-[#9C27B0]" />
                      Détails du contrat
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <FieldGroup label="Description / Objet *" error={validationErrors["details.description"]} className="md:col-span-2">
                        <Textarea 
                          placeholder="Ex: Prestation de développement Fullstack pour une durée de 3 mois, incluant la création d'une API et d'un panel admin."
                          className="bg-background min-h-[100px] resize-y"
                          value={formData.details.description}
                          onChange={(e) => updateFormData("details", "description", e.target.value)}
                        />
                      </FieldGroup>

                      <FieldGroup label="Durée">
                        <Input placeholder="Ex: 12 mois, Indéterminée..." className="bg-background"
                          value={formData.details.duration}
                          onChange={(e) => updateFormData("details", "duration", e.target.value)} />
                      </FieldGroup>
                      
                      <FieldGroup label="Montant total ou Rémunération">
                        <Input placeholder="Ex: 500 000 FCFA / mois" className="bg-background"
                          value={formData.details.amount}
                          onChange={(e) => updateFormData("details", "amount", e.target.value)} />
                      </FieldGroup>
                      
                      <FieldGroup label="Date de début">
                        <Input type="date" className="bg-background"
                          value={formData.details.startDate}
                          onChange={(e) => updateFormData("details", "startDate", e.target.value)} />
                      </FieldGroup>
                      
                      <FieldGroup label="Pays d'exécution">
                        <Select value={formData.details.country} onValueChange={(val) => updateFormData("details", "country", val)}>
                          <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Bénin">Bénin</SelectItem>
                            <SelectItem value="Togo">Togo</SelectItem>
                            <SelectItem value="Côte d'Ivoire">Côte d'Ivoire</SelectItem>
                            <SelectItem value="Sénégal">Sénégal</SelectItem>
                            <SelectItem value="Autre">Autre (Préciser en description)</SelectItem>
                          </SelectContent>
                        </Select>
                      </FieldGroup>
                      
                      <FieldGroup label="Ville de signature / exécution *" error={validationErrors["details.city"]}>
                        <Input className="bg-background" placeholder="Ex: Cotonou"
                          value={formData.details.city}
                          onChange={(e) => updateFormData("details", "city", e.target.value)} />
                      </FieldGroup>
                    </div>
                  </div>
                </Card>

                {/* Escrow (dépôt sous séquestre on-chain) */}
                <Card className="p-6 bg-muted/30 border-0 shadow-none mb-6">
                  <div className="space-y-4">
                    <h3 className="font-bold text-lg flex items-center gap-3">
                      <Shield className="w-6 h-6 text-[#FFC107]" />
                      Dépôt sous séquestre (escrow) — optionnel
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Ce montant sera verrouillé en POL (jeton natif Polygon) au moment du déploiement sur la blockchain — il est indépendant du montant contractuel écrit ci-dessus, qui peut être dans une autre devise (ex. FCFA). Aucune conversion automatique n'est effectuée : indiquez directement le montant en POL à verrouiller. Vous pourrez le reconfirmer ou l'ajuster juste avant le déploiement.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      <FieldGroup label="Montant à verrouiller (POL)">
                        <Input type="number" min="0" step="0.0001" placeholder="0.00" className="bg-background"
                          value={formData.details.escrowAmount}
                          onChange={(e) => updateFormData("details", "escrowAmount", e.target.value)} />
                      </FieldGroup>
                      <FieldGroup label="Date limite (deadline)">
                        <Input type="date" className="bg-background"
                          value={formData.details.escrowDeadline}
                          onChange={(e) => updateFormData("details", "escrowDeadline", e.target.value)} />
                      </FieldGroup>
                      <FieldGroup label="Pénalité de retard (%)">
                        <Input type="number" min="0" max="100" placeholder="0" className="bg-background"
                          value={formData.details.penaltyPercent}
                          onChange={(e) => updateFormData("details", "penaltyPercent", e.target.value)} />
                      </FieldGroup>
                    </div>
                  </div>
                </Card>

                {/* Options */}
                <Card className="p-6 bg-muted/30 border-0 shadow-none">
                  <div className="space-y-6">
                    <h3 className="font-bold text-lg">Options additionnelles</h3>
                    <p className="text-xs text-muted-foreground -mt-4">Options pertinentes pour un contrat de type {activeTemplate?.name || selectedTemplate}.</p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {(activeTemplate?.clauseOptions || []).filter((key) => key !== "allowTermination" && key !== "allowDispute").map((key) => {
                        const clause = CLAUSE_LIBRARY[key];
                        return (
                          <div key={key}
                            className="flex items-center gap-3 p-4 border rounded-xl bg-background cursor-pointer hover:border-[#9C27B0]/50 transition-colors"
                            onClick={() => updateFormData("options", key, !(formData.options as any)[key])}>
                            <Checkbox id={key} checked={(formData.options as any)[key]}
                              onCheckedChange={(val) => updateFormData("options", key, val)} />
                            <Label htmlFor={key} className="cursor-pointer text-sm font-medium">{clause.label}</Label>
                          </div>
                        );
                      })}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                      {activeTemplate?.clauseOptions.includes("allowTermination") && (
                        <div className="flex items-start gap-3 p-4 border rounded-xl bg-background cursor-pointer hover:border-[#9C27B0]/50 transition-colors"
                          onClick={() => updateFormData("options", "allowTermination", !formData.options.allowTermination)}>
                          <Checkbox id="termination" checked={formData.options.allowTermination} className="mt-1"
                            onCheckedChange={(val) => updateFormData("options", "allowTermination", val)} />
                          <div>
                            <Label htmlFor="termination" className="cursor-pointer text-sm font-bold block mb-1">{CLAUSE_LIBRARY.allowTermination.label}</Label>
                            <p className="text-xs text-muted-foreground leading-relaxed">{CLAUSE_LIBRARY.allowTermination.helpText}</p>
                          </div>
                        </div>
                      )}

                      {activeTemplate?.clauseOptions.includes("allowDispute") && (
                        <div className="flex items-start gap-3 p-4 border rounded-xl bg-background cursor-pointer hover:border-[#9C27B0]/50 transition-colors"
                          onClick={() => updateFormData("options", "allowDispute", !formData.options.allowDispute)}>
                          <Checkbox id="dispute" checked={formData.options.allowDispute} className="mt-1"
                            onCheckedChange={(val) => updateFormData("options", "allowDispute", val)} />
                          <div>
                            <Label htmlFor="dispute" className="cursor-pointer text-sm font-bold block mb-1">{CLAUSE_LIBRARY.allowDispute.label}</Label>
                            <p className="text-xs text-muted-foreground leading-relaxed">{CLAUSE_LIBRARY.allowDispute.helpText}</p>
                          </div>
                        </div>
                      )}
                    </div>
                    </div>
                  </Card>
                  </>
                )}
              </div>

              <div className="flex justify-between mt-10">
                <Button variant="outline" onClick={() => setCurrentStep(1)} className="px-8">
                  <ChevronLeft className="w-5 h-5 mr-2" />
                  Retour
                </Button>
                <Button className="bg-[#9C27B0] text-white hover:bg-[#7B1FA2] px-8 font-bold" onClick={handleGenerateWithAI}>
                  {selectedTemplate === "pdf_upload" ? (
                    <>Suivant <ChevronRight className="w-5 h-5 ml-2" /></>
                  ) : (
                    <><Brain className="w-5 h-5 mr-2" /> Générer le contrat</>
                  )}
                </Button>
              </div>
              
            </Card>
          )}

          {/* ── STEP 3: Preview & Edit ── */}
          {currentStep === 3 && (
            <div className="min-h-[400px]">
              {isGenerating ? (
                <Card className="p-16 text-center">
                  <div className="relative w-24 h-24 mx-auto mb-8">
                    <Brain className="w-24 h-24 text-[#9C27B0] animate-pulse" />
                    <div className="absolute inset-0 bg-[#9C27B0]/20 rounded-full animate-ping" />
                  </div>
                  <h2 className="mb-4 font-bold text-2xl text-[#9C27B0]">Génération du contrat...</h2>
                  <p className="text-muted-foreground mb-8 text-lg">Remplissage du modèle avec vos informations.</p>
                  <div className="max-w-md mx-auto">
                    <div className="h-3 bg-muted rounded-full overflow-hidden border">
                      <div className="h-full bg-gradient-to-r from-[#9C27B0] to-[#E91E63] animate-[loading_2s_infinite]" />
                    </div>
                  </div>
                </Card>
              ) : generationFailed && !contractText ? (
                <Card className="p-16 text-center border-destructive/30 bg-destructive/5">
                  <AlertCircle className="w-10 h-10 text-destructive mx-auto mb-4" />
                  <h2 className="mb-2 font-bold text-xl">La génération du contrat a échoué</h2>
                  <p className="text-muted-foreground mb-6">Vous pouvez réessayer immédiatement, sans revenir à l'étape précédente.</p>
                  <Button className="bg-[#9C27B0] text-white hover:bg-[#7B1FA2]" onClick={handleGenerateWithAI}>
                    <Brain className="w-4 h-4 mr-2" /> Réessayer la génération
                  </Button>
                </Card>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Preview */}
                  <Card className="lg:col-span-2 p-8 shadow-xl">
                    <div className="mb-6 flex items-center justify-between">
                      <h3 className="font-bold text-xl">Aperçu du document</h3>
                      <div className="flex items-center gap-2">
                        <AiBadge />
                        <span className="text-xs text-muted-foreground">Version 1.0</span>
                      </div>
                    </div>

                    <div className="bg-white text-gray-800 p-10 rounded-lg min-h-[600px] shadow-inner border font-serif text-sm leading-relaxed overflow-y-auto max-h-[700px]">
                      <Textarea
                        value={contractText}
                        onChange={(e) => { setContractText(e.target.value); setHasValidated(false); }}
                        className="w-full h-full min-h-[600px] border-none focus-visible:ring-0 p-0 resize-none font-serif text-base"
                      />
                    </div>

                    {/* SHA-256 fingerprint display */}
                    <div className="mt-4 p-3 bg-muted rounded-lg flex items-center gap-2">
                      <Shield className="w-4 h-4 text-muted-foreground shrink-0" />
                      <p className="text-[10px] text-muted-foreground font-mono break-all">
                        Empreinte document calculée à la signature. Toute modification ultérieure sera détectable.
                      </p>
                    </div>

                    <div className="flex justify-between mt-8">
                      <Button variant="outline" onClick={() => setCurrentStep(2)} className="px-8">
                        <ChevronLeft className="w-5 h-5 mr-2" />
                        Précédent
                      </Button>
                      <Button className="bg-[#FFC107] text-[#212121] hover:bg-[#FFB300] px-8 font-bold" onClick={() => { setError(null); if (validateStep3()) setCurrentStep(4); }}>
                        Suivant
                        <ChevronRight className="w-5 h-5 ml-2" />
                      </Button>
                    </div>
                  </Card>

                  {/* Edit Panel */}
                  <div className="space-y-6">
                    <Card className="p-6">
                      <h3 className="mb-4 font-bold flex items-center gap-2">
                        <Brain className="w-5 h-5 text-[#9C27B0]" />
                        Actions IA
                      </h3>
                      <div className="space-y-3">
                        <Button variant="outline" className="w-full justify-start text-sm hover:bg-[#9C27B0]/5 border-[#9C27B0]/30"
                          onClick={handleSimplify} disabled={isSimplifying}>
                          {isSimplifying
                            ? <Loader2 className="w-4 h-4 mr-3 animate-spin" />
                            : <Brain className="w-4 h-4 mr-3 text-[#9C27B0]" />}
                          {isSimplifying ? "Simplification..." : "Simplifier le langage"}
                        </Button>
                        <Button variant="outline" className="w-full justify-start text-sm hover:bg-[#2196F3]/5 border-[#2196F3]/30"
                          onClick={handleValidateCompliance} disabled={isValidating}>
                          {isValidating
                            ? <Loader2 className="w-4 h-4 mr-3 animate-spin" />
                            : <Eye className="w-4 h-4 mr-3 text-[#2196F3]" />}
                          {isValidating ? "Vérification..." : "Vérifier la conformité"}
                        </Button>
                      </div>
                    </Card>

                    {/* Résultat de la validation IA */}
                    {aiValidationResult && (
                      <Card className="p-5 border border-[#2196F3]/30 bg-[#2196F3]/5">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-[#2196F3] mb-3 flex items-center gap-2">
                          <Eye className="w-4 h-4" /> Rapport de conformité
                        </h4>
                        {aiValidationResult.issues.length > 0 && (
                          <div className="mb-3">
                            <p className="text-[10px] font-bold text-destructive mb-1">⚠ Points à corriger :</p>
                            <ul className="space-y-1">
                              {aiValidationResult.issues.map((issue, i) => (
                                <li key={i} className="text-[10px] text-muted-foreground flex gap-1">
                                  <span className="shrink-0">•</span>{issue}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {aiValidationResult.suggestions.length > 0 && (
                          <div>
                            <p className="text-[10px] font-bold text-[#4CAF50] mb-1">✓ Suggestions :</p>
                            <ul className="space-y-1">
                              {aiValidationResult.suggestions.map((s, i) => (
                                <li key={i} className="text-[10px] text-muted-foreground flex gap-1">
                                  <span className="shrink-0">•</span>{s}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {aiValidationResult.issues.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-[#2196F3]/20 flex items-start gap-2 cursor-pointer" onClick={() => setAcknowledgeIssues(!acknowledgeIssues)}>
                            <Checkbox checked={acknowledgeIssues} onCheckedChange={(v) => setAcknowledgeIssues(!!v)} className="mt-0.5" />
                            <p className="text-[10px] text-muted-foreground leading-relaxed">
                              Je reconnais les points de conformité relevés ci-dessus et je souhaite tout de même continuer.
                            </p>
                          </div>
                        )}
                        {aiValidationResult.issues.length === 0 && (
                          <p className="text-[10px] text-[#4CAF50] font-medium flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Aucun point bloquant relevé.</p>
                        )}
                      </Card>
                    )}

                    {!hasValidated && !isValidating && (
                      <Card className="p-4 border border-[#FFC107]/30 bg-[#FFC107]/5">
                        <p className="text-[11px] text-muted-foreground leading-relaxed flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-[#FFC107] shrink-0 mt-0.5" />
                          Une vérification de conformité est requise avant de passer à l'étape des signataires.
                        </p>
                      </Card>
                    )}

                    <Card className="p-6 bg-muted/40 border-dashed border-2">
                      <div className="flex items-start gap-2">
                        <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                        <p className="text-xs leading-relaxed italic text-muted-foreground">
                          Le contrat a été généré sur la base du modèle sélectionné. Vous pouvez le modifier manuellement avant de finaliser.
                        </p>
                      </div>
                    </Card>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 4: Signatories ── */}
          {currentStep === 4 && (
            <Card className="p-8">
              <div className="text-center mb-8">
                <h2 className="mb-2 font-bold">Ajouter les signataires</h2>
                <p className="text-muted-foreground">
                  Entrez les emails des parties prenantes. S'ils n'ont pas de compte, ils recevront une invitation pour créer leur portefeuille sécurisé.
                </p>
              </div>

              {/* Signatories list */}
              <div className="space-y-3 mb-6">
                {signatories.map((s, idx) => (
                  <Card key={idx} className="p-4 border-l-4 border-l-[#4CAF50] bg-[#4CAF50]/5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#4CAF50]/10 flex items-center justify-center">
                          <Users className="w-5 h-5 text-[#4CAF50]" />
                        </div>
                        <div>
                          <p className="font-bold text-sm">{s.name || s.email}</p>
                          <p className="text-[10px] text-muted-foreground uppercase">{ROLE_LABELS[s.role]}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => removeSignatory(s.email)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Add signatory form */}
              <Card className="p-5 bg-muted/30 border-dashed mb-6">
                <h4 className="text-sm font-bold mb-4">Ajouter un signataire</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                  <FieldGroup label="Nom (optionnel)">
                    <Input placeholder="Sophie Martin" value={newSignatory.name}
                      onChange={(e) => setNewSignatory((p) => ({ ...p, name: e.target.value }))} />
                  </FieldGroup>
                  <FieldGroup label="Email *">
                    <Input type="email" placeholder="sophie@exemple.com" value={newSignatory.email}
                      onChange={(e) => setNewSignatory((p) => ({ ...p, email: e.target.value }))} />
                  </FieldGroup>
                  <FieldGroup label="Rôle" className="md:col-span-2">
                    <Select value={String(newSignatory.role)} onValueChange={(v) => setNewSignatory((p) => ({ ...p, role: Number(v) }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">{ROLE_LABELS[1]}</SelectItem>
                        <SelectItem value="2">{ROLE_LABELS[2]}</SelectItem>
                        <SelectItem value="3">{ROLE_LABELS[3]}</SelectItem>
                      </SelectContent>
                    </Select>
                  </FieldGroup>
                </div>
                <Button variant="outline" onClick={handleAddSignatory} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Ajouter ce signataire
                </Button>
              </Card>

              {validationErrors["signatories"] && (
                <p className="text-sm text-destructive mb-4 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />{validationErrors["signatories"]}
                </p>
              )}

              {/* Security Summary */}
              <div className="space-y-4 mb-8">
                <h3 className="font-bold flex items-center gap-2">
                  <Shield className="w-5 h-5 text-[#FFC107]" />
                  Sécurité et Blockchain
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3 p-4 border rounded-lg bg-input-background">
                    <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                    <div>
                      <p className="font-bold text-sm block mb-1">Intégrité SHA-256</p>
                      <p className="text-xs text-muted-foreground">L'empreinte du document sera calculée et ancrée on-chain au moment de la signature.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 border rounded-lg bg-[#FFC107]/5 border-[#FFC107]/30">
                    <Shield className="w-5 h-5 text-[#FFC107] shrink-0" />
                    <div>
                      <p className="font-bold text-sm block mb-1">Enregistrement Blockchain</p>
                      <p className="text-xs text-muted-foreground">Le contrat sera ancré de manière immuable sur Polygon Amoy.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Consent Checkbox */}
              <div className={`p-4 border rounded-lg mb-8 ${validationErrors["consent"] ? "border-destructive bg-destructive/5" : "border-primary/20 bg-primary/5"}`}>
                <div className="flex items-start gap-3 cursor-pointer" onClick={() => { setConsentChecked(!consentChecked); if (validationErrors["consent"]) setValidationErrors((e) => { const { consent: _, ...r } = e; return r; }); }}>
                  <Checkbox id="consent" checked={consentChecked} onCheckedChange={(v) => { setConsentChecked(!!v); }} />
                  <Label htmlFor="consent" className="cursor-pointer text-sm leading-relaxed">
                    Je certifie avoir <strong>lu et approuvé</strong> le contrat dans son intégralité. Je confirme que les informations saisies sont exactes et je consens à la signature électronique sur blockchain. Ce consentement constitue une preuve légale au sens de {E_SIGNATURE_LEGAL_BASIS[formData.details.country] || DEFAULT_E_SIGNATURE_LEGAL_BASIS}.
                  </Label>
                </div>
                {validationErrors["consent"] && (
                  <p className="text-xs text-destructive mt-2 ml-7">{validationErrors["consent"]}</p>
                )}
              </div>

              <div className="flex justify-between items-center">
                <Button variant="outline" onClick={() => setCurrentStep(selectedTemplate === "pdf_upload" ? 2 : 3)} className="px-8">
                  <ChevronLeft className="w-5 h-5 mr-2" />
                  Retour
                </Button>

                <Button
                  className="bg-[#FFC107] text-[#212121] hover:bg-[#FFB300] px-10 py-6 text-lg font-bold"
                  onClick={handleFinalSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-6 h-6 mr-3 animate-spin" />
                      Finalisation...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5 mr-3" />
                      Enregistrer le Brouillon
                    </>
                  )}
                </Button>
              </div>

              {/* Supprimé: check isConnected */}
            </Card>
          )}
        </div>
      </main>

      <style jsx global>{`
        @keyframes loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  );
}

// ─── Helper Component ────────────────────────────────────────────────────────

function FieldGroup({
  label,
  error,
  children,
  className = "",
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      <Label className={error ? "text-destructive" : ""}>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="w-3 h-3" />{error}</p>}
    </div>
  );
}
