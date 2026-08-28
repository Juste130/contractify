const Groq = require('groq-sdk');
const logger = require('../utils/logger');
const { config } = require('../config');
const { AppError } = require('../utils/errors');

// Structure des articles imposée au LLM, par type de contrat. Chaque type de contrat
// obéit à un régime juridique différent (droit du travail pour CDI/CDD, droit du bail
// pour une location, etc.) : un même squelette générique pour tous les types produit un
// contrat qui ne répond pas aux mentions propres à chaque régime.
const TEMPLATE_SECTIONS = {
    cdi: [
        "Préambule & identification des parties (employeur et salarié)",
        "Objet du contrat et intitulé du poste occupé",
        "Date d'entrée en fonction et période d'essai",
        "Durée du contrat (indéterminée) et lieu de travail",
        "Rémunération (salaire brut, périodicité) et affiliation à la sécurité sociale (CNSS ou régime équivalent)",
        "Durée du travail, horaires et congés",
        "Obligations de l'employeur et du salarié",
        "Confidentialité et propriété intellectuelle des travaux réalisés",
        "Clause de non-concurrence, le cas échéant",
        "Rupture du contrat (démission, licenciement, préavis, indemnités)",
        "Droit applicable et mode de résolution des litiges",
        "Signatures et date",
    ],
    cdd: [
        "Préambule & identification des parties (employeur et salarié)",
        "Objet du contrat et intitulé du poste occupé",
        "Motif légal du recours au CDD et durée déterminée (dates de début et de fin précises)",
        "Période d'essai",
        "Rémunération (salaire brut, périodicité) et affiliation à la sécurité sociale (CNSS ou régime équivalent)",
        "Obligations de l'employeur et du salarié",
        "Confidentialité",
        "Conditions de renouvellement et risque de requalification en CDI",
        "Rupture anticipée du contrat",
        "Droit applicable et mode de résolution des litiges",
        "Signatures et date",
    ],
    freelance: [
        "Préambule & identification des parties (client et prestataire indépendant)",
        "Objet de la prestation et livrables attendus",
        "Durée de la mission et calendrier d'exécution",
        "Rémunération, modalités et échéancier de paiement",
        "Statut d'indépendance du prestataire (absence de lien de subordination)",
        "Propriété intellectuelle des livrables",
        "Confidentialité",
        "Obligations et garanties du prestataire",
        "Résiliation",
        "Droit applicable et mode de résolution des litiges",
        "Signatures et date",
    ],
    location: [
        "Préambule & identification des parties (bailleur et locataire)",
        "Désignation et description du bien loué",
        "Durée du bail et date de prise d'effet",
        "Loyer, charges et modalités de paiement",
        "Dépôt de garantie",
        "État des lieux d'entrée et de sortie",
        "Obligations du bailleur et du locataire",
        "Résiliation et délai de préavis",
        "Droit applicable et juridiction compétente",
        "Signatures et date",
    ],
    nda: [
        "Préambule & identification des parties (partie divulgatrice et partie réceptrice)",
        "Objet et définition des informations confidentielles couvertes",
        "Obligations de confidentialité et de non-divulgation",
        "Exceptions à l'obligation de confidentialité",
        "Durée de l'obligation de confidentialité, y compris après la fin du contrat",
        "Restitution ou destruction des informations à l'issue du contrat",
        "Sanctions en cas de manquement",
        "Droit applicable et mode de résolution des litiges",
        "Signatures et date",
    ],
    commercial: [
        "Préambule & identification des parties",
        "Objet du contrat commercial",
        "Durée et conditions de renouvellement",
        "Obligations réciproques des parties",
        "Conditions financières et modalités de paiement",
        "Propriété intellectuelle, le cas échéant",
        "Confidentialité",
        "Résiliation",
        "Droit applicable et mode de résolution des litiges",
        "Signatures et date",
    ],
    custom: [
        "Préambule & identification des parties",
        "Objet du contrat",
        "Durée et date d'entrée en vigueur",
        "Obligations de chaque partie",
        "Conditions financières et modalités de paiement",
        "Confidentialité",
        "Résiliation",
        "Droit applicable et juridiction compétente",
        "Signatures et date",
    ],
};

