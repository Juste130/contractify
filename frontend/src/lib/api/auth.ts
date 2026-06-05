import apiClient, { handleApiError } from './client';

export interface LoginCredentials {
    email: string;
    password: string;
}

export interface RegisterData {
    email: string;
    password: string;
    isAdmin?: boolean;
    adminWalletAddress?: string;
}

export interface AuthResponse {
    user: {
        id: string;
        email: string;
        role: string;
        isActive: boolean;
        createdAt: string;
    };
    token: string;
    refreshToken: string;
}

export const authApi = {
    /**
     * Login user
     * Le backend va set le JWT dans un httpOnly cookie
     */
    async login(credentials: LoginCredentials): Promise<AuthResponse> {
        try {
            const response = await apiClient.post('/api/auth/login', credentials);
            return response.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    /**
     * Register new user
     */
    async register(data: RegisterData): Promise<AuthResponse> {
        try {
            const response = await apiClient.post('/api/auth/register', data);
            return response.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    /**
     * Logout user
     * Supprime le cookie httpOnly côté serveur
     */
    async logout(): Promise<void> {
        try {
            await apiClient.post('/api/auth/logout');
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    /**
     * Refresh access token
     * Utilise le refresh token dans le cookie httpOnly
     */
    async refreshToken(): Promise<{ token: string }> {
        try {
            const response = await apiClient.post('/api/auth/refresh');
            return response.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    /**
     * Google OAuth
     */
    async googleAuth(data: {
        googleId: string;
        email: string;
        profileData: any;
    }): Promise<AuthResponse> {
        try {
            const response = await apiClient.post('/api/auth/google', data);
            return response.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    /**
     * Privy authentication
     */
    async privyAuth(
        data: {
            privyId?: string;
            email: string;
            walletAddress?: string;
            profileData?: any;
        },
        token: string
    ): Promise<AuthResponse> {
        try {
            const response = await apiClient.post('/api/auth/privy', data, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            return response.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },
};
