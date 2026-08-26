const prisma = require('../models/prisma');
const logger = require('../utils/logger');
const notificationService = require('./notification');
const emailService = require('./email');

/**
 * Litiges et pauses hors-chaîne. openDispute()/Disputed on-chain n'a aucune sortie tant
 * que l'escrow crypto n'est pas déposé (voir applyPenalty dans ContractManager.sol) — or
 * il ne l'est plus jamais depuis le passage à l'escrow fiat. Ce service remplace donc
 * entièrement le flux on-chain de litige pour l'usage réel de la plateforme ; l'ancrage
 * on-chain (preuve d'horodatage infalsifiable) se fait via addJustification, appelée
 * directement par le wallet du déclarant côté frontend — ce service n'a pas besoin de
 * connaître ce détail, il reçoit juste onchainTxHash en option pour le journaliser.
 */
class IncidentService {
    /** DISPUTE : prend effet immédiatement, pas besoin de l'accord de l'autre partie. */
    async raiseDispute(contractCacheId, userId, { reason, customReason, description, proofIpfsHash, onchainTxHash }) {
        if (!description || !description.trim()) {
            throw new Error('Une description du litige est requise.');
        }
        const incident = await prisma.contractIncident.create({
            data: {
                contractCacheId,
                type: 'DISPUTE',
                reason,
                customReason: customReason || null,
                description,
                proofIpfsHash: proofIpfsHash || null,
                requiresConsent: false,
                status: 'OPEN',
                raisedByUserId: userId,
                onchainTxHash: onchainTxHash || null,
            },
        });

        await this._notifyParticipants(contractCacheId, userId, {
            type: 'CONTRACT_DISPUTE_OPENED',
            title: 'Litige ouvert',
            message: 'Un litige a été signalé sur ce contrat. La libération du séquestre (le cas échéant) est suspendue en attente de résolution.',
        });

        return incident;
    }

    /** HOLD : ne gèle rien tant que l'autre partie ne l'a pas explicitement acceptée. */
    async proposeHold(contractCacheId, userId, { reason, customReason, description, proofIpfsHash, onchainTxHash }) {
        if (!description || !description.trim()) {
            throw new Error('Une description de la pause proposée est requise.');
        }
        const incident = await prisma.contractIncident.create({
            data: {
                contractCacheId,
                type: 'HOLD',
                reason: reason || 'MUTUAL_TIMEOUT',
                customReason: customReason || null,
                description,
                proofIpfsHash: proofIpfsHash || null,
                requiresConsent: true,
                status: 'OPEN',
                raisedByUserId: userId,
                onchainTxHash: onchainTxHash || null,
            },
        });

        await this._notifyParticipants(contractCacheId, userId, {
            type: 'CONTRACT_HOLD_PROPOSED',
            title: 'Pause proposée',
            message: 'Une pause a été proposée sur ce contrat. Elle ne prendra effet que si toutes les autres parties l\'acceptent.',
        });

        return incident;
    }

    /** L'autre partie (pas le déclarant) accepte ou refuse un HOLD proposé. */
    async respondToHold(incidentId, userId, accept) {
        const incident = await prisma.contractIncident.findUnique({ where: { id: incidentId } });
        if (!incident) throw new Error('Incident introuvable.');
        if (incident.type !== 'HOLD') throw new Error('Seule une pause proposée peut être acceptée ou refusée.');
        if (incident.status !== 'OPEN') throw new Error(`Cette pause n'est plus en attente de réponse (statut : ${incident.status}).`);
        if (incident.raisedByUserId === userId) throw new Error('Vous ne pouvez pas répondre à votre propre proposition.');

        const updated = await prisma.contractIncident.update({
            where: { id: incidentId },
            data: {
                status: accept ? 'ACCEPTED_ACTIVE' : 'REJECTED',
                respondedByUserId: userId,
                respondedAt: new Date(),
            },
        });

        await this._notifyParticipants(incident.contractCacheId, userId, {
            type: accept ? 'CONTRACT_HOLD_ACCEPTED' : 'CONTRACT_HOLD_REJECTED',
            title: accept ? 'Pause acceptée' : 'Pause refusée',
            message: accept
                ? 'La pause proposée a été acceptée par toutes les parties : la libération automatique du séquestre (le cas échéant) est suspendue jusqu\'à sa levée.'
                : 'La pause proposée a été refusée. Le contrat continue normalement.',
        });

        return updated;
    }

