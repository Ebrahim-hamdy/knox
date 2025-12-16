import { create } from "zustand";

export interface Vault {
	id: string;
	name: string;
	threshold: number;
	signers: Array<string>;
	address: string;
	spendConditionProtobuf: Uint8Array;
	createdAt: number;
}

interface VaultState {
	vaults: Array<Vault>;
	isLoading: boolean;
	setVaults: (vaults: Array<Vault>) => void;
	addVault: (vault: Vault) => void;
}

export const useVaultStore = create<VaultState>((set) => ({
	vaults: [],
	isLoading: false,

	setVaults: (vaults: Array<Vault>) => {
		set({ vaults, isLoading: false });
	},

	addVault: (vault: Vault) => {
		set((state) => ({ vaults: [...state.vaults, vault] }));
	},
}));
