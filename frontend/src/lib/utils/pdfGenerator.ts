import QRCode from "qrcode";

interface PDFData {
    title: string;
    content: string;
    sha256Hash: string;
    contractId?: number;
    draftId?: string;
    parties: {
        partyA: { name: string; email: string };
        partyB: { name: string; email: string };
    };
    signatories: any[];
    status: string;
    createdAt: string;
}

export async function generateCertifiedPDF(data: PDFData) {
    // Dynamically import jsPDF to avoid Next.js server-side 'core-js' / 'canvg' errors
    const { jsPDF } = await import("jspdf");
    
    const doc = new jsPDF();
    const margin = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = margin;

    // Helper to add a new page when needed
    const checkPageBreak = (neededHeight = 10) => {
        if (yPos + neededHeight > doc.internal.pageSize.getHeight() - margin) {
            doc.addPage();
            yPos = margin;
        }
    };

    // jsPDF's splitTextToSize only breaks on whitespace — a single unbroken token longer
    // than the printable width (a SHA-256 hash, an IPFS CID, a long URL) sails straight
    // past the right margin instead of wrapping, which is exactly what caused visible
    // overflow in the generated PDF. Force a breakable point into any such token before
    // handing the text to splitTextToSize.
    const breakLongTokens = (text: string, maxCharsPerChunk = 45) => {
        return text
            .split(" ")
            .map((word) => {
                if (word.length <= maxCharsPerChunk) return word;
                const chunks = [];
                for (let i = 0; i < word.length; i += maxCharsPerChunk) {
                    chunks.push(word.slice(i, i + maxCharsPerChunk));
                }
                return chunks.join(" ");
            })
            .join(" ");
    };

    // Helper for multi-line text
    const addText = (text: string, fontSize = 12, isBold = false, color = [0, 0, 0]) => {
        doc.setFontSize(fontSize);
        doc.setFont("helvetica", isBold ? "bold" : "normal");
        doc.setTextColor(color[0], color[1], color[2]);
        const lines = doc.splitTextToSize(breakLongTokens(text), pageWidth - margin * 2);
        for (const line of lines) {
            checkPageBreak(fontSize * 0.5);
            doc.text(line, margin, yPos);
            yPos += fontSize * 0.45;
        }
    };

    // 1. Header — was RGB(156,39,176) = #9C27B0, the app's secondary AI-accent purple, used
    // here by mistake for the primary wordmark (that color means "AI" everywhere else in the
    // app — the sparkle/AiBadge, the "Préférences IA" section — not the brand itself). The
    // brand's actual accent is #FFC107 gold, but gold text directly on this white page would
    // repeat the same near-illegible contrast problem already found and fixed in the email
    // header (~1.6:1) — worse here on a document meant to be printed/read in grayscale. Ink
    // (#212121, the app's own dark-text token) is what a certified document's letterhead
    // should look like anyway: legible, printer-safe, and it's already the exact color used
    // for the destination heading of the "Bientôt disponible"-free parts of ContracTify's own UI.
    doc.setTextColor(33, 33, 33);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("ContracTify", margin, yPos);
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("Document certifié par technologie Blockchain", pageWidth - margin - 75, yPos);
    yPos += 12;
    doc.setDrawColor(230, 230, 230);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 12;

    // 2. Title
    addText(data.title.toUpperCase(), 16, true, [30, 30, 30]);
    yPos += 6;

    // 3. Render contract content — the AI now writes plain text (see backend/services/ai.js):
    // first non-empty line = document title, "Article N / Chapitre / Préambule / Annexe"
    // lines = section headers. Legacy #/##/### Markdown is still recognized for contracts
    // generated before this change.
    if (data.content) {
        const lines = data.content.split('\n');
        const sectionHeaderRe = /^(article\s+\d+|chapitre\b|titre\s+[ivx\d]|préambule\b|annexe\s*\d*)/i;
        let titleConsumed = false;
        for (const line of lines) {
            const trimmed = line.trim();

            if (!titleConsumed && trimmed !== '' && !line.startsWith('#') && !sectionHeaderRe.test(trimmed)) {
                titleConsumed = true;
                yPos += 4;
                checkPageBreak(10);
                addText(trimmed.toUpperCase(), 13, true, [30, 30, 30]);
                yPos += 2;
                continue;
            }
            if (trimmed !== '') titleConsumed = true;

            if (sectionHeaderRe.test(trimmed) && trimmed.length < 140) {
                yPos += 3;
                checkPageBreak(9);
                addText(trimmed, 11, true, [50, 50, 50]);
                yPos += 1;
            } else if (line.startsWith('# ')) {
                yPos += 4;
                checkPageBreak(10);
                addText(line.slice(2).trim().toUpperCase(), 13, true, [30, 30, 30]);
                yPos += 2;
            } else if (line.startsWith('## ')) {
                yPos += 3;
                checkPageBreak(9);
                addText(line.slice(3).trim(), 11, true, [50, 50, 50]);
                yPos += 1;
            } else if (line.startsWith('### ')) {
                yPos += 2;
                addText(line.slice(4).trim(), 10, true, [70, 70, 70]);
            } else if (/^[-*•]\s/.test(line)) {
                const text = '• ' + line.replace(/^[-*•]\s/, '').replace(/\*\*([^*]+)\*\*/g, '$1').trim();
                addText(text, 10, false, [60, 60, 60]);
            } else if (/^(-{3,}|\*{3,})$/.test(line.trim())) {
                yPos += 2;
                doc.setDrawColor(200, 200, 200);
                doc.line(margin, yPos, pageWidth - margin, yPos);
                yPos += 4;
            } else if (/^\s*\|.*\|\s*$/.test(line)) {
                // Leftover Markdown table row (legacy content only) — render as plain text
                // instead of literal pipes; the AI no longer draws signature tables.
                const cells = line.split('|').map((c) => c.trim()).filter(Boolean);
                const isSeparatorRow = cells.every((c) => /^:?-+:?$/.test(c));
                if (!isSeparatorRow && cells.length > 0) {
                    addText(cells.join('   —   '), 10, false, [60, 60, 60]);
                }
            } else if (line.trim() === '') {
                yPos += 3;
            } else {
                // Strip any leftover inline markdown (**bold**, *italic*)
                const clean = line
                    .replace(/\*\*([^*]+)\*\*/g, '$1')
                    .replace(/\*([^*]+)\*/g, '$1')
                    .replace(/__([^_]+)__/g, '$1')
                    .replace(/`([^`]+)`/g, '$1');
                addText(clean, 10, false, [60, 60, 60]);
            }
        }
    }

    yPos += 10;

    // 4. Signatories
    checkPageBreak(30);
    addText("ÉTAT DES SIGNATURES :", 11, true, [30, 30, 30]);
    yPos += 3;
    addText(`Statut : ${data.status}`, 9, false, [80, 80, 80]);
    data.signatories.forEach((s) => {
        let sigStatus = "Non signé";
        if (s.hasSigned) sigStatus = "Signé on-chain";
        if (s.isRegistered) sigStatus = "Inscrit";
        addText(`• ${s.name || s.email} : ${sigStatus}`, 9, false, [80, 80, 80]);
    });

    yPos += 10;

    // 5. Security Footer
    checkPageBreak(60);
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 8;

    addText("CERTIFICAT D'INTÉGRITÉ NUMÉRIQUE", 8, true, [130, 130, 130]);
    yPos += 1;
    // The SHA-256 hash is a single 64-char unbroken token — exactly the case addText's
    // breakLongTokens() exists for; a raw doc.text() call here (the previous code) had no
    // width constraint at all and ran straight off the page edge.
    addText(`Empreinte SHA-256 : ${data.sha256Hash}`, 8, false, [130, 130, 130]);
    if (data.contractId) {
        addText(`Ancrage Blockchain : Polygon Amoy (ID: ${data.contractId})`, 8, false, [130, 130, 130]);
    } else {
        addText(`Ancrage Blockchain : En attente de déploiement`, 8, false, [130, 130, 130]);
    }
    addText(`Horodatage : ${new Date(data.createdAt).toLocaleString('fr-FR')}`, 8, false, [130, 130, 130]);
    yPos += 4;
    addText("Ce contrat a été rédigé avec l'assistance d'une intelligence artificielle. Il ne constitue pas un avis juridique.", 7, false, [150, 150, 150]);

    // QR Code
    try {
        const verifyUrl = `${window.location.origin}/contract-details/${data.contractId || data.draftId}`;
        const qrDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 80 });
        doc.addImage(qrDataUrl, "PNG", pageWidth - margin - 28, yPos - 16, 28, 28);
    } catch (e) {
        console.error("Failed to generate QR code", e);
    }

    doc.save(`Contrat_${data.contractId || 'Brouillon'}.pdf`);
}
