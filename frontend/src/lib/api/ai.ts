import apiClient, { handleApiError } from './client';

export const aiApi = {
    /**
     * Correct input using AI
     */
    async correctInput(data: {
        text: string;
        context: string;
    }): Promise<{
        corrected: string;
    }> {
        try {
            const response = await apiClient.post('/api/ai/correct-input', data);
            return response.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    /**
     * Generate contract using AI
     */
    async generateContract(data: {
        templateType: string;
        partyAData: Record<string, any>;
        partyBData: Record<string, any>;
        additionalClauses?: string[];
        context?: string;
    }): Promise<{
        contract: string;
        suggestions: string[];
    }> {
        try {
            const response = await apiClient.post('/api/ai/generate-contract', data);
            return response.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    /**
     * Improve a specific clause
     */
    async improveClause(data: {
        clause: string;
        context?: string;
    }): Promise<{
        improved: string;
        explanation: string;
    }> {
        try {
            const response = await apiClient.post('/api/ai/improve-clause', data);
            return response.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    /**
     * Get clause suggestions for contract type
     */
    async suggestClauses(data: {
        contractType: string;
        specificNeeds?: string[];
    }): Promise<{
        clauses: string[];
    }> {
        try {
            const response = await apiClient.post('/api/ai/suggest-clauses', data);
            return response.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    /**
     * Validate contract compliance
     */
    async validateContract(contractText: string): Promise<{
        isValid: boolean;
        issues: string[];
        suggestions: string[];
    }> {
        try {
            const response = await apiClient.post('/api/ai/validate', {
                contractText,
            });
            return response.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    /**
     * Asks which known jurisdiction seat city actually covers a city the user typed by
     * hand (e.g. a satellite town of a bigger city's court). Best-effort suggestion only —
     * never a source of truth, the caller must let the user accept or ignore it.
     */
    async resolveJurisdictionCity(data: {
        city: string;
        country: string;
        knownCities: string[];
    }): Promise<{
        coveringCity: string | null;
        confidence: "high" | "medium" | "low";
    }> {
        try {
            const response = await apiClient.post('/api/ai/resolve-jurisdiction-city', data);
            return response.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },
};
