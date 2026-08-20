const Groq = require('groq-sdk');
const logger = require('../utils/logger');
const { config } = require('../config');

class AIService {
    constructor() {
        this.client = new Groq({ apiKey: config.groqApiKey });
        // llama-3.3-70b-versatile: rapide, très bon en raisonnement juridique
        this.model = 'llama-3.3-70b-versatile';
    }

    // ─── Méthode interne centrale ────────────────────────────────────────────────
    async _chat(messages, options = {}) {
        const completion = await this.client.chat.completions.create({
            model: this.model,
            messages,
            temperature: options.temperature ?? 0.3,
            max_tokens: options.max_tokens ?? 4096,
        });
        return completion.choices[0]?.message?.content?.trim() || '';
    }

    // ─── Correction d'un input utilisateur ──────────────────────────────────────
    async correctInput(text, context) {
        try {
            const content = await this._chat([
                {
                    role: 'system',
                    content: 'Tu es un expert juridique. Tu retournes UNIQUEMENT le texte reformulé, sans guillemets, sans explications et sans markdown.',
                },
                {
                    role: 'user',
                    content: `Corrige et reformule ce texte pour qu'il soit professionnel et adapté à un contrat juridique.\nChamp concerné : ${context}\nTexte à corriger : "${text}"`,
                },
            ], { max_tokens: 512 });

            logger.info('Input corrected successfully');
            return content;
        } catch (error) {
            logger.error('Error correcting input:', error);
            throw new Error('Failed to correct input');
        }
    }

    // ─── Génération d'un contrat complet ────────────────────────────────────────
    async generateContract(templateType, partyAData, partyBData, additionalClauses, context) {
        try {
            const prompt = this.buildContractPrompt(templateType, partyAData, partyBData, additionalClauses, context);

            const content = await this._chat([
                {
                    role: 'system',
                    content: 'Tu es un avocat d\'affaires expert. Tu rédiges des contrats juridiques professionnels, structurés, complets et parfaitement formatés en Markdown. Tu n\'ajoutes aucun commentaire en dehors du contrat lui-même.',
                },
                { role: 'user', content: prompt },
            ], { temperature: 0.2, max_tokens: 8192 });

            const suggestions = this.extractClauseSuggestions(content);

            logger.info(`Contract generated for template: ${templateType}`);
            return { content, suggestions };
        } catch (error) {
            logger.error('Error generating contract:', error);
            throw new Error('Failed to generate contract');
        }
    }

    // ─── Amélioration d'une clause ───────────────────────────────────────────────
    async improveClause(clause, context) {
        try {
            const text = await this._chat([
                {
                    role: 'system',
                    content: 'Tu es un expert juridique. Tu améliores des clauses contractuelles. Tu réponds toujours avec le format :\nAMÉLIORATION: [la clause améliorée]\nEXPLICATION: [explication courte]',
                },
                {
                    role: 'user',
                    content: `Améliore cette clause juridique pour la rendre plus claire et précise.\n${context ? `Contexte: ${context}\n` : ''}Clause originale:\n${clause}`,
                },
            ], { max_tokens: 2048 });

            const [improved, explanation] = this.parseImprovement(text);
            logger.info('Clause improved successfully');
            return { improved, explanation };
        } catch (error) {
            logger.error('Error improving clause:', error);
            throw new Error('Failed to improve clause');
        }
    }

    // ─── Suggestion de clauses ───────────────────────────────────────────────────
    async suggestClauses(contractType, specificNeeds) {
        try {
            const content = await this._chat([
                {
                    role: 'system',
                    content: 'Tu es un expert juridique. Tu fournis uniquement une liste de clauses, une par ligne, sans numérotation ni explication.',
                },
                {
                    role: 'user',
                    content: `Suggère 5 clauses juridiques importantes pour un contrat de type "${contractType}".\n${specificNeeds ? `Besoins spécifiques: ${specificNeeds.join(', ')}` : ''}`,
                },
            ], { max_tokens: 1024 });

            const clauses = content
                .split('\n')
                .filter((line) => line.trim().length > 0)
                .map(line => line.replace(/^[-*•\d\.]+\s*/, '').trim())
                .slice(0, 5);

            logger.info(`Suggested ${clauses.length} clauses for ${contractType}`);
            return clauses;
        } catch (error) {
            logger.error('Error suggesting clauses:', error);
            throw new Error('Failed to suggest clauses');
        }
    }

    // ─── Validation d'un contrat ─────────────────────────────────────────────────
    async validateContract(contractText) {
        try {
            const text = await this._chat([
                {
                    role: 'system',
                    content: 'Tu es un expert juridique. Tu analyses des contrats et réponds toujours avec le format exact :\nPROBLÈMES:\n- [liste]\nSUGGESTIONS:\n- [liste]',
                },
                {
                    role: 'user',
                    content: `Analyse ce contrat et identifie les problèmes de conformité et les suggestions d'amélioration :\n\n${contractText.substring(0, 3000)}`,
                },
            ], { max_tokens: 2048 });

            const { issues, suggestions } = this.parseValidation(text);
            logger.info('Contract validation completed');

            return {
                isValid: issues.length === 0,
                issues,
                suggestions,
            };
        } catch (error) {
            logger.error('Error validating contract:', error);
            throw new Error('Failed to validate contract');
        }
    }

