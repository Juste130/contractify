const crypto = require('crypto');
const ipfsService = require('../services/ipfs');
const logger = require('../utils/logger');
const prisma = require('../models/prisma');
const { isLikelyPdf } = require('../utils/pdf-signature');
const { hasContractAccess } = require('./contract');

/**
 * Upload document to IPFS
 */
exports.uploadDocument = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file provided' });
        }

        const { originalname, mimetype, buffer } = req.file;
        const uploadedBy = req.user.userId;

        // The route's multer fileFilter only checked the client-declared Content-Type
        // (trivially spoofable) — a file claiming to be a PDF gets its actual bytes checked
        // here too, before it's pinned to IPFS and served back through an unsandboxed
        // iframe (contract-details-page.tsx / contract-view-page.tsx).
        const baseType = mimetype.split(';')[0].trim();
        if (baseType === 'application/pdf' && !isLikelyPdf(buffer)) {
            return res.status(400).json({ error: 'Le fichier fourni ne semble pas être un PDF valide.' });
        }

        const result = await ipfsService.uploadDocument(
            buffer,
            originalname,
            mimetype,
            uploadedBy
        );

        res.json({
            message: 'Document uploaded successfully',
            cid: result.cid,
            url: result.url,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Upload JSON to IPFS
 */
exports.uploadJSON = async (req, res, next) => {
    try {
        const { data, name } = req.body;

        if (!data || !name) {
            return res.status(400).json({ error: 'Data and name are required' });
        }

        const uploadedBy = req.user.userId;

        const result = await ipfsService.uploadJSON(data, name, uploadedBy);

        res.json({
            message: 'JSON uploaded successfully',
            cid: result.cid,
            url: result.url,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get document metadata
 */
exports.getDocumentMetadata = async (req, res, next) => {
    try {
        const { cid } = req.params;
        const userId = req.user.userId;
        const userRole = req.user.role;

        const metadata = await ipfsService.getDocumentMetadata(cid);

        // Known limitation: `uploadedBy` on IpfsDocument is nullable (legacy uploads recorded
        // before this field existed). When it's null this comparison denies everyone but an
        // admin — including the document's real owner, who has no other way to prove ownership
        // here. Deliberately left deny-by-default rather than guessing a fallback: there is no
        // reliable alternate source of truth in this codebase to confirm the real owner, and a
        // permissive fallback would open every such document to any authenticated user instead.
        if (metadata.uploadedBy !== userId && userRole !== 'ADMIN') {
            return res.status(403).json({ error: 'Unauthorized to access this document' });
        }

        res.json({
            metadata,
            url: ipfsService.getPublicUrl(cid),
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Serves a pinned document back to the browser from OUR OWN origin — normally straight from
 * this app's own database, never by the browser itself talking to a third-party IPFS
 * gateway. That used to be the design (browser iframe/fetch -> Pinata gateway directly), and
 * it kept failing in practice: gateways are free to send X-Frame-Options/CSP headers refusing
 * to be framed at all (Chrome's own "this content was blocked" page, which no iframe
 * `sandbox` value can override), enforce CORS rules that may or may not permit this app's
 * origin, restrict dedicated-gateway access, or simply have an outage — none of which this
 * app controls or can guarantee. An AI-generated contract never hits any of this because its
 * content already lives in our own database and is rendered straight from there; this
 * endpoint gives an imported PDF the exact same trust model.
 *
 * IPFS + the on-chain sha256Hash remain the ONLY canonical record — IpfsDocument.fileData is
 * purely a verified serving cache, not a second source of truth the rest of the system
 * trusts blindly:
 *   - if a cached copy exists, its SHA-256 is recomputed and compared against the contract's
 *     certified hash (meaningful only for an imported PDF — see the isExternalPdf check
 *     below) before it's ever served; a mismatch is logged loudly and the cache is treated as
 *     unusable rather than served as if it were authoritative.
 *   - whenever the cache is missing or fails that check, this falls back to fetching the real
 *     bytes from IPFS (a server-to-server request — CORS/framing rules are a browser-only
 *     concept and simply don't apply here) and opportunistically re-caches that known-good
 *     copy, so a corrupted row self-heals from the canonical source on the very next view.
 *
 * Gated the same way as viewing the contract itself (creator, signatory, or admin — see
 * hasContractAccess) rather than by IpfsDocument.uploadedBy: a signatory who isn't the
 * uploader still needs to preview the document they're about to sign, which the ownership
 * check on getDocumentMetadata/unpinDocument above would incorrectly deny.
 */
exports.proxyDocument = async (req, res, next) => {
    try {
        const { cid } = req.params;

        const contract = await prisma.contractCache.findFirst({
            where: { ipfsHash: cid },
            include: { signatories: true },
        });
        if (!contract) return res.status(404).json({ error: 'Document not found' });
        if (!(await hasContractAccess(contract, req.user))) {
            return res.status(403).json({ error: 'Unauthorized to access this document' });
        }

        const document = await prisma.ipfsDocument.findUnique({ where: { cid } });
        // sha256Hash only represents the FILE'S OWN bytes for an imported PDF (see
        // computeFileSHA256 in create-contract-page.tsx). For an AI-generated contract it's
        // the hash of the plain-text content, not of the styled HTML actually pinned here —
        // there is nothing meaningful to cross-check the cached bytes against in that case.
        const expectedHash = contract.metadata?.isExternalPdf ? contract.metadata?.sha256Hash : null;

        let buffer = null;
        let mimeType = document?.mimeType || null;

        if (document?.fileData) {
            const actualHash = crypto.createHash('sha256').update(document.fileData).digest('hex');
            if (!expectedHash || actualHash === expectedHash) {
                buffer = document.fileData;
            } else {
                logger.error(`[IPFS proxy] Cached copy for ${cid} does not match its certified hash (expected ${expectedHash}, got ${actualHash}) — falling back to IPFS`);
            }
        }

        if (!buffer) {
            const upstream = await fetch(ipfsService.getPublicUrl(cid));
            if (!upstream.ok) {
                logger.error(`IPFS proxy fetch failed for ${cid}: HTTP ${upstream.status}`);
                return res.status(502).json({ error: 'Failed to fetch document from IPFS' });
            }
            buffer = Buffer.from(await upstream.arrayBuffer());
            mimeType = mimeType || upstream.headers.get('content-type');

            // Opportunistic backfill/self-heal: this document had no verified cache yet, or
            // its cache just failed verification — cache these freshly-fetched, known-good
            // (came straight from IPFS) bytes so the next view doesn't need the gateway at all.
            if (document) {
                prisma.ipfsDocument.update({ where: { cid }, data: { fileData: buffer } })
                    .catch((err) => logger.error(`[IPFS proxy] Failed to cache document ${cid}:`, err));
            }
        }

        res.setHeader('Content-Type', mimeType || 'application/octet-stream');
        // "inline", never "attachment": the point is to display it in the app's own preview,
        // not trigger a download dialog the moment the iframe/fetch touches it.
        res.setHeader('Content-Disposition', 'inline');
        res.send(buffer);
    } catch (error) {
        next(error);
    }
};

/**
 * Unpin document (delete)
 */
exports.unpinDocument = async (req, res, next) => {
    try {
        const { cid } = req.params;
        const userId = req.user.userId;
        const userRole = req.user.role;

        const metadata = await ipfsService.getDocumentMetadata(cid);

        // See the same check in getDocumentMetadata above for why a null uploadedBy denies
        // by default (including to the real owner) rather than guessing a fallback.
        if (metadata.uploadedBy !== userId && userRole !== 'ADMIN') {
            return res.status(403).json({ error: 'Unauthorized to unpin this document' });
        }

        await ipfsService.unpinDocument(cid);

        res.json({
            message: 'Document unpinned successfully',
            cid,
        });
    } catch (error) {
        next(error);
    }
};
