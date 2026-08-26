const aiService = require('../services/ai');
const logger = require('../utils/logger');

/**
 * Generate contract
 */
exports.generateContract = async (req, res, next) => {
    try {
        const { templateType, partyAData, partyBData, additionalClauses, context } = req.body;

        if (!templateType || !partyAData || !partyBData) {
            return res.status(400).json({
                error: 'Template type, party A data, and party B data are required',
            });
        }

        const result = await aiService.generateContract(
            templateType,
            partyAData,
            partyBData,
            additionalClauses,
            context
        );

        res.json({
            message: 'Contract generated successfully',
            contract: result.content,
            suggestions: result.suggestions,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Correct input
 */
exports.correctInput = async (req, res, next) => {
    try {
        const { text, context } = req.body;

        if (!text) {
            return res.status(400).json({ error: 'Text is required' });
        }

        const corrected = await aiService.correctInput(text, context);

        res.json({
            message: 'Input corrected successfully',
            corrected,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Improve clause
 */
exports.improveClause = async (req, res, next) => {
    try {
        const { clause, context } = req.body;

        if (!clause) {
            return res.status(400).json({ error: 'Clause is required' });
        }

        const result = await aiService.improveClause(clause, context);

        res.json({
            message: 'Clause improved successfully',
            improved: result.improved,
            explanation: result.explanation,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Suggest clauses
 */
exports.suggestClauses = async (req, res, next) => {
    try {
        const { contractType, specificNeeds } = req.body;

        if (!contractType) {
            return res.status(400).json({ error: 'Contract type is required' });
        }

        const clauses = await aiService.suggestClauses(contractType, specificNeeds);

        res.json({
            message: 'Clauses suggested successfully',
            clauses,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Validate contract
 */
exports.validateContract = async (req, res, next) => {
    try {
        const { contractText } = req.body;

        if (!contractText) {
            return res.status(400).json({ error: 'Contract text is required' });
        }

        const result = await aiService.validateContract(contractText);

        res.json({
            message: 'Contract validated successfully',
            isValid: result.isValid,
            issues: result.issues,
            suggestions: result.suggestions,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Resolve which known jurisdiction seat city covers a free-text city
 */
exports.resolveJurisdictionCity = async (req, res, next) => {
    try {
        const { city, country, knownCities } = req.body;

        if (!city || !country || !Array.isArray(knownCities) || knownCities.length === 0) {
            return res.status(400).json({ error: 'city, country and a non-empty knownCities array are required' });
        }

        const result = await aiService.resolveJurisdictionCity(city, country, knownCities);

        res.json(result);
    } catch (error) {
        next(error);
    }
};
