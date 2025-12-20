const OpenAI = require('openai').default;
const logger = require('../utils/logger');
const { config } = require('../config');

class AIService {
    constructor() {
        this.openai = new OpenAI({
            apiKey: config.openaiApiKey,
        });
    }

    async generateContract(templateType, partyAData, partyBData, additionalClauses) {
        try {
            const prompt = this.buildContractPrompt(templateType, partyAData, partyBData, additionalClauses);

            const response = await this.openai.chat.completions.create({
                model: 'gpt-4',
                messages: [
                    {
                        role: 'system',
                        content: 'Tu es un assistant juridique expert en droit français. Génère des contrats professionnels, clairs et conformes à la législation française.',
                    },
                    { role: 'user', content: prompt },
                ],
                temperature: 0.3,
                max_tokens: 4000,
            });

            const content = response.choices[0].message.content || '';
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

Fournis:
1. La clause améliorée
2. Une explication des améliorations apportées
`;

            const response = await this.openai.chat.completions.create({
                model: 'gpt-4',
                messages: [
                    {
                        role: 'system',
                        content: 'Tu es un expert juridique spécialisé dans la rédaction de clauses contractuelles en français.',
                    },
                    { role: 'user', content: prompt },
                ],
                temperature: 0.3,
                max_tokens: 1000,
            });

            const result = response.choices[0].message.content || '';
            const [improved, explanation] = this.parseImprovement(result);

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

            const response = await this.openai.chat.completions.create({
                model: 'gpt-4',
                messages: [
                    {
                        role: 'system',
                        content: 'Tu es un expert juridique qui suggère des clauses contractuelles pertinentes.',
                    },
                    { role: 'user', content: prompt },
                ],
                temperature: 0.4,
                max_tokens: 800,
            });

            const content = response.choices[0].message.content || '';
            const clauses = content
                .split('\n')
                .filter((line) => line.trim().length > 0)
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
- PROBLÈMES: liste des problèmes
- SUGGESTIONS: liste des suggestions
`;

            const response = await this.openai.chat.completions.create({
                model: 'gpt-4',
                messages: [
                    {
                        role: 'system',
                        content: 'Tu es un expert juridique qui valide la conformité des contrats en droit français.',
                    },
                    { role: 'user', content: prompt },
                ],
                temperature: 0.2,
                max_tokens: 1500,
            });

            const result = response.choices[0].message.content || '';
            const { issues, suggestions } = this.parseValidation(result);

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
        const parts = result.split(/Explication|Amélioration/i);
        const improved = parts[1]?.trim() || result.substring(0, result.length / 2);
        const explanation = parts[2]?.trim() || result.substring(result.length / 2);

        return [improved, explanation];
    }

    parseValidation(result) {
        const issues = [];
        const suggestions = [];

        const problemsMatch = result.match(/PROBLÈMES:(.*?)(?:SUGGESTIONS:|$)/s);
        const suggestionsMatch = result.match(/SUGGESTIONS:(.*?)$/s);

        if (problemsMatch) {
            issues.push(
                ...problemsMatch[1]
                    .split('\n')
                    .filter((line) => line.trim().length > 0)
                    .map((line) => line.trim())
            );
        }

        if (suggestionsMatch) {
            suggestions.push(
                ...suggestionsMatch[1]
                    .split('\n')
                    .filter((line) => line.trim().length > 0)
                    .map((line) => line.trim())
            );
        }

        return { issues, suggestions };
    }
}

module.exports = new AIService();