// Clauses transverses attendues dans un contrat solide, quel que soit son type,
// et trop souvent oubliées d'un squelette générique.
const STANDARD_CLAUSES_REMINDER = `Sauf si le type de contrat les rend manifestement hors sujet, prévois aussi, en les intégrant dans les articles les plus pertinents plutôt qu'en vrac à la fin :
- une clause de force majeure ;
- une clause de protection des données personnelles des parties ;
- une clause de cession du contrat (le contrat est-il cessible à un tiers, sous quelles conditions) ;
- une clause de mise en demeure préalable à toute action en justice ;
- la langue faisant foi en cas de traduction ;
- dans l'article sur le droit applicable, précise si le litige doit être porté devant les juridictions compétentes ou peut faire l'objet d'une médiation/arbitrage, plutôt que de te contenter d'un renvoi vague.`;

class AIService {
    constructor() {
        this.client = new Groq({ apiKey: config.groqApiKey });
        // Modèle Groq gratuit (voir GROQ_MODEL dans .env pour le changer)
        this.model = config.groqModel;
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
            throw new AppError('Failed to correct input', 500);
        }
    }

    // ─── Génération d'un contrat complet ────────────────────────────────────────
    async generateContract(templateType, partyAData, partyBData, additionalClauses, context) {
        try {
            const prompt = this.buildContractPrompt(templateType, partyAData, partyBData, additionalClauses, context);

            const content = await this._chat([
                {
                    role: 'system',
                    // Le public cible ne connaît pas le Markdown — un contrat truffé de #, **
                    // et de tableaux en | est illisible tel quel pour lui, et le renderer
                    // maison de l'app ne sait de toute façon pas afficher un tableau Markdown
                    // (d'où le bloc signature qui s'affichait cassé). Texte brut uniquement.
                    content: 'Tu es un avocat d\'affaires expert. Tu rédiges des contrats juridiques professionnels, structurés et complets, en TEXTE BRUT et en français courant compréhensible par un non-juriste. N\'utilise JAMAIS de syntaxe Markdown ni aucun langage de balisage : pas de #, pas de **, pas de *, pas de _, pas de `, pas de tableaux avec des |. Tu n\'ajoutes aucun commentaire en dehors du contrat lui-même.',
                },
                { role: 'user', content: prompt },
            ], { temperature: 0.2, max_tokens: 6000 });
            // Groq compte le prompt + max_tokens contre la limite TPM du palier gratuit
            // (8000 tokens/minute pour ce modèle) — pas seulement ce qui est réellement
            // généré. 8192 dépassait systématiquement ce plafond dès que le prompt
            // dépassait ~0 token utile, faisant échouer TOUTE génération de contrat
            // (voir logs backend, "Request too large... Limit 8000, Requested 9040").
            // 6000 laisse ~2000 tokens de marge pour le prompt (largement suffisant : les
            // sections imposées + rappel de clauses standards font quelques centaines de
            // tokens) tout en restant assez généreux pour un contrat complet en Markdown.

            const suggestions = this.extractClauseSuggestions(content);

            logger.info(`Contract generated for template: ${templateType}`);
            return { content, suggestions };
        } catch (error) {
            logger.error('Error generating contract:', error);
            throw new AppError('Failed to generate contract', 500);
        }
    }

    // ─── Amélioration d'une clause ───────────────────────────────────────────────
    async improveClause(clause, context) {
        try {
            const text = await this._chat([
                {
                    role: 'system',
                    content: 'Tu es un expert juridique. Tu améliores des clauses contractuelles, en TEXTE BRUT (jamais de Markdown : pas de #, **, *, `, ni de tableaux avec des |). Tu réponds toujours avec le format :\nAMÉLIORATION: [la clause améliorée]\nEXPLICATION: [explication courte]',
                },
                {
                    role: 'user',
                    content: `Améliore ce texte juridique pour le rendre plus clair et précis, en conservant sa structure en articles et son format texte brut (aucun symbole Markdown).\n${context ? `Contexte: ${context}\n` : ''}Texte original:\n${clause}`,
                },
            ], { max_tokens: 2048 });

            const [improved, explanation] = this.parseImprovement(text);
            logger.info('Clause improved successfully');
            return { improved, explanation };
        } catch (error) {
            logger.error('Error improving clause:', error);
            throw new AppError('Failed to improve clause', 500);
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
            throw new AppError('Failed to suggest clauses', 500);
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
            ], { max_tokens: 2048, temperature: 0 });

            const { issues, suggestions } = this.parseValidation(text);
            logger.info('Contract validation completed');

            return {
                isValid: issues.length === 0,
                issues,
                suggestions,
            };
        } catch (error) {
            logger.error('Error validating contract:', error);
            throw new AppError('Failed to validate contract', 500);
        }
    }

    // ─── Résolution de ressort judiciaire ───────────────────────────────────────
    /**
     * Une ville saisie librement par l'utilisateur (ex: "Calavi") peut relever d'un
     * tribunal dont le siège est ailleurs (ex: Cotonou). Demande au LLM laquelle des villes
     * sièges connues couvre réellement la ville saisie. Best-effort : ne jette jamais,
     * renvoie coveringCity=null si le modèle n'est pas sûr — c'est à l'appelant de
     * présenter ça comme une suggestion, jamais comme une vérité imposée.
     */
    async resolveJurisdictionCity(cityInput, country, knownCities) {
        try {
            const text = await this._chat([
                {
                    role: 'system',
                    content: 'Tu es un expert en organisation judiciaire d\'Afrique de l\'Ouest. Réponds UNIQUEMENT avec un objet JSON strict, sans aucun texte autour, sans markdown : {"coveringCity": "<une ville EXACTEMENT recopiée depuis la liste fournie, ou null si aucune ne correspond ou si tu n\'es pas sûr>", "confidence": "high" | "medium" | "low"}',
                },
                {
                    role: 'user',
                    content: `Pays : ${country}\nVille saisie par l'utilisateur : ${cityInput}\nVilles sièges de juridiction connues dans ce pays : ${knownCities.join(', ')}\n\nQuelle ville de cette liste couvre le ressort judiciaire (tribunal de première instance ou de commerce) de la ville saisie ? Si la ville saisie est elle-même dans la liste, ou si aucune ville de la liste ne la couvre de façon fiable, réponds coveringCity: null.`,
                },
            ], { max_tokens: 128, temperature: 0 });

            const parsed = JSON.parse(text.replace(/```json|```/gi, '').trim());
            const coveringCity = knownCities.includes(parsed.coveringCity) ? parsed.coveringCity : null;
            const confidence = ['high', 'medium', 'low'].includes(parsed.confidence) ? parsed.confidence : 'low';

            return { coveringCity, confidence };
        } catch (error) {
            logger.error('Error resolving jurisdiction city:', error);
            return { coveringCity: null, confidence: 'low' };
        }
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────────

    buildContractPrompt(templateType, partyAData, partyBData, additionalClauses, context) {
        const sections = TEMPLATE_SECTIONS[templateType] || TEMPLATE_SECTIONS.custom;
        const sectionsList = sections.map((s, i) => `${i + 1}. ${s}`).join('\n');

        return `${context || `Génère un contrat de type "${templateType}" professionnel et complet.`}

PARTIE A (${partyAData.type || 'Partie A'}) :
${JSON.stringify(partyAData, null, 2)}

PARTIE B (${partyBData.type || 'Partie B'}) :
${JSON.stringify(partyBData, null, 2)}

${additionalClauses && additionalClauses.length > 0 ? `CLAUSES ADDITIONNELLES REQUISES :\n${additionalClauses.join('\n')}` : ''}

Le contrat doit obligatoirement inclure les sections suivantes, bien séparées et titrées, dans cet ordre :
${sectionsList}

${STANDARD_CLAUSES_REMINDER}

Rédige un contrat complet, en TEXTE BRUT uniquement — aucun symbole Markdown (pas de #, pas de **, pas de listes avec *, pas de tableaux avec des |, pas de guillemets inversés \` autour des montants, dates ou articles). Respecte ces règles de mise en forme :
- La toute première ligne est le titre du contrat, en MAJUSCULES, seule sur sa ligne.
- Chaque article commence sur sa propre ligne par "Article N - Titre de l'article" (numérotation continue, sans autre symbole devant).
- Les paragraphes sont séparés par une ligne vide.
- Pour l'article final ("Signatures et date"), rédige uniquement une formule de clôture en texte (lieu, date, nombre d'exemplaires, mention que chaque partie signe électroniquement via la plateforme) — NE DESSINE JAMAIS de tableau, de grille ou de lignes de signature manuscrite : la signature elle-même est gérée séparément par la plateforme, pas dans ce texte.
- Pour identifier un particulier, n'utilise QUE les informations effectivement fournies ci-dessus (nom, adresse, email...). Si aucune date de naissance n'est fournie, ne l'invente jamais et ne laisse aucun espace réservé ou mention du type "né(e) le ___" — omets simplement cette précision.

Utilise un langage juridique précis et professionnel, en français courant compréhensible par un non-juriste.`;
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
