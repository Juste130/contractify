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

    // Helper for multi-line text
    const addText = (text: string, fontSize = 12, isBold = false, color = [0, 0, 0]) => {
        doc.setFontSize(fontSize);
        doc.setFont("helvetica", isBold ? "bold" : "normal");
        doc.setTextColor(color[0], color[1], color[2]);
        const lines = doc.splitTextToSize(text, pageWidth - margin * 2);
        for (const line of lines) {
            checkPageBreak(fontSize * 0.5);
            doc.text(line, margin, yPos);
            yPos += fontSize * 0.45;
        }
    };

    // 1. Header
    doc.setTextColor(156, 39, 176);
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

    doc.setFontSize(8);
    doc.setTextColor(130, 130, 130);
    doc.setFont("helvetica", "bold");
    doc.text("CERTIFICAT D'INTÉGRITÉ NUMÉRIQUE", margin, yPos);
    yPos += 5;
    doc.setFont("helvetica", "normal");
    doc.text(`Empreinte SHA-256 : ${data.sha256Hash}`, margin, yPos);
    yPos += 4;
    if (data.contractId) {
        doc.text(`Ancrage Blockchain : Polygon Amoy (ID: ${data.contractId})`, margin, yPos);
    } else {
        doc.text(`Ancrage Blockchain : En attente de déploiement`, margin, yPos);
    }
    yPos += 4;
    doc.text(`Horodatage : ${new Date(data.createdAt).toLocaleString('fr-FR')}`, margin, yPos);

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
