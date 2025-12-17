import { decryptData, deriveKeyFromSignature } from "@/lib/crypto";
import { loadAllDecrypted } from "@/lib/storage";
import { useAuthStore } from "@/store/auth-store";
import { useState } from "react";
import { useVaultStore, type Vault } from "@/store/vault-store";
import { useWalletStore } from "@/store/wallet-store";

export type AuthStatus =
	| "idle"
	| "connecting"
	| "signing"
	| "deriving"
	| "error";

export function useBiometricAuth() {
	const [status, setStatus] = useState<AuthStatus>("idle");
	const [authError, setAuthError] = useState<string | null>(null);

	const { login } = useAuthStore();
	const { connect, signMessage } = useWalletStore.getState();
	const { setVaults } = useVaultStore();

	const handleUnlock = async (): Promise<boolean> => {
		if (status !== "idle" && status !== "error") {
			return false;
		}

		setStatus("signing");
		setAuthError(null);

		try {
			await connect();
			const walletPkh = useWalletStore.getState().walletPkh;
			if (!walletPkh) {
				throw new Error("Could not retrieve wallet address.");
			}

			const AUTH_MESSAGE = "Unlock Knox Multisig Vault Storage";
			const signature = await signMessage(AUTH_MESSAGE);

			setStatus("deriving");
			const derivedKey = await deriveKeyFromSignature(signature);

			const decryptedVaults = await loadAllDecrypted<Vault>(
				derivedKey,
				decryptData
			);

			setVaults(decryptedVaults);

			login(derivedKey, walletPkh);

			setStatus("idle");

			return true;
		} catch (error: unknown) {
			const errorMessage =
				error instanceof Error
					? error.message
					: "An unknown error occurred during authentication.";

			setAuthError(errorMessage);
			setStatus("error");

			console.error("Knox Auth Error:", error);

			return false;
		}
	};

	return { handleUnlock, status, authError };
}
