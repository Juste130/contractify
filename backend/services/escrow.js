const prisma = require('../models/prisma');
const logger = require('../utils/logger');
const { config } = require('../config');
const { paymentProvider } = require('./payments');
const notificationService = require('./notification');
const emailService = require('./email');
const incidentService = require('./incident');

const REMINDER_WINDOWS = [
    { hours: 72, field: 'reminder72SentAt' },
    { hours: 48, field: 'reminder48SentAt' },
    { hours: 24, field: 'reminder24SentAt' },
];

/**
 * Escrow is deliberately off-chain and fiat-only (see prisma/schema.prisma for the "why").
 * Money movement (deposit/payout) waits on a real payment provider — see services/payments —
 * but the reminder + auto-release logic below is real, working logic that runs regardless,
 * so it's ready the moment deposits become real.
 *
 * The declared deadline is honored exactly: both parties are reminded at T-72h, T-48h and
 * T-24h, and — unless the creator has blocked it — the escrow releases automatically right
 * at the deadline. No grace period is tacked on after it.
 */
class EscrowService {
    /**
     * Declares escrow terms at contract-creation time. Does not move any money — just
     * records what the creator intends to deposit later. No-op if no amount was declared.
     */
    async declareTerms(contractCacheId, { amount, currency, penaltyPercent, deadline }) {
        if (!amount || Number(amount) <= 0) return null;
        if (!deadline) {
            throw new Error('Une date limite est requise pour déclarer un séquestre.');
        }

        return prisma.contractEscrow.create({
            data: {
                contractCacheId,
                amount,
                currency: currency || 'XOF',
                penaltyPercent: penaltyPercent || 0,
                deadline: new Date(deadline),
                status: 'PENDING_DEPOSIT',
            },
        });
    }

    /** Creator starts a deposit. Throws PaymentsUnavailableError while no provider is wired. */
    async requestDeposit(contractCacheId, userId) {
        const escrow = await this._getOwnedEscrow(contractCacheId, userId);
        if (escrow.status !== 'PENDING_DEPOSIT') {
            throw new Error(`Ce séquestre n'est plus en attente de dépôt (statut: ${escrow.status}).`);
        }

        const checkout = await paymentProvider.createDepositCheckout({
            amount: Number(escrow.amount),
            currency: escrow.currency,
            reference: escrow.id,
            description: `Séquestre — contrat ${contractCacheId}`,
            returnUrl: `${config.frontendUrl}/contract-details?id=${contractCacheId}`,
        });

        await prisma.contractEscrow.update({
            where: { id: escrow.id },
            data: { payerUserId: userId, providerRef: checkout.providerRef },
        });

        return checkout;
    }

    /** Called once a real payment provider confirms a deposit (webhook, future). */
    async markDeposited(contractCacheId, { provider, providerRef }) {
        const escrow = await this._getEscrow(contractCacheId);
        return prisma.contractEscrow.update({
            where: { id: escrow.id },
            data: { status: 'DEPOSITED', depositedAt: new Date(), provider, providerRef },
        });
    }

    /**
     * Creator explicitly releases early, before the deadline. Blocked while any
     * participant has an open dispute or an accepted hold on the contract — not just the
     * creator's own blockRelease flag — so a beneficiary who raised a dispute can't have
     * the creator quietly release funds out from under them.
     */
    async releaseNow(contractCacheId, userId) {
        const escrow = await this._getOwnedEscrow(contractCacheId, userId);
        if (escrow.status !== 'DEPOSITED') {
            throw new Error(`Impossible de libérer : le séquestre est au statut ${escrow.status}.`);
        }
        if (await incidentService.hasOpenIncident(contractCacheId)) {
            throw new Error('Impossible de libérer : un litige ou une pause est actif sur ce contrat. Résolvez-le d\'abord.');
        }
        return this._release(escrow, 'creator');
    }

    /** Creator blocks the release before the deadline, flagging a problem. */
    async blockRelease(contractCacheId, userId, reason) {
        const escrow = await this._getOwnedEscrow(contractCacheId, userId);
        if (escrow.status !== 'DEPOSITED') {
            throw new Error('Le séquestre ne peut être bloqué que tant que les fonds sont déposés et non encore libérés.');
        }
        if (escrow.deadline <= new Date()) {
            throw new Error("L'échéance est déjà passée — la libération automatique a peut-être déjà eu lieu, réessayez dans un instant.");
        }

        const updated = await prisma.contractEscrow.update({
            where: { id: escrow.id },
            data: { status: 'DISPUTED', disputedAt: new Date(), disputeReason: reason || null },
        });

        await this._notifyParties(updated, {
            type: 'ESCROW_DISPUTED',
            title: 'Séquestre bloqué',
            message: 'Le créateur a signalé un problème avant la date de libération du séquestre. La libération automatique est annulée en attente de résolution.',
        });

        return updated;
    }

