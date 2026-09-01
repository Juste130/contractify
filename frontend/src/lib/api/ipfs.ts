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
     * Get public IPFS URL — points directly at the (possibly third-party) gateway. Kept for
     * the QR code / certificate / "open on IPFS" links, where an external destination is the
     * whole point. NOT what previews in this app should fetch from — see getProxyUrl.
     */
    getPublicUrl(cid: string): string {
        const gateway =
            process.env.NEXT_PUBLIC_IPFS_GATEWAY || 'https://gateway.pinata.cloud';
        return `${gateway}/ipfs/${cid}`;
    },

    /**
     * Same-origin URL that streams a pinned document back through THIS app's own backend,
     * instead of the browser fetching straight from a third-party IPFS gateway. Directly
     * fetching/framing a gateway URL puts the browser at the mercy of headers we don't
     * control (CORS, X-Frame-Options/CSP framing, Content-Disposition) — this endpoint gives
     * an imported PDF the same trust model an AI-generated contract already has by being
     * served from our own database: the browser only ever talks to our own API. Requires
     * `credentials: 'include'` on the fetch (see PdfPreviewFrame) — the endpoint is
     * authenticated.
     */
    getProxyUrl(cid: string): string {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        return `${apiUrl}/api/ipfs/proxy/${cid}`;
    },
};