    /** Résolution — réservée à l'équipe (rôle ADMIN), au sens d'un médiateur/support désigné. */
    async resolve(incidentId, adminUserId, resolution) {
        if (!resolution || !resolution.trim()) {
            throw new Error('Une explication de la résolution est requise.');
        }
        const incident = await prisma.contractIncident.findUnique({ where: { id: incidentId } });
        if (!incident) throw new Error('Incident introuvable.');
        if (incident.status === 'RESOLVED' || incident.status === 'WITHDRAWN') {
            throw new Error(`Cet incident est déjà clos (statut : ${incident.status}).`);
        }

        const updated = await prisma.contractIncident.update({
            where: { id: incidentId },
            data: { status: 'RESOLVED', resolution, resolvedByUserId: adminUserId, resolvedAt: new Date() },
        });

        await this._notifyParticipants(incident.contractCacheId, null, {
            type: 'CONTRACT_INCIDENT_RESOLVED',
            title: incident.type === 'DISPUTE' ? 'Litige résolu' : 'Pause levée',
            message: resolution,
        });

        return updated;
    }

    /** Le déclarant peut retirer son propre incident tant qu'il n'est pas déjà résolu. */
    async withdraw(incidentId, userId) {
        const incident = await prisma.contractIncident.findUnique({ where: { id: incidentId } });
        if (!incident) throw new Error('Incident introuvable.');
        if (incident.raisedByUserId !== userId) throw new Error('Seul le déclarant peut retirer cet incident.');
        if (incident.status === 'RESOLVED' || incident.status === 'WITHDRAWN') {
            throw new Error(`Cet incident est déjà clos (statut : ${incident.status}).`);
        }
        return prisma.contractIncident.update({ where: { id: incidentId }, data: { status: 'WITHDRAWN' } });
    }

    async listForContract(contractCacheId) {
        return prisma.contractIncident.findMany({
            where: { contractCacheId },
            orderBy: { createdAt: 'desc' },
        });
    }

    /**
     * Un litige ouvert, ou une pause acceptée, doit bloquer toute libération d'escrow
     * (manuelle ou automatique) même si l'incident ne concerne pas directement le
     * paiement (ex: litige de propriété intellectuelle) — le principe est qu'aucun
     * argent ne bouge tant qu'un désaccord actif existe sur le contrat.
     */
    async hasOpenIncident(contractCacheId) {
        const count = await prisma.contractIncident.count({
            where: {
                contractCacheId,
                OR: [
                    { type: 'DISPUTE', status: 'OPEN' },
                    { type: 'HOLD', status: 'ACCEPTED_ACTIVE' },
                ],
            },
        });
        return count > 0;
    }

    async _notifyParticipants(contractCacheId, excludeUserId, { type, title, message }) {
        const contract = await prisma.contractCache.findUnique({
            where: { id: contractCacheId },
            include: { signatories: true, user: true },
        });
        if (!contract) return;

        const recipients = new Map(); // userId -> email
        if (contract.user && contract.userId !== excludeUserId) recipients.set(contract.userId, contract.user.email);
        for (const s of contract.signatories) {
            if (!s.isRegistered) continue;
            const user = await prisma.user.findUnique({ where: { email: s.email } });
            if (user && user.id !== excludeUserId) recipients.set(user.id, user.email);
        }

        for (const [userId, email] of recipients) {
            await notificationService.create(userId, { type, title, message, contractCacheId });
            emailService.sendGenericNotification(email, title, message, contractCacheId)
                .catch((err) => logger.error('[Incident] Failed to send notification email:', err));
        }
    }
}

module.exports = new IncidentService();