    // ─── Extraction des paramètres pour le smart contract ────────────────────────
    async extractContractParameters(contractText) {
        try {
            const text = await this._chat([
                {
                    role: 'system',
                    content: 'Tu es un expert en analyse juridique et blockchain. Tu retournes UNIQUEMENT un objet JSON valide, sans balises markdown ni texte supplémentaire.',
                },
                {
                    role: 'user',
                    content: `Extrais les informations suivantes du contrat pour alimenter un smart contract. Structure JSON attendue :\n{\n  "contractType": "type du contrat",\n  "escrowAmountWei": "montant en WEI (string), '0' si non trouvé",\n  "deadlineTimestamp": "timestamp UNIX (number), 0 si non trouvé",\n  "penaltyPercent": "pourcentage de pénalité (number), 0 si non trouvé"\n}\n\nContrat :\n${contractText.substring(0, 10000)}`,
                },
            ], { temperature: 0.1, max_tokens: 512 });

            let cleaned = text;
            if (cleaned.startsWith('```json')) cleaned = cleaned.substring(7);
            else if (cleaned.startsWith('```')) cleaned = cleaned.substring(3);
            if (cleaned.endsWith('```')) cleaned = cleaned.substring(0, cleaned.length - 3);

            const jsonParams = JSON.parse(cleaned.trim());
            logger.info('Contract parameters extracted successfully via Groq');

            return {
                contractType: jsonParams.contractType || 'prestation_services',
                escrowAmountWei: String(jsonParams.escrowAmountWei || '0'),
                deadlineTimestamp: Number(jsonParams.deadlineTimestamp || 0),
                penaltyPercent: Number(jsonParams.penaltyPercent || 0),
            };
        } catch (error) {
            logger.error('Error extracting contract parameters:', error);
            throw new Error('Failed to extract JSON parameters');
        }
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────────

    buildContractPrompt(templateType, partyAData, partyBData, additionalClauses, context) {
        return `${context || `Génère un contrat de type "${templateType}" professionnel et complet.`}

PARTIE A (${partyAData.type || 'Partie A'}) :
${JSON.stringify(partyAData, null, 2)}

PARTIE B (${partyBData.type || 'Partie B'}) :
${JSON.stringify(partyBData, null, 2)}

${additionalClauses && additionalClauses.length > 0 ? `CLAUSES ADDITIONNELLES REQUISES :\n${additionalClauses.join('\n')}` : ''}

Le contrat doit obligatoirement inclure les sections suivantes, bien séparées et titrées :
1. Préambule & identification des parties
2. Objet du contrat
3. Durée et date d'entrée en vigueur
4. Obligations de chaque partie
5. Conditions financières et modalités de paiement
6. Confidentialité
7. Résiliation
8. Droit applicable et juridiction compétente
9. Signatures et date

Rédige un contrat complet, structuré en Markdown (# pour les titres, ## pour les articles). Utilise un langage juridique précis et professionnel.`;
    }

    extractClauseSuggestions(content) {
        return content
            .split('\n')
            .filter(line => line.includes('Article') || line.match(/^#{1,2}\s/))
            .map(line => line.replace(/^[#\s]+/, '').trim())
            .filter(Boolean)
            .slice(0, 5);
    }

    parseImprovement(result) {
        const improvedMatch = result.match(/AMÉLIORATION:([\s\S]*?)(?=EXPLICATION:|$)/i);
        const explanationMatch = result.match(/EXPLICATION:([\s\S]*?)$/i);
        const improved = improvedMatch ? improvedMatch[1].trim() : result;
        const explanation = explanationMatch ? explanationMatch[1].trim() : '';
        return [improved, explanation];
    }

    parseValidation(result) {
        const issues = [];
        const suggestions = [];
        const problemsSection = result.match(/PROBLÈMES:([\s\S]*?)(?=SUGGESTIONS:|$)/i);
        const suggestionsSection = result.match(/SUGGESTIONS:([\s\S]*?)$/i);

        if (problemsSection) {
            issues.push(
                ...problemsSection[1]
                    .split('\n')
                    .map(line => line.replace(/^[-*•\d\.]+\s*/, '').trim())
                    .filter(line => line.length > 0)
            );
        }
        if (suggestionsSection) {
            suggestions.push(
                ...suggestionsSection[1]
                    .split('\n')
                    .map(line => line.replace(/^[-*•\d\.]+\s*/, '').trim())
                    .filter(line => line.length > 0)
            );
        }
        return { issues, suggestions };
    }
}

module.exports = new AIService();
