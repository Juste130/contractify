const express = require('express');
const router = express.Router();
const multer = require('multer');
const ipfsController = require('../controllers/ipfs');
const { authenticate } = require('../middleware/auth');
const { BadRequestError } = require('../utils/errors');

// 'application/pdf' — the "J'ai déjà un contrat (PDF)" import flow.
// 'text/html' — the AI-generated contract, rendered as a self-contained styled document
// (see renderContractToHtml / create-contract-page.tsx) so opening it on IPFS shows an
// actual formatted document instead of a raw JSON blob or an unstyled wall of plain text.
// 'text/plain' kept for compatibility with anything still uploading raw text.
const ALLOWED_MIME_TYPES = ['application/pdf', 'text/html', 'text/plain'];

// Configure multer for file upload
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        // Browsers can send "text/plain;charset=utf-8" — compare on the type only.
        const baseType = file.mimetype.split(';')[0].trim();
        if (!ALLOWED_MIME_TYPES.includes(baseType)) {
            return cb(new BadRequestError('Type de fichier non autorisé. Seuls les PDF et les fichiers texte sont acceptés.'));
        }
        cb(null, true);
    },
});

/**
 * @route   POST /api/ipfs/upload
 * @desc    Upload document to IPFS
 * @access  Private
 */
router.post('/upload', authenticate, upload.single('file'), ipfsController.uploadDocument);

/**
 * @route   POST /api/ipfs/upload-json
 * @desc    Upload JSON to IPFS
 * @access  Private
 */
router.post('/upload-json', authenticate, ipfsController.uploadJSON);

/**
 * @route   GET /api/ipfs/:cid
 * @desc    Get document metadata
 * @access  Private
 */
router.get('/:cid', authenticate, ipfsController.getDocumentMetadata);

/**
 * @route   DELETE /api/ipfs/:cid
 * @desc    Unpin document from IPFS
 * @access  Private
 */
router.delete('/:cid', authenticate, ipfsController.unpinDocument);

module.exports = router;
