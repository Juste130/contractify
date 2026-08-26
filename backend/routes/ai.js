const express = require('express');
const router = express.Router();
const aiController = require('../controllers/ai');
const { authenticate } = require('../middleware/auth');
const { aiLimiter } = require('../middleware/rate-limit');

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

module.exports = router;
