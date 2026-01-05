const { GoogleGenerativeAI } = require('@google/generative-ai');
const logger = require('../utils/logger');
const { config } = require('../config');

class AIService {
    constructor() {
        this.genAI = new GoogleGenerativeAI(config.geminiApiKey);
        this.model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
    }

    async correctInput(text, context) {
        try {
            const prompt = `
            Agis comme un expert juridique. Corrige et reformule le texte suivant pour qu'il soit professionnel et adapté à un contrat juridique français.
            Champ concerné : ${context}
            Texte à corriger : "${text}"
            
            Retourne UNIQUEMENT le texte reformulé, sans guillemets, sans explications et sans markdown.
            `;

            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const correctedText = response.text().trim();

            logger.info('Input corrected successfully');
            return correctedText;
        } catch (error) {
            logger.error('Error correcting input:', error);
            throw new Error('Failed to correct input');
        }
    }

    async generateContract(templateType, partyAData, partyBData, additionalClauses) {
        // Keeping this for compatibility, but moving towards template filling
        try {
            const prompt = this.buildContractPrompt(templateType, partyAData, partyBData, additionalClauses);

            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const content = response.text();

            const suggestions = this.extractClauseSuggestions(content);

            logger.info(`Contract generated for template: ${templateType}`);

            return { content, suggestions };
        } catch (error) {
            logger.error('Error generating contract:', error);
            throw new Error('Failed to generate contract');
        }
    }

    async improveClause(clause, context) {
        try {
            const prompt = `
Améliore la clause juridique suivante pour la rendre plus claire, précise et conforme au droit français.
${context ? `Contexte: ${context}` : ''}

Clause originale:
${clause}

Format de réponse attendu:
AMÉLIORATION: [La clause améliorée]
EXPLICATION: [Explication des améliorations]
`;

            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            const [improved, explanation] = this.parseImprovement(text);

            logger.info('Clause improved successfully');

            return { improved, explanation };
        } catch (error) {
            logger.error('Error improving clause:', error);
            throw new Error('Failed to improve clause');
        }
    }

    async suggestClauses(contractType, specificNeeds) {
        try {
            const prompt = `
Suggère 5 clauses juridiques importantes pour un contrat de type "${contractType}" en droit français.
${specificNeeds ? `Besoins spécifiques: ${specificNeeds.join(', ')}` : ''}

Fournis uniquement la liste des clauses, une par ligne.
`;

            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const content = response.text();

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

    async validateContract(contractText) {
        try {
            const prompt = `
Analyse le contrat suivant et identifie:
1. Les problèmes de conformité juridique
2. Les clauses manquantes importantes
3. Les suggestions d'amélioration

Contrat:
${contractText.substring(0, 3000)}

Fournis une réponse structurée avec:
PROBLÈMES:
- [Liste des problèmes]
SUGGESTIONS:
- [Liste des suggestions]
`;

            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

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

    buildContractPrompt(templateType, partyAData, partyBData, additionalClauses) {
        return `
Génère un contrat de ${templateType} en français, professionnel et conforme au droit français.

PARTIE A (${partyAData.type || 'Partie A'}):
${JSON.stringify(partyAData, null, 2)}

PARTIE B (${partyBData.type || 'Partie B'}):
${JSON.stringify(partyBData, null, 2)}

${additionalClauses ? `CLAUSES ADDITIONNELLES:\n${additionalClauses.join('\n')}` : ''}

Le contrat doit inclure:
1. Préambule
2. Objet du contrat
3. Durée et date d'effet
4. Obligations des parties
5. Conditions de paiement (si applicable)
6. Clause de confidentialité
7. Clause de résiliation
8. Clause de litige et juridiction compétente
9. Signatures

Utilise un langage juridique précis et professionnel.
`;
    }

    extractClauseSuggestions(content) {
        const suggestions = [];
        const lines = content.split('\n');

        for (const line of lines) {
            if (line.includes('Clause') || line.includes('Article') || line.match(/^\d+\./)) {
                suggestions.push(line.trim());
            }
        }

        return suggestions.slice(0, 5);
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
