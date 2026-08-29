const express = require('express');
const router = express.Router();
const multer = require('multer');
const aiController = require('../controllers/ai');
const { authenticate } = require('../middleware/auth');
const { aiLimiter } = require('../middleware/rate-limit');
const { BadRequestError } = require('../utils/errors');

// Same 10MB ceiling and PDF-only restriction as the IPFS upload route — this endpoint
// analyzes a PDF the user is about to import, before it's ever sent to IPFS.
const pdfUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const baseType = file.mimetype.split(';')[0].trim();
        if (baseType !== 'application/pdf') {
            return cb(new BadRequestError('Seuls les fichiers PDF sont acceptés.'));
        }
        cb(null, true);
    },
});

/**
 * @route   POST /api/ai/generate-contract
 * @desc    Generate contract from template
 * @access  Private
 */
router.post('/generate-contract', authenticate, aiLimiter, aiController.generateContract);

/**
 * @route   POST /api/ai/correct-input
 * @desc    Correct input text
 * @access  Private
 */
router.post('/correct-input', authenticate, aiLimiter, aiController.correctInput);

/**
 * @route   POST /api/ai/improve-clause
 * @desc    Improve specific clause
 * @access  Private
 */
router.post('/improve-clause', authenticate, aiLimiter, aiController.improveClause);

/**
 * @route   POST /api/ai/suggest-clauses
 * @desc    Get clause suggestions
 * @access  Private
 */
router.post('/suggest-clauses', authenticate, aiLimiter, aiController.suggestClauses);

/**
 * @route   POST /api/ai/validate
 * @desc    Validate contract compliance
 * @access  Private
 */
router.post('/validate', authenticate, aiLimiter, aiController.validateContract);

/**
 * @route   POST /api/ai/resolve-jurisdiction-city
 * @desc    Suggest which known jurisdiction seat city covers a free-text city
 * @access  Private
 */
router.post('/resolve-jurisdiction-city', authenticate, aiLimiter, aiController.resolveJurisdictionCity);

/**
 * @route   POST /api/ai/analyze-imported-pdf
 * @desc    Extract text from an imported PDF and best-effort detect parties, whether it
 *          looks like a contract, and whether it appears already signed
 * @access  Private
 */
router.post('/analyze-imported-pdf', authenticate, aiLimiter, pdfUpload.single('file'), aiController.analyzeImportedPdf);

module.exports = router;
