const express = require('express');
const router = express.Router();
const incidentController = require('../controllers/incident');
const { authenticate } = require('../middleware/auth');

/**
 * @route   GET /api/contracts/:id/incidents
 * @desc    List disputes/holds raised on a contract
 * @access  Private (any participant)
 */
router.get('/:id/incidents', authenticate, incidentController.listIncidents);

/**
 * @route   POST /api/contracts/:id/incidents/dispute
 * @desc    Raise a dispute — takes effect immediately, blocks escrow release
 * @access  Private (any participant)
 */
router.post('/:id/incidents/dispute', authenticate, incidentController.raiseDispute);

/**
 * @route   POST /api/contracts/:id/incidents/hold
 * @desc    Propose a no-fault mutual pause — takes effect only once accepted
 * @access  Private (any participant)
 */
router.post('/:id/incidents/hold', authenticate, incidentController.proposeHold);

/**
 * @route   POST /api/contracts/:id/incidents/:incidentId/respond
 * @desc    Accept or reject a proposed hold (not the party who proposed it)
 * @access  Private (any participant)
 */
router.post('/:id/incidents/:incidentId/respond', authenticate, incidentController.respondToHold);

/**
 * @route   POST /api/contracts/:id/incidents/:incidentId/withdraw
 * @desc    Withdraw an incident you raised yourself
 * @access  Private (the incident's raiser)
 */
router.post('/:id/incidents/:incidentId/withdraw', authenticate, incidentController.withdrawIncident);

/**
 * @route   POST /api/contracts/:id/incidents/:incidentId/resolve
 * @desc    Resolve a dispute/hold — mediation outcome
 * @access  Private (ADMIN only)
 */
router.post('/:id/incidents/:incidentId/resolve', authenticate, incidentController.resolveIncident);

module.exports = router;
