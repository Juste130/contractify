import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi, LoginCredentials, RegisterData } from '@/lib/api/auth';
import { usersApi, User } from '@/lib/api/users';

interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;

    // Actions
    login: (credentials: LoginCredentials) => Promise<void>;
    register: (data: RegisterData) => Promise<void>;
    logout: () => Promise<void>;
    checkAuth: () => Promise<void>;
    privyLogin: (data: { privyId?: string; email: string; walletAddress?: string; profileData?: any }, token: string) => Promise<void>;
    clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,

            login: async (credentials) => {
                set({ isLoading: true, error: null });
                try {
                    const response = await authApi.login(credentials);
                    set({
                        user: response.user as any,
                        isAuthenticated: true,
                        isLoading: false
                    });
                } catch (error: any) {
                    set({
                        error: error.message || 'Erreur lors de la connexion',
                        isLoading: false
                    });
                    throw error;
                }
            },

            register: async (data) => {
                set({ isLoading: true, error: null });
                try {
                    const response = await authApi.register(data);
                    set({
                        user: response.user as any,
                        isAuthenticated: true,
                        isLoading: false
                    });
                } catch (error: any) {
                    set({
                        error: error.message || 'Erreur lors de l\'inscription',
                        isLoading: false
                    });
                    throw error;
                }
            },

            logout: async () => {
                set({ isLoading: true });
                try {
                    await authApi.logout();
                    set({
                        user: null,
                        isAuthenticated: false,
                        isLoading: false
                    });
                    // Rediriger vers Home ou Login possible ici ou dans le composant
                } catch (error) {
                    // Même si l'API échoue, on logout localement
                    set({
                        user: null,
                        isAuthenticated: false,
                        isLoading: false
                    });
                }
            },

            checkAuth: async () => {
                set({ isLoading: true });
                try {
                    const response = await usersApi.getProfile();
                    set({
                        user: response.user as any,
                        isAuthenticated: true,
                        isLoading: false
                    });
                } catch (error) {
                    // Si la session backend expire mais Privy est toujours connecté
                    // on doit resynchroniser ou forcer une nouvelle connexion
                    console.warn('Backend authentication failed. Session may have expired.', error);
                    set({
                        user: null,
                        isAuthenticated: false,
                        isLoading: false,
                        error: 'Votre session a expiré. Veuillez vous reconnecter.'
                    });
                }
            },

            privyLogin: async (data, token) => {
                set({ isLoading: true, error: null });
                try {
                    const response = await authApi.privyAuth(data, token);
                    set({
                        user: response.user as any,
                        isAuthenticated: true,
                        isLoading: false
                    });
                } catch (error: any) {
                    set({
                        error: error.message || 'Erreur lors de la connexion avec Privy',
                        isLoading: false
                    });
                    throw error;
                }
            },

            clearError: () => set({ error: null }),
        }),
        {
            name: 'auth-storage',
            // On ne stocke que le user (sans tokens car ils sont dans les cookies httpOnly)
            partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
        }
    )
);
