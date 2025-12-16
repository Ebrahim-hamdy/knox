import { create } from "zustand";

interface AuthState {
	isAuthenticated: boolean;
	sessionKey: CryptoKey | null;
	walletAddress: string | null;

	login: (key: CryptoKey, address: string) => void;
	logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
	isAuthenticated: false,
	sessionKey: null,
	walletAddress: null,

	login: (key, address) => {
		set({
			isAuthenticated: true,
			sessionKey: key,
			walletAddress: address,
		});
	},

	logout: () => {
		set({
			isAuthenticated: false,
			sessionKey: null,
			walletAddress: null,
		});
	},
}));
