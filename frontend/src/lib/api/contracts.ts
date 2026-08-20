import apiClient, { handleApiError } from './client';

export interface Contract {
    id: string;
    contractId: number;
    userId: string;
    title: string;
    ipfsHash: string;
    status:
    | 'DRAFT_WAITING_SIGNERS'
    | 'READY_TO_DEPLOY'
    | 'DRAFT'
    | 'PENDING_SIGNATURES'
    | 'ACTIVE'
    | 'COMPLETED'
    | 'CANCELLED'
    | 'DISPUTED'
    | 'TERMINATED'
    | 'RESIGNED';
    metadata: any;
    lastSync: string;
    createdAt: string;
    signatories?: ContractSignatory[];
}

export interface ContractSignatory {
    id: string;
    email: string;
    name: string | null;
    role: number;
    walletAddress: string | null;
    isRegistered: boolean;
}

export const contractsApi = {
    /**
     * Save a draft contract and wait for signers (Option 1)
     */
    async saveDraft(data: any): Promise<{ contract: Contract }> {
        try {
            const response = await apiClient.post('/api/contracts/draft', data);
            return response.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    /**
     * Get details of a draft contract
     */
    async getDraftDetails(id: string): Promise<{ contract: Contract & { signatories?: any[] } }> {
        try {
            const response = await apiClient.get(`/api/contracts/draft/${id}`);
            return response.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    /**
     * Mark draft as deployed on chain
     */
    async markDraftDeployed(id: string, data: { contractId: number; transactionHash: string }): Promise<{ contract: Contract }> {
        try {
            const response = await apiClient.post(`/api/contracts/draft/${id}/deploy`, data);
            return response.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    /**
     * Get cached contracts for current user
     */
    async getCachedContracts(params?: {
        page?: number;
        limit?: number;
        status?: string;
    }): Promise<{
        contracts: Contract[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
        };
    }> {
        try {
            const response = await apiClient.get('/api/contracts/cached', { params });
            return response.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    /**
     * Sync specific contract from blockchain
     */
    async syncContract(contractId: number): Promise<{ contract: Contract }> {
        try {
            const response = await apiClient.post(`/api/contracts/sync/${contractId}`);
            return response.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    /**
     * Sync all user contracts from blockchain
     */
    async syncAllContracts(): Promise<{ syncedCount: number }> {
        try {
            const response = await apiClient.post('/api/contracts/sync-all');
            return response.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    /**
     * Search contracts
     */
    async searchContracts(query: string): Promise<{
        contracts: Contract[];
        count: number;
    }> {
        try {
            const response = await apiClient.get('/api/contracts/search', {
                params: { query },
            });
            return response.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    /**
     * Get contract details
     */
    async getContractDetails(contractId: number): Promise<{ contract: Contract }> {
        try {
            const response = await apiClient.get(`/api/contracts/${contractId}`);
            return response.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    /**
     * Get accurate per-status contract counts for the current user (not limited to one page)
     */
    async getContractsSummary(): Promise<{
        total: number;
        byStatus: Record<string, number>;
        withIpfs: number;
    }> {
        try {
            const response = await apiClient.get('/api/contracts/summary');
            return response.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    /**
     * Resend an invitation/signature request email to a signatory who hasn't signed yet
     */
    async resendSignatureRequest(id: string, signatoryId: string): Promise<{ message: string }> {
        try {
            const response = await apiClient.post(`/api/contracts/${id}/resend-signature`, { signatoryId });
            return response.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    /**
     * Get all contracts (admin only)
     */
    async getAllContracts(params?: {
        page?: number;
        limit?: number;
        status?: string;
    }): Promise<{
        contracts: Contract[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
        };
    }> {
        try {
            const response = await apiClient.get('/api/contracts/admin/all', {
                params,
            });
            return response.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },
};
