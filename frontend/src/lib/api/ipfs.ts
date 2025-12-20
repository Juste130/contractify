import apiClient, { handleApiError } from './client';

export const ipfsApi = {
    /**
     * Upload document to IPFS
     */
    async uploadDocument(file: File): Promise<{
        cid: string;
        url: string;
    }> {
        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await apiClient.post('/api/ipfs/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            return response.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    /**
     * Upload JSON to IPFS
     */
    async uploadJSON(data: {
        data: Record<string, any>;
        name: string;
    }): Promise<{
        cid: string;
        url: string;
    }> {
        try {
            const response = await apiClient.post('/api/ipfs/upload-json', data);
            return response.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    /**
     * Get document metadata
     */
    async getDocumentMetadata(cid: string): Promise<{
        metadata: {
            cid: string;
            fileName: string;
            fileSize: number;
            mimeType?: string;
            uploadedBy?: string;
            createdAt: string;
        };
        url: string;
    }> {
        try {
            const response = await apiClient.get(`/api/ipfs/${cid}`);
            return response.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    /**
     * Unpin document from IPFS
     */
    async unpinDocument(cid: string): Promise<void> {
        try {
            await apiClient.delete(`/api/ipfs/${cid}`);
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    /**
     * Get public IPFS URL
     */
    getPublicUrl(cid: string): string {
        const gateway =
            process.env.NEXT_PUBLIC_IPFS_GATEWAY || 'https://gateway.pinata.cloud';
        return `${gateway}/ipfs/${cid}`;
    },
};