    /**
     * Scheduler tick: sends the T-72h / T-48h / T-24h reminders to both parties for every
     * DEPOSITED escrow approaching its deadline. Idempotent — each window's *SentAt field
     * guards against sending the same reminder twice.
     */
    async sendDueReminders() {
        const now = new Date();
        let sent = 0;

        for (const window of REMINDER_WINDOWS) {
            const threshold = new Date(now.getTime() + window.hours * 3600_000);
            const due = await prisma.contractEscrow.findMany({
                where: {
                    status: 'DEPOSITED',
                    deadline: { lte: threshold, gt: now },
                    [window.field]: null,
                },
            });

            for (const escrow of due) {
                const updated = await prisma.contractEscrow.update({
                    where: { id: escrow.id },
                    data: { [window.field]: now },
                });

                const hoursLeft = Math.max(1, Math.round((escrow.deadline.getTime() - now.getTime()) / 3600_000));
                await this._notifyParties(updated, {
                    type: 'ESCROW_REMINDER',
                    title: `Séquestre : libération dans ${window.hours}h`,
                    message: `Le séquestre de ce contrat sera automatiquement libéré à l'échéance (dans environ ${hoursLeft}h), sauf si le créateur signale un problème avant.`,
                });
                sent++;
            }
        }

        return sent;
    }

    /**
     * Scheduler tick: DEPOSITED escrows whose deadline has arrived get released — unless
     * an open dispute or accepted hold exists on the contract, in which case auto-release
     * is skipped entirely (it will be retried on the next tick once the incident closes).
     */
    async releaseDue() {
        const now = new Date();
        const due = await prisma.contractEscrow.findMany({
            where: { status: 'DEPOSITED', deadline: { lte: now } },
        });

        let released = 0;
        for (const escrow of due) {
            if (await incidentService.hasOpenIncident(escrow.contractCacheId)) {
                logger.info(`[Escrow] Skipping auto-release for ${escrow.contractCacheId}: open incident`);
                continue;
            }
            await this._release(escrow, 'auto');
            released++;
        }

        return released;
    }

    async _release(escrow, trigger) {
        const updated = await prisma.contractEscrow.update({
            where: { id: escrow.id },
            data: { status: 'RELEASED', releasedAt: new Date() },
        });

        await this._notifyParties(updated, {
            type: 'ESCROW_RELEASED',
            title: 'Séquestre libéré',
            message: trigger === 'auto'
                ? "L'échéance est atteinte sans opposition du créateur : les fonds ont été libérés automatiquement."
                : 'Le créateur a validé et libéré les fonds du séquestre par anticipation.',
        });

        return updated;
    }

    async _getEscrow(contractCacheId) {
        const escrow = await prisma.contractEscrow.findUnique({ where: { contractCacheId } });
        if (!escrow) throw new Error("Aucun séquestre déclaré pour ce contrat.");
        return escrow;
    }

    async _getOwnedEscrow(contractCacheId, userId) {
        const contract = await prisma.contractCache.findUnique({ where: { id: contractCacheId } });
        if (!contract) throw new Error('Contrat introuvable.');
        if (contract.userId !== userId) throw new Error('Seul le créateur du contrat peut gérer son séquestre.');
        return this._getEscrow(contractCacheId);
    }

    async _notifyParties(escrow, { type, title, message }) {
        const contract = await prisma.contractCache.findUnique({
            where: { id: escrow.contractCacheId },
            include: { signatories: true, user: true },
        });
        if (!contract) return;

        const recipients = new Map(); // userId -> email, deduplicated
        if (contract.user) recipients.set(contract.userId, contract.user.email);
        for (const s of contract.signatories) {
            if (!s.isRegistered) continue;
            const user = await prisma.user.findUnique({ where: { email: s.email } });
            if (user) recipients.set(user.id, user.email);
        }

        for (const [userId, email] of recipients) {
            await notificationService.create(userId, { type, title, message, contractCacheId: escrow.contractCacheId });
            emailService.sendGenericNotification(email, title, message, escrow.contractCacheId)
                .catch((err) => logger.error('[Escrow] Failed to send notification email:', err));
        }
    }
}

module.exports = new EscrowService();
