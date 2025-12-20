import apiClient, { handleApiError } from './client';

export interface Contract {
    id: string;
    contractId: number;
    userId: string;
    title: string;
    ipfsHash: string;
    status:
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
}

export const contractsApi = {
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
