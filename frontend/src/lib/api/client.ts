import axios, { AxiosInstance, AxiosError } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Create axios instance
const apiClient: AxiosInstance = axios.create({
    baseURL: API_URL,
    timeout: 30000,
    withCredentials: true, // Important pour les cookies httpOnly
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor - Add auth token from cookie
apiClient.interceptors.request.use(
    (config) => {
        // Le token JWT sera automatiquement envoyé via httpOnly cookie
        // Pas besoin de l'ajouter manuellement
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor - Handle errors and token refresh
apiClient.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as any;

        // Si erreur 401 et pas déjà en train de retry
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                // Tenter de refresh le token
                await axios.post(
                    `${API_URL}/api/auth/refresh`,
                    {},
                    { withCredentials: true }
                );

                // Retry la requête originale
                return apiClient(originalRequest);
            } catch (refreshError) {
                // Si refresh échoue, rediriger vers login
                if (typeof window !== 'undefined') {
                    window.location.href = '/login';
                }
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

export default apiClient;

// Helper pour gérer les erreurs API
export const handleApiError = (error: any): string => {
    if (error.response?.data?.error) {
        return error.response.data.error;
    }
    if (error.message) {
        return error.message;
    }
    return 'Une erreur est survenue';
};
