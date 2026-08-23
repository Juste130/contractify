const prisma = require('../models/prisma');
const escrowService = require('../services/escrow');
const { PaymentsUnavailableError } = require('../services/payments/provider');
const { hasContractAccess } = require('./contract');

/**
 * The route param can be either a draft's UUID or a deployed contract's numeric on-chain
 * id (same dual lookup as resendSignatureRequest/getDraftDetails vs getContractDetails)
 * — the frontend passes through whichever id the details page currently has.
 */
async function findContractByRouteParam(id) {
    return isNaN(Number(id))
        ? prisma.contractCache.findUnique({ where: { id }, include: { signatories: true } })
        : prisma.contractCache.findUnique({ where: { contractId: parseInt(id, 10) }, include: { signatories: true } });
}

async function findOwnedContract(id, userId) {
    const contract = await findContractByRouteParam(id);
    if (!contract) return { error: [404, 'Contrat introuvable'] };
    if (contract.userId !== userId) return { error: [403, 'Seul le créateur du contrat peut gérer son séquestre'] };
    return { contract };
}

/**
 * Get escrow status for a contract. Anyone with access to the contract (creator, a
 * signatory, or an admin) can view it.
 */
exports.getEscrow = async (req, res, next) => {
    try {
        const { id } = req.params;
        const contract = await findContractByRouteParam(id);
        if (!contract) return res.status(404).json({ error: 'Contrat introuvable' });
        if (!(await hasContractAccess(contract, req.user))) {
            return res.status(403).json({ error: 'Non autorisé' });
        }

        const escrow = await prisma.contractEscrow.findUnique({ where: { contractCacheId: contract.id } });
        res.json({ escrow });
    } catch (error) {
        next(error);
    }
};

/**
 * Creator starts a deposit. Returns 503 with a clear, user-facing message while no
 * payment provider is wired (PAYMENTS_ENABLED=false) — this is the expected response
 * today, not an error condition.
 */
exports.requestDeposit = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { error, contract } = await findOwnedContract(id, req.user.userId);
        if (error) return res.status(error[0]).json({ error: error[1] });

        const checkout = await escrowService.requestDeposit(contract.id, req.user.userId);
        res.json({ message: 'Dépôt initié', ...checkout });
    } catch (err) {
        if (err instanceof PaymentsUnavailableError) {
            return res.status(503).json({ error: err.message, available: false });
        }
        next(err);
    }
};

/**
 * Creator explicitly releases the escrow — either early (before the deadline) or during
 * the post-deadline validation window instead of waiting for the automatic release.
 */
exports.releaseNow = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { error, contract } = await findOwnedContract(id, req.user.userId);
        if (error) return res.status(error[0]).json({ error: error[1] });

        const escrow = await escrowService.releaseNow(contract.id, req.user.userId);
        res.json({ message: 'Séquestre libéré', escrow });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

/**
 * Creator blocks the automatic release during the validation window, flagging a problem
 * with contract performance. Holds the escrow in DISPUTED pending manual resolution.
 */
exports.blockRelease = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const { error, contract } = await findOwnedContract(id, req.user.userId);
        if (error) return res.status(error[0]).json({ error: error[1] });

        const escrow = await escrowService.blockRelease(contract.id, req.user.userId, reason);
        res.json({ message: 'Libération bloquée', escrow });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};
