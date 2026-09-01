const ipfsService = require('../services/ipfs');
const logger = require('../utils/logger');
const { isLikelyPdf } = require('../utils/pdf-signature');

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
